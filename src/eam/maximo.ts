// Maximo ⇄ EAM intermediate forms (read side).
//   asset tree  ⇄ MXAPIASSET (assets) + MXAPIOPERLOC (operating locations, LOCHIERARCHY child for the parent)
//   plans       ⇄ MXAPIPM (preventive maintenance) + MXAPIJOBPLAN (job plans, JOBTASK child)
//   work record ⇄ MXAPIWODETAIL (work orders)
// Each source lists the attributes it reads; maximoLoadOptions() turns it into options for loadRecords().
//
// Maximo のオブジェクト構造と中間形の対応（読む側）。

import type { CellValue, TypedFilter } from "../model.ts";
import type { MaximoRecord } from "../sheet.ts";
import type { MaximoClient } from "../maximo/client.ts";
import { loadRecords, type LoadRecordsOptions } from "../maximo/load.ts";
import { MAX_IN_VALUES } from "../maximo/query.ts";
import { eamId, type AssetNode, type AssetTree, type EamValue, type FrequencyUnit, type JobPlan, type JobTask, type MaintenancePlan, type WorkRecord } from "./types.ts";

/** 1 つのオブジェクト構造から何を読むか */
export interface MaximoEamSource {
  os: string;
  /** 親の属性と子の属性（CHILD.ATTR） */
  select: readonly string[];
  keyColumns: readonly string[];
  childIdAttrs: Readonly<Record<string, string | null>>;
}

export const MAXIMO_EAM_SOURCES = {
  asset: {
    os: "MXAPIASSET",
    select: ["ASSETNUM", "SITEID", "DESCRIPTION", "STATUS", "PARENT", "LOCATION", "ASSETTYPE"],
    keyColumns: ["ASSETNUM", "SITEID"],
    childIdAttrs: {},
  },
  location: {
    os: "MXAPIOPERLOC",
    select: ["LOCATION", "SITEID", "DESCRIPTION", "STATUS", "TYPE", "LOCHIERARCHY.PARENT", "LOCHIERARCHY.SYSTEMID"],
    keyColumns: ["LOCATION", "SITEID"],
    childIdAttrs: { LOCHIERARCHY: "SYSTEMID" },
  },
  pm: {
    os: "MXAPIPM",
    select: ["PMNUM", "SITEID", "DESCRIPTION", "STATUS", "ASSETNUM", "LOCATION", "JPNUM", "FREQUENCY", "FREQUNIT", "NEXTDATE"],
    keyColumns: ["PMNUM", "SITEID"],
    childIdAttrs: {},
  },
  jobPlan: {
    os: "MXAPIJOBPLAN",
    select: ["JPNUM", "SITEID", "DESCRIPTION", "STATUS", "PLUSCREVNUM", "JOBTASK.JPTASK", "JOBTASK.DESCRIPTION", "JOBTASK.TASKDURATION"],
    keyColumns: ["JPNUM"],
    childIdAttrs: { JOBTASK: "JPTASK" },
  },
  work: {
    os: "MXAPIWODETAIL",
    select: ["WONUM", "SITEID", "DESCRIPTION", "STATUS", "WORKTYPE", "ASSETNUM", "LOCATION", "PMNUM", "JPNUM", "SCHEDSTART", "ACTSTART", "ACTFINISH", "ACTLABHRS"],
    keyColumns: ["WONUM", "SITEID"],
    childIdAttrs: {},
  },
} as const satisfies Record<string, MaximoEamSource>;

export type MaximoEamKind = keyof typeof MAXIMO_EAM_SOURCES;

/** loadRecords に渡す形にする（where・orderBy・件数は呼ぶ側が決める） */
export function maximoLoadOptions(
  kind: MaximoEamKind,
  opts: { where?: TypedFilter[]; orderBy?: string[]; maxRows?: number; signal?: AbortSignal } = {},
): LoadRecordsOptions {
  const src: MaximoEamSource = MAXIMO_EAM_SOURCES[kind];
  const out: LoadRecordsOptions = {
    os: src.os,
    select: [...src.select],
    childIdAttrs: { ...src.childIdAttrs },
    knownAttrs: new Set(src.select),
    keyColumns: [...src.keyColumns],
  };
  if (opts.where) out.where = opts.where;
  if (opts.orderBy) out.orderBy = opts.orderBy;
  if (opts.maxRows !== undefined) out.maxRows = opts.maxRows;
  if (opts.signal) out.signal = opts.signal;
  return out;
}

