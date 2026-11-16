// 中間形（資産の木・保全計画・作業の実績）と Maximo の対応（src/eam）。
import { describe, expect, it } from "vitest";
import { MaximoClient } from "../src/maximo/client.ts";
import {
  assetFromMaximo,
  buildAssetTree,
  eamId,
  locationFromMaximo,
  MAXIMO_EAM_SOURCES,
  maximoLoadOptions,
  readMaximoAssetTree,
  readMaximoPlans,
  readMaximoWorkRecords,
  type AssetNode,
} from "../src/eam/index.ts";
import type { MaximoRecord } from "../src/sheet.ts";
import { createFakeMaximo, type FakeAttrDef, type FakeSeed } from "../src/testing/index.ts";

const s = (): FakeAttrDef => ({ type: "string" });
const n = (): FakeAttrDef => ({ type: "number" });

function seed(): FakeSeed {
  return {
    objectStructures: {
      MXAPIASSET: {
        keyAttrs: ["assetnum", "siteid"],
        attrs: { assetnum: s(), siteid: s(), description: s(), status: s(), parent: s(), location: s(), assettype: s() },
        records: [
          { attrs: { assetnum: "P-100", siteid: "S1", description: "ポンプ", status: "OPERATING", location: "AREA-A", assettype: "PUMP" } },
          { attrs: { assetnum: "M-100", siteid: "S1", description: "モーター", status: "OPERATING", parent: "P-100", location: "AREA-A" } },
        ],
      },
      MXAPIOPERLOC: {
        keyAttrs: ["location", "siteid"],
        attrs: { location: s(), siteid: s(), description: s(), status: s(), type: s() },
        children: { lochierarchy: { idAttr: "systemid", attrs: { systemid: s(), parent: s() } } },
        records: [
          { attrs: { location: "PLANT", siteid: "S1", description: "工場", status: "OPERATING", type: "OPERATING" } },
          { attrs: { location: "AREA-A", siteid: "S1", description: "A 棟", status: "OPERATING", type: "OPERATING" }, children: { lochierarchy: [{ systemid: "PRIMARY", parent: "PLANT" }] } },
        ],
      },
      MXAPIPM: {
        keyAttrs: ["pmnum", "siteid"],
        attrs: { pmnum: s(), siteid: s(), description: s(), status: s(), assetnum: s(), location: s(), jpnum: s(), frequency: n(), frequnit: s(), nextdate: { type: "datetime" } },
        records: [{ attrs: { pmnum: "PM-1", siteid: "S1", description: "月次点検", status: "ACTIVE", assetnum: "P-100", jpnum: "JP-1", frequency: 1, frequnit: "MONTHS", nextdate: "2026-12-01T00:00:00+09:00" } }],
      },
      MXAPIJOBPLAN: {
        keyAttrs: ["jpnum"],
        attrs: { jpnum: s(), siteid: s(), description: s(), status: s(), pluscrevnum: n() },
        children: { jobtask: { idAttr: "jptask", attrs: { jptask: n(), description: s(), taskduration: n() } } },
        records: [
          {
            attrs: { jpnum: "JP-1", description: "ポンプの点検", status: "ACTIVE", pluscrevnum: 0 },
            children: { jobtask: [{ jptask: 20, description: "振動を測る", taskduration: 0.5 }, { jptask: 10, description: "止める", taskduration: 0.25 }] },
          },
          { attrs: { jpnum: "JP-2", description: "使わない手順", status: "ACTIVE" } },
        ],
      },
      MXAPIWODETAIL: {
        keyAttrs: ["wonum", "siteid"],
        attrs: { wonum: s(), siteid: s(), description: s(), status: s(), worktype: s(), assetnum: s(), location: s(), pmnum: s(), jpnum: s(), schedstart: { type: "datetime" }, actstart: { type: "datetime" }, actfinish: { type: "datetime" }, actlabhrs: n() },
        records: [{ attrs: { wonum: "WO-1", siteid: "S1", description: "月次点検", status: "COMP", worktype: "PM", assetnum: "P-100", location: "AREA-A", pmnum: "PM-1", jpnum: "JP-1", actlabhrs: 1.5, actfinish: "2026-11-01T10:00:00+09:00" } }],
      },
    },
  };
}

function client() {
  const fake = createFakeMaximo(seed());
  return { fake, client: new MaximoClient({ baseUrl: fake.baseUrl, apiKey: () => fake.apiKey, via: "direct", fetchImpl: fake.fetch, sleep: async () => {} }) };
}

const rec = (attrs: MaximoRecord["attrs"], children: MaximoRecord["children"] = {}): MaximoRecord => ({ href: "https://m/x", rowstamp: null, attrs, children });

