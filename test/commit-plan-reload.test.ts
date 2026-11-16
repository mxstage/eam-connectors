// 計画の試し（attemptPlan）・1 回の反映数（batchSizeOf）・計画の失敗の文（describePlanError）と、
// 反映した親の読み直し（reloadParents）。MX Stage では src/app/commit/controller.ts と reload.ts から試していた。
import { describe, expect, it } from "vitest";
import { MaximoClient } from "../src/maximo/client.ts";
import { CommitInvariantError, DEFAULT_COMMIT_BATCH, type CommitChanges } from "../src/maximo/commit.ts";
import { loadRecords, recordsToRows } from "../src/maximo/load.ts";
import { getObjectStructureInfo } from "../src/maximo/meta.ts";
import { attemptPlan, batchSizeOf, describePlanError } from "../src/commit/plan.ts";
import { reloadParents, type ReloadableSheet } from "../src/commit/reload.ts";
import { setLocale } from "../src/i18n.ts";
import { makeParentKey, type MaximoRecord, type SheetMeta, type SheetRow } from "../src/sheet.ts";
import { createFakeMaximo, sampleSeed } from "../src/testing/index.ts";

const SELECT = ["DESCRIPTION", "STATUS", "ESTDUR", "MULTIASSETLOCCI.ASSETNUM"];

async function setup() {
  const fake = createFakeMaximo(sampleSeed());
  const client = new MaximoClient({ baseUrl: fake.baseUrl, apiKey: () => fake.apiKey, via: "direct", fetchImpl: fake.fetch, sleep: async () => {} });
  const info = await getObjectStructureInfo(client, "MXAPIWO");
  const knownAttrs = new Set(info.columns.map((c) => c.name));
  const { records } = await loadRecords(client, { os: "MXAPIWO", select: SELECT, keyColumns: info.keyColumns, childIdAttrs: info.childIdAttrs, knownAttrs });
  const names = new Set([...info.keyColumns, ...SELECT]);
  const meta: SheetMeta = {
    name: "wo",
    source: { kind: "maximo", os: "MXAPIWO", select: SELECT, where: [] },
    columns: info.columns.filter((c) => names.has(c.name)),
    keyColumns: info.keyColumns,
    childIdAttrs: info.childIdAttrs,
  };
  return { fake, client, meta, records };
}

function sheetOf(meta: SheetMeta, records: MaximoRecord[]): ReloadableSheet {
  const rows: SheetRow[] = recordsToRows(records, meta);
  return { meta, records, group: (pk) => rows.filter((r) => r.parentKey === pk).map((r) => ({ rowKey: r.rowKey, added: null })) };
}

const pk = (wonum: string) => makeParentKey(["BEDFORD", wonum]);
const none = (): CommitChanges => ({ cells: [], addedRows: [], deletedRows: [] });

describe("attemptPlan", () => {
  it("確認の要らない変更はそのまま計画にする", async () => {
    const { meta, records } = await setup();
    const a = attemptPlan(meta, records, { ...none(), cells: [{ rowKey: pk("WO1001"), col: "DESCRIPTION", value: "新しい説明" }] });
    expect(a.error).toBeNull();
    expect(a.plans).toHaveLength(1);
    expect([a.needsNullConfirm, a.needsDeleteConfirm, a.needsIrreversibleConfirm]).toEqual([false, false, false]);
  });

  it("null への変更（I10）と戻せないステータス（I11）は、確認が要ると分かった上で計画を作る", async () => {
    const { meta, records } = await setup();
    const changes: CommitChanges = {
      ...none(),
      cells: [
        { rowKey: pk("WO1001"), col: "DESCRIPTION", value: null },
        { rowKey: pk("WO1002"), col: "STATUS", value: "CAN" },
      ],
    };
    const a = attemptPlan(meta, records, changes);
    expect(a.needsNullConfirm).toBe(true);
    expect(a.needsIrreversibleConfirm).toBe(true);
    expect(a.error).toBeNull();
    expect(a.plans.length).toBeGreaterThan(0);
    const confirmed = attemptPlan(meta, records, changes, { allowNull: true, irreversibleConfirmed: true });
    expect([confirmed.needsNullConfirm, confirmed.needsIrreversibleConfirm]).toEqual([false, false]);
  });

  it("確認では済まない違反は利用者向けの文（内部コード付き）にする", async () => {
    const { meta, records } = await setup();
    const a = attemptPlan(meta, records, { ...none(), cells: [{ rowKey: pk("WO9999"), col: "DESCRIPTION", value: "x" }] });
    expect(a.plans).toEqual([]);
    expect(a.error).not.toBeNull();
  });
});

describe("describePlanError", () => {
  it("内部コードの例外は、次にできることと内部コードを入れた文にする", () => {
    const text = describePlanError(new CommitInvariantError("I8", "[I8] too many"));
    expect(text).toContain("I8");
    expect(text).toContain("too many");
    setLocale("en");
    expect(describePlanError(new Error("broken"))).toContain("broken");
  });
});

describe("batchSizeOf", () => {
  it("all は全件、数は 1 以上の整数、省くと既定", () => {
    expect(batchSizeOf("all", 900)).toBe(900);
    expect(batchSizeOf(0, 10)).toBe(1);
    expect(batchSizeOf(2.7, 10)).toBe(2);
    expect(batchSizeOf(undefined, 1000)).toBe(DEFAULT_COMMIT_BATCH);
    expect(batchSizeOf(undefined, 3)).toBe(3);
  });
});

describe("reloadParents（store の型を切り離した形）", () => {
  it("Maximo の今の値で親を読み直す。見つからない親は理由を返す", async () => {
    const { fake, client, meta, records } = await setup();
    const wo = fake.find("mxapiwo", (r) => r.attrs.wonum === "WO1002")!;
    fake.update("mxapiwo", wo.uid, (r) => {
      r.attrs.description = "読み直した説明";
    });
    const out = await reloadParents(client, sheetOf(meta, records), [pk("WO1002"), pk("WO9999")]);
    expect(out.replacements).toHaveLength(1);
    expect(out.replacements[0]?.record.attrs.DESCRIPTION).toBe("読み直した説明");
    expect(out.replacements[0]?.rows[0]?.values.DESCRIPTION).toBe("読み直した説明");
    expect(out.failures.get(pk("WO9999"))).toBeTypeOf("string");
  });
});