// ---------------------------------------------------------------------------
// レコード → 中間形
// ---------------------------------------------------------------------------

function str(v: CellValue | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v);
  return s === "" ? null : s;
}

function num(v: CellValue | undefined): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function required(rec: MaximoRecord, attr: string, os: string): string {
  const v = str(rec.attrs[attr]);
  if (v === null) throw new Error(`${os} record has no ${attr}`);
  return v;
}

function extraOf(attrs: Record<string, CellValue>, used: readonly string[]): Record<string, EamValue> {
  const skip = new Set(used);
  return Object.fromEntries(Object.entries(attrs).filter(([k]) => !skip.has(k)));
}

/** 中間形の名前のある欄に入れる属性（これ以外に読んだ属性は extra に残す） */
const MAPPED: Readonly<Record<MaximoEamKind, readonly string[]>> = {
  asset: ["ASSETNUM", "SITEID", "DESCRIPTION", "STATUS", "PARENT", "LOCATION"],
  location: ["LOCATION", "SITEID", "DESCRIPTION", "STATUS", "TYPE"],
  pm: ["PMNUM", "SITEID", "DESCRIPTION", "STATUS", "ASSETNUM", "LOCATION", "JPNUM", "FREQUENCY", "FREQUNIT", "NEXTDATE"],
  jobPlan: ["JPNUM", "SITEID", "DESCRIPTION", "STATUS", "PLUSCREVNUM"],
  work: ["WONUM", "SITEID", "DESCRIPTION", "STATUS", "WORKTYPE", "ASSETNUM", "LOCATION", "PMNUM", "JPNUM", "SCHEDSTART", "ACTSTART", "ACTFINISH", "ACTLABHRS"],
};
const parentAttrs = (kind: MaximoEamKind): readonly string[] => MAPPED[kind];

function sourceRef(kind: MaximoEamKind, rec: MaximoRecord) {
  return { system: "maximo" as const, object: MAXIMO_EAM_SOURCES[kind].os, href: rec.href };
}

/** MXAPIASSET の 1 件 → 資産の節（親は PARENT の資産、無ければ設置場所） */
export function assetFromMaximo(rec: MaximoRecord): AssetNode {
  const code = required(rec, "ASSETNUM", "MXAPIASSET");
  const siteId = str(rec.attrs.SITEID);
  const parent = str(rec.attrs.PARENT);
  const location = str(rec.attrs.LOCATION);
  const locationId = location === null ? null : eamId("location", siteId, location);
  return {
    id: eamId("asset", siteId, code),
    kind: "asset",
    code,
    siteId,
    description: str(rec.attrs.DESCRIPTION),
    status: str(rec.attrs.STATUS),
    parentId: parent !== null ? eamId("asset", siteId, parent) : locationId,
    locationId,
    extra: extraOf(rec.attrs, parentAttrs("asset")),
    source: sourceRef("asset", rec),
  };
}

/** MXAPIOPERLOC の 1 件 → 場所の節。親は LOCHIERARCHY の PARENT（systemId を渡せばその階層、省けば最初の階層） */
export function locationFromMaximo(rec: MaximoRecord, systemId?: string): AssetNode {
  const code = required(rec, "LOCATION", "MXAPIOPERLOC");
  const siteId = str(rec.attrs.SITEID);
  const hierarchy = rec.children.LOCHIERARCHY ?? [];
  const entry = systemId === undefined ? hierarchy[0] : hierarchy.find((h) => str(h.attrs.SYSTEMID) === systemId);
  const parent = entry ? str(entry.attrs.PARENT) : null;
  return {
    id: eamId("location", siteId, code),
    kind: "location",
    code,
    siteId,
    description: str(rec.attrs.DESCRIPTION),
    status: str(rec.attrs.STATUS),
    parentId: parent === null ? null : eamId("location", siteId, parent),
    locationType: str(rec.attrs.TYPE),
    extra: extraOf(rec.attrs, parentAttrs("location")),
    source: sourceRef("location", rec),
  };
}

