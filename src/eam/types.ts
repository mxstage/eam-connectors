// EAM intermediate forms: a system-neutral shape for the asset tree, maintenance plans and work records.
// Maximo is the first system mapped onto them (./maximo.ts); IFS and SAP are planned to map onto the same types.
// This is a foundation: read-side types and mappings only. Writes still go through the Maximo commit engine.
//
// EAM の中間形（資産の木・保全計画・作業の実績）。業務システムに依らない形で、Maximo の対応は ./maximo.ts。

/** 中間形の値（日付は ISO 8601 の文字列のまま。変換はしない） */
export type EamValue = string | number | boolean | null;

/** つなぐ業務システム */
export type EamSystem = "maximo" | "ifs" | "sap";

/** 元のレコードへの参照（書き戻しや画面への案内に使う） */
export interface EamSourceRef {
  system: EamSystem;
  /** 元のオブジェクト（Maximo ならオブジェクト構造。例 MXAPIASSET） */
  object: string;
  /** 元のレコードの URL（Maximo なら href） */
  href: string;
}

// ---------------------------------------------------------------------------
// 資産の木
// ---------------------------------------------------------------------------

export type AssetNodeKind = "asset" | "location";

/** 木の節（資産か場所）。id は種類・サイト・番号から作る（asset:SITE/NUM、location:SITE/LOC） */
export interface AssetNode {
  id: string;
  kind: AssetNodeKind;
  /** 業務システムの番号（Maximo の ASSETNUM / LOCATION） */
  code: string;
  siteId: string | null;
  description: string | null;
  status: string | null;
  /** 親の節の id（無ければ根） */
  parentId: string | null;
  /** 資産のときの設置場所の節の id */
  locationId?: string | null;
  /** 場所の種類（Maximo の TYPE。OPERATING など） */
  locationType?: string | null;
  /** 対応に含めなかった属性（大文字の名前 → 値） */
  extra: Record<string, EamValue>;
  source: EamSourceRef;
}

export interface AssetTree {
  nodes: ReadonlyMap<string, AssetNode>;
  /** 親の id → 子の id（入れた順） */
  children: ReadonlyMap<string, readonly string[]>;
  /** 根の id（親が無いか、親が木に無い節） */
  roots: readonly string[];
}

// ---------------------------------------------------------------------------
// 保全計画
// ---------------------------------------------------------------------------

/** 周期の単位（Maximo の FREQUNIT を小文字にしたもの） */
export type FrequencyUnit = "days" | "weeks" | "months" | "years";

/** 保全計画（Maximo の PM） */
export interface MaintenancePlan {
  id: string;
  code: string;
  siteId: string | null;
  description: string | null;
  status: string | null;
  /** 対象の節（資産か場所）の id */
  targetId: string | null;
  /** 作業の手順の id（JobPlan.id） */
  jobPlanId: string | null;
  frequency: { value: number; unit: FrequencyUnit } | null;
  /** 次の予定日（ISO 8601） */
  nextDue: string | null;
  extra: Record<string, EamValue>;
  source: EamSourceRef;
}

export interface JobTask {
  /** 手順の番号（Maximo の JPTASK） */
  step: number | string;
  description: string | null;
  /** 見込みの時間（時間） */
  durationHours: number | null;
}

/** 作業の手順（Maximo の JOBPLAN） */
export interface JobPlan {
  id: string;
  code: string;
  siteId: string | null;
  description: string | null;
  status: string | null;
  revision: number | null;
  tasks: readonly JobTask[];
  extra: Record<string, EamValue>;
  source: EamSourceRef;
}

// ---------------------------------------------------------------------------
// 作業の実績
// ---------------------------------------------------------------------------

/** 作業の実績（Maximo の作業指示 WORKORDER） */
export interface WorkRecord {
  id: string;
  code: string;
  siteId: string | null;
  description: string | null;
  status: string | null;
  workType: string | null;
  /** 対象の資産の節の id */
  assetId: string | null;
  /** 対象の場所の節の id */
  locationId: string | null;
  /** 元になった保全計画の id（MaintenancePlan.id） */
  planId: string | null;
  jobPlanId: string | null;
  scheduledStart: string | null;
  actualStart: string | null;
  actualFinish: string | null;
  /** 実績の工数（時間） */
  actualLaborHours: number | null;
  extra: Record<string, EamValue>;
  source: EamSourceRef;
}

/** 中間形の id を作る（種類:サイト/番号。サイトが無ければ種類:番号） */
export function eamId(kind: string, siteId: string | null, code: string): string {
  return siteId ? `${kind}:${siteId}/${code}` : `${kind}:${code}`;
}
