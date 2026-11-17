import type { CellValue } from "../model.ts";
export type FakeAttrType = "string" | "integer" | "number" | "boolean" | "date" | "datetime";
export interface FakeAttrDef {
    type: FakeAttrType;
    maxLength?: number;
    required?: boolean;
    readOnly?: boolean;
    title?: string;
    /** 値の一覧（ドメイン）がある。jsonschemas に hasList:true を付け、getlist~<属性> で lists の値を返す */
    hasList?: boolean;
}
/** getlist~<属性> が返す値の一覧の 1 件（ALN・SYNONYM ドメインの形: value と description） */
export interface FakeListItem {
    value: string;
    description?: string;
}
export interface FakeChildDef {
    /** 子を特定する属性（小文字）。省略した子には自動で採番する */
    idAttr: string;
    attrs: Record<string, FakeAttrDef>;
}
export interface FakeRecordSeed {
    attrs: Record<string, CellValue>;
    children?: Record<string, Array<Record<string, CellValue>>>;
}
export interface FakeOsSeed {
    description?: string;
    mbo?: string;
    /** apimeta に載せない（実機では顧客が作った EXT_* などが載らなかった。jsonschemas と行の読み取りはできる） */
    hiddenFromApimeta?: boolean;
    /** 親のキー属性（小文字） */
    keyAttrs: string[];
    attrs: Record<string, FakeAttrDef>;
    children?: Record<string, FakeChildDef>;
    records?: FakeRecordSeed[];
    /** 属性（小文字。子は "子.属性"）→ getlist の値の一覧 */
    lists?: Record<string, FakeListItem[]>;
    /**
     * 別のオブジェクト構造と同じ行を使う（例 MXAPIWO と MXAPIWODETAIL は同じ WORKORDER の表）。records は書かない。
     * 属性・子はこの構造の定義にあるものだけを返し、書き込みは両方に見える
     */
    recordsFrom?: string;
}
export interface FakeSeed {
    baseUrl?: string;
    apiKey?: string;
    /** Maximo が返す href のオリジン（内部ホスト名を返す実機を再現するため baseUrl と別にできる） */
    hrefOrigin?: string;
    /** false で要求を state.requests に残さない（長く動かす開発用の大きなデータで、記録が溜まり続けないように） */
    logRequests?: boolean;
    objectStructures: Record<string, FakeOsSeed>;
}
export interface FakeChild {
    attrs: Record<string, CellValue>;
    rowstamp: number;
}
export interface FakeRecord {
    uid: string;
    rowstamp: number;
    attrs: Record<string, CellValue>;
    children: Record<string, FakeChild[]>;
}
export interface FakeOsState {
    name: string;
    def: FakeOsSeed;
    records: FakeRecord[];
}
export interface FakeRequestLog {
    method: string;
    /** fetch に渡された URL（proxy なら /mx/...） */
    url: string;
    /** Maximo 側の path+query */
    path: string;
    /** ヘッダ（小文字。API キーの値は伏せる） */
    headers: Record<string, string>;
    body: unknown;
}
export interface FakeFailure {
    method?: "GET" | "POST";
    pathIncludes?: string;
    /** before: 処理せずに失敗させる。after: 書き込みを反映してから失敗させる（POST のみ） */
    phase?: "before" | "after";
    kind: "network" | "status";
    status?: number;
    body?: unknown;
    /** 何回失敗させるか（既定 1） */
    times?: number;
}
export interface FakeMaximo {
    fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
    state: {
        os: Record<string, FakeOsState>;
        transactionIds: Set<string>;
        requests: FakeRequestLog[];
        failures: FakeFailure[];
    };
    baseUrl: string;
    apiKey: string;
    hrefOrigin: string;
    hrefOf(os: string, uid: string): string;
    records(os: string): FakeRecord[];
    find(os: string, pred: (r: FakeRecord) => boolean): FakeRecord | undefined;
    /** 他の利用者の更新を再現する。bumpRowstamp:false で親の _rowstamp を変えずに子だけ変える */
    update(os: string, uid: string, fn: (r: FakeRecord) => void, opts?: {
        bumpRowstamp?: boolean;
    }): void;
    /** 子を追加して採番した ID を返す */
    addChild(os: string, uid: string, kind: string, attrs: Record<string, CellValue>, opts?: {
        bumpRowstamp?: boolean;
    }): CellValue;
    /** 書き込み（POST）の件数 */
    writeCount(): number;
}
/**
 * ステータスを持つオブジェクト（MBO）の決まり。製品の src/shared/status.ts の STATUS_RULES・WO_TRANSITIONS の写し
 * （この部品は Node の型の除去でそのまま動かすので、値の import を持たない。同じであることは tests/app/maximo-status.test.ts が確かめる）
 */
export declare const FAKE_STATUSFUL: Readonly<Record<string, {
    initial: string;
    history: readonly string[];
    editable?: readonly string[];
}>>;
/** 資産の撤去済み。ここからは他のステータスへ移れない（製品の src/shared/status.ts の canChangeStatus と同じ） */
export declare const FAKE_ASSET_DECOMMISSIONED = "DECOMMISSIONED";
/** 作業指示のステータスの移り方（IBM の「Allowable Status Changes for Work Orders」） */
export declare const FAKE_WO_TRANSITIONS: Readonly<Record<string, readonly string[]>>;
export declare function createFakeMaximo(seed: FakeSeed): FakeMaximo;
/**
 * Maximo の定義の一覧（オブジェクト構造 MXAPIINTOBJECT）を seed に足す。seed のすべての構造（apimeta に載らないものも）を
 * 適用先 usewith で載せ、notApi は定義だけあって API で使えない構造（例 マイグレーション・マネージャー。jsonschemas も無い）。
 */
export declare function withDefinitions(seed: FakeSeed, notApi?: Array<{
    name: string;
    usewith: string;
    description?: string;
}>, usewith?: string): FakeSeed;
/**
 * WO（MXAPIWO）と子 MULTIASSETLOCCI・EXT_WOPERMIT、資産（MXASSET）の定義。
 * 子の ID は定義順に 1001 から採番される（WO1001: MULTIID 1001〜1003、EXT_WOPERMITID 1004 / WO1002: MULTIID 1005）。
 */
export declare function sampleSeed(opts?: {
    woRecords?: FakeRecordSeed[];
    hrefOrigin?: string;
    baseUrl?: string;
}): FakeSeed;