/** 節を木にする。親が木に無い節は根にする。親をたどって輪になる節も根にする */
export function buildAssetTree(nodes: Iterable<AssetNode>): AssetTree {
  const byId = new Map<string, AssetNode>();
  for (const n of nodes) if (!byId.has(n.id)) byId.set(n.id, n);
  const parentOf = (n: AssetNode): string | null => (n.parentId !== null && n.parentId !== n.id && byId.has(n.parentId) ? n.parentId : null);
  const inCycle = (start: AssetNode): boolean => {
    const seen = new Set<string>([start.id]);
    let p = parentOf(start);
    while (p !== null) {
      if (seen.has(p)) return true;
      seen.add(p);
      p = parentOf(byId.get(p)!);
    }
    return false;
  };
  const children = new Map<string, string[]>();
  const roots: string[] = [];
  for (const n of byId.values()) {
    const p = parentOf(n);
    if (p === null || inCycle(n)) {
      roots.push(n.id);
      continue;
    }
    const list = children.get(p);
    if (list) list.push(n.id);
    else children.set(p, [n.id]);
  }
  return { nodes: byId, children, roots };
}

const FREQ_UNITS: Readonly<Record<string, FrequencyUnit>> = { DAYS: "days", WEEKS: "weeks", MONTHS: "months", YEARS: "years" };

/** MXAPIPM の 1 件 → 保全計画（対象は資産、無ければ場所） */
export function planFromMaximo(rec: MaximoRecord): MaintenancePlan {
  const code = required(rec, "PMNUM", "MXAPIPM");
  const siteId = str(rec.attrs.SITEID);
  const asset = str(rec.attrs.ASSETNUM);
  const location = str(rec.attrs.LOCATION);
  const jp = str(rec.attrs.JPNUM);
  const value = num(rec.attrs.FREQUENCY);
  const unit = FREQ_UNITS[(str(rec.attrs.FREQUNIT) ?? "").toUpperCase()];
  return {
    id: eamId("pm", siteId, code),
    code,
    siteId,
    description: str(rec.attrs.DESCRIPTION),
    status: str(rec.attrs.STATUS),
    targetId: asset !== null ? eamId("asset", siteId, asset) : location !== null ? eamId("location", siteId, location) : null,
    jobPlanId: jp === null ? null : eamId("jobplan", null, jp),
    frequency: value !== null && unit !== undefined ? { value, unit } : null,
    nextDue: str(rec.attrs.NEXTDATE),
    extra: extraOf(rec.attrs, parentAttrs("pm")),
    source: sourceRef("pm", rec),
  };
}

/** MXAPIJOBPLAN の 1 件 → 作業の手順（JOBTASK を手順の番号の順に） */
export function jobPlanFromMaximo(rec: MaximoRecord): JobPlan {
  const code = required(rec, "JPNUM", "MXAPIJOBPLAN");
  const tasks: JobTask[] = (rec.children.JOBTASK ?? []).map((t) => ({
    step: num(t.attrs.JPTASK) ?? str(t.attrs.JPTASK) ?? "",
    description: str(t.attrs.DESCRIPTION),
    durationHours: num(t.attrs.TASKDURATION),
  }));
  tasks.sort((a, b) => (typeof a.step === "number" && typeof b.step === "number" ? a.step - b.step : String(a.step).localeCompare(String(b.step))));
  return {
    id: eamId("jobplan", null, code),
    code,
    siteId: str(rec.attrs.SITEID),
    description: str(rec.attrs.DESCRIPTION),
    status: str(rec.attrs.STATUS),
    revision: num(rec.attrs.PLUSCREVNUM),
    tasks,
    extra: extraOf(rec.attrs, parentAttrs("jobPlan")),
    source: sourceRef("jobPlan", rec),
  };
}