describe("対応の土台", () => {
  it("どの構造から何を読むか（資産の木 ⇄ MXAPIASSET・MXAPIOPERLOC、計画 ⇄ MXAPIPM・MXAPIJOBPLAN、実績 ⇄ MXAPIWODETAIL）", () => {
    expect(Object.values(MAXIMO_EAM_SOURCES).map((x) => x.os)).toEqual(["MXAPIASSET", "MXAPIOPERLOC", "MXAPIPM", "MXAPIJOBPLAN", "MXAPIWODETAIL"]);
    const opts = maximoLoadOptions("location", { maxRows: 10 });
    expect(opts).toMatchObject({ os: "MXAPIOPERLOC", keyColumns: ["LOCATION", "SITEID"], childIdAttrs: { LOCHIERARCHY: "SYSTEMID" }, maxRows: 10 });
    expect(opts.knownAttrs.has("LOCHIERARCHY.PARENT")).toBe(true);
  });

  it("資産の親は PARENT、無ければ設置場所。番号の無いレコードは受けない", () => {
    expect(assetFromMaximo(rec({ ASSETNUM: "M", SITEID: "S1", PARENT: "P" })).parentId).toBe("asset:S1/P");
    const a = assetFromMaximo(rec({ ASSETNUM: "P", SITEID: "S1", LOCATION: "L", ASSETTYPE: "PUMP" }));
    expect(a).toMatchObject({ id: "asset:S1/P", parentId: "location:S1/L", locationId: "location:S1/L", extra: { ASSETTYPE: "PUMP" } });
    expect(() => assetFromMaximo(rec({ SITEID: "S1" }))).toThrow(/ASSETNUM/);
    const loc = rec({ LOCATION: "L", SITEID: "S1" }, { LOCHIERARCHY: [{ idAttr: "SYSTEMID", id: "A", rowstamp: null, attrs: { SYSTEMID: "A", PARENT: "X" } }, { idAttr: "SYSTEMID", id: "B", rowstamp: null, attrs: { SYSTEMID: "B", PARENT: "Y" } }] });
    expect(locationFromMaximo(loc).parentId).toBe("location:S1/X");
    expect(locationFromMaximo(loc, "B").parentId).toBe("location:S1/Y");
  });

  it("木: 親が木に無い節と、輪になった節は根にする", () => {
    const node = (id: string, parentId: string | null): AssetNode => ({ id, kind: "asset", code: id, siteId: null, description: null, status: null, parentId, extra: {}, source: { system: "maximo", object: "MXAPIASSET", href: "" } });
    const tree = buildAssetTree([node("a", null), node("b", "a"), node("c", "missing"), node("x", "y"), node("y", "x")]);
    expect(tree.roots).toEqual(["a", "c", "x", "y"]);
    expect(tree.children.get("a")).toEqual(["b"]);
    expect(eamId("wo", null, "1")).toBe("wo:1");
  });
});

describe("Maximo から読む", () => {
  it("資産と場所を 1 つの木にする", async () => {
    const { client: c } = client();
    const { tree, truncated } = await readMaximoAssetTree(c);
    expect(truncated).toBe(false);
    expect(tree.roots).toEqual(["location:S1/PLANT"]);
    expect(tree.children.get("location:S1/PLANT")).toEqual(["location:S1/AREA-A"]);
    expect(tree.children.get("location:S1/AREA-A")).toEqual(["asset:S1/P-100"]);
    expect(tree.children.get("asset:S1/P-100")).toEqual(["asset:S1/M-100"]);
    expect(tree.nodes.get("asset:S1/P-100")?.source.object).toBe("MXAPIASSET");
  });

  it("保全計画と、使う作業の手順だけを読む（手順は番号の順）", async () => {
    const { client: c } = client();
    const { plans, jobPlans } = await readMaximoPlans(c);
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ id: "pm:S1/PM-1", targetId: "asset:S1/P-100", jobPlanId: "jobplan:JP-1", frequency: { value: 1, unit: "months" }, nextDue: "2026-12-01T00:00:00+09:00" });
    expect(jobPlans.map((j) => j.code)).toEqual(["JP-1"]);
    expect(jobPlans[0]?.tasks.map((t) => t.step)).toEqual([10, 20]);
    expect(jobPlans[0]?.tasks[0]).toMatchObject({ description: "止める", durationHours: 0.25 });
  });

  it("作業の実績を読み、資産・場所・計画の id でつなぐ", async () => {
    const { client: c } = client();
    const { records } = await readMaximoWorkRecords(c);
    expect(records[0]).toMatchObject({ id: "wo:S1/WO-1", status: "COMP", workType: "PM", assetId: "asset:S1/P-100", locationId: "location:S1/AREA-A", planId: "pm:S1/PM-1", jobPlanId: "jobplan:JP-1", actualLaborHours: 1.5 });
  });
});