/** MXAPIWODETAIL の 1 件 → 作業の実績 */
export function workRecordFromMaximo(rec: MaximoRecord): WorkRecord {
  const code = required(rec, "WONUM", "MXAPIWODETAIL");
  const siteId = str(rec.attrs.SITEID);
  const asset = str(rec.attrs.ASSETNUM);
  const location = str(rec.attrs.LOCATION);
  const pm = str(rec.attrs.PMNUM);
  const jp = str(rec.attrs.JPNUM);
  return {
    id: eamId("wo", siteId, code),
    code,
    siteId,
    description: str(rec.attrs.DESCRIPTION),
    status: str(rec.attrs.STATUS),
    workType: str(rec.attrs.WORKTYPE),
    assetId: asset === null ? null : eamId("asset", siteId, asset),
    locationId: location === null ? null : eamId("location", siteId, location),
    planId: pm === null ? null : eamId("pm", siteId, pm),
    jobPlanId: jp === null ? null : eamId("jobplan", null, jp),
    scheduledStart: str(rec.attrs.SCHEDSTART),
    actualStart: str(rec.attrs.ACTSTART),
    actualFinish: str(rec.attrs.ACTFINISH),
    actualLaborHours: num(rec.attrs.ACTLABHRS),
    extra: extraOf(rec.attrs, parentAttrs("work")),
    source: sourceRef("work", rec),
  };
}

// ---------------------------------------------------------------------------
// 読む（loadRecords を使う。件数の上限・打ち切りは loadRecords と同じ）
// ---------------------------------------------------------------------------

export interface MaximoEamReadOptions {
  where?: TypedFilter[];
  maxRows?: number;
  signal?: AbortSignal;
}

/** 資産と場所を読んで木にする。truncated はどちらかを打ち切ったとき */
export async function readMaximoAssetTree(client: MaximoClient, opts: MaximoEamReadOptions & { locationWhere?: TypedFilter[] } = {}): Promise<{ tree: AssetTree; truncated: boolean }> {
  const { locationWhere, ...rest } = opts;
  const assets = await loadRecords(client, maximoLoadOptions("asset", rest));
  const locations = await loadRecords(client, maximoLoadOptions("location", { ...rest, ...(locationWhere ? { where: locationWhere } : {}) }));
  const tree = buildAssetTree([...locations.records.map((r) => locationFromMaximo(r)), ...assets.records.map(assetFromMaximo)]);
  return { tree, truncated: assets.truncated || locations.truncated };
}

/** 保全計画と、そこから使う作業の手順を読む */
export async function readMaximoPlans(client: MaximoClient, opts: MaximoEamReadOptions = {}): Promise<{ plans: MaintenancePlan[]; jobPlans: JobPlan[]; truncated: boolean }> {
  const pms = await loadRecords(client, maximoLoadOptions("pm", opts));
  const plans = pms.records.map(planFromMaximo);
  const jpnums = [...new Set(pms.records.map((r) => str(r.attrs.JPNUM)).filter((v): v is string => v !== null))];
  const jobPlans: JobPlan[] = [];
  let truncated = pms.truncated;
  if (jpnums.length > 0) {
    const read: Omit<MaximoEamReadOptions, "where"> = { ...(opts.maxRows !== undefined ? { maxRows: opts.maxRows } : {}), ...(opts.signal ? { signal: opts.signal } : {}) };
    // in の値の数には上限がある（MAX_IN_VALUES）ので分けて読む
    for (let i = 0; i < jpnums.length; i += MAX_IN_VALUES) {
      const jps = await loadRecords(client, maximoLoadOptions("jobPlan", { ...read, where: [{ attr: "JPNUM", op: "in", value: jpnums.slice(i, i + MAX_IN_VALUES) }] }));
      jobPlans.push(...jps.records.map(jobPlanFromMaximo));
      truncated ||= jps.truncated;
    }
  }
  return { plans, jobPlans, truncated };
}

/** 作業の実績を読む */
export async function readMaximoWorkRecords(client: MaximoClient, opts: MaximoEamReadOptions = {}): Promise<{ records: WorkRecord[]; truncated: boolean }> {
  const wos = await loadRecords(client, maximoLoadOptions("work", opts));
  return { records: wos.records.map(workRecordFromMaximo), truncated: wos.truncated };
}
