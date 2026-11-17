import type { TypedFilter } from "../model.ts";
import { type MaximoRecord, type SheetMeta, type SheetRow } from "../sheet.ts";
import { type MaximoClient } from "./client.ts";
export interface LoadRecordsOptions {
    os: string;
    /** 列名（子は "CHILD.ATTR"） */
    select: string[];
    where?: TypedFilter[];
    /** "-WONUM" は降順 */
    orderBy?: string[];
    maxRows?: number;
    pageSize?: number;
    /** 同時に取るページ数（既定 4。1 にすると nextPage を順にたどる） */
    concurrency?: number;
    /** 子オブジェクト名 → 子の ID 属性（describe の結果） */
    childIdAttrs: Record<string, string | null>;
    /** スキーマの列名の集合。select / where / orderBy の検査に使う */
    knownAttrs: Set<string>;
    /** 親のキー列。select に無ければ足す（行キーに必要なため） */
    keyColumns?: string[];
    signal?: AbortSignal;
}
export interface LoadRecordsResult {
    records: MaximoRecord[];
    /** maxRows で打ち切った、または件数が合わない（黙って切り捨てず画面に出す） */
    truncated: boolean;
    /** collectioncount による総件数。返らなければ null */
    total: number | null;
    /** 子属性のフィルタ。Maximo へは送っていないのでタブ内で評価する */
    postFilters: TypedFilter[];
}
export type LoadProgress = (loaded: number, total: number | null) => void;
export declare const DEFAULT_MAX_ROWS = 5000;
export declare const MAX_MAX_ROWS = 100000;
/** 子を含む読み込みの 1 ページ（子の配列で応答が大きくなるため小さめ） */
export declare const DEFAULT_PAGE_SIZE = 200;
/** 親の列だけの読み込みの 1 ページ（Maximo の上限で切られてもそのまま続けられる） */
export declare const WIDE_PAGE_SIZE = 1000;
/** 同時に取るページ数 */
export declare const DEFAULT_CONCURRENCY = 4;
/** 列の数と子の有無から 1 ページの件数を決める（指定があればそれを使う） */
export declare function autoPageSize(select: readonly string[], childIdAttrs: Record<string, string | null>): number;
/**
 * GET /maximo/api/os/{os}?lean=1&oslc.select&oslc.where&oslc.orderBy&oslc.pageSize&collectioncount=1
 * を responseInfo.nextPage.href に沿ってたどる。nextPage の href は同じ baseUrl / proxy の path+query に付け替える。
 */
export declare function loadRecords(client: MaximoClient, opts: LoadRecordsOptions, onProgress?: LoadProgress): Promise<LoadRecordsResult>;
/**
 * lean 形式の member 1 件を MaximoRecord にする。属性名は大文字、子配列（オブジェクトの配列）は子オブジェクト名（大文字）→ MaximoChild。
 * lean 形式では null の属性が省略されるので、読む側は「無い＝null」として扱う。
 */
export declare function parseMember(member: unknown, childIdAttrs: Record<string, string | null>, opts?: {
    requireHref?: boolean;
}): MaximoRecord;
/** ID の分からない子の行キーに使う接頭辞（例 idx~0）。この行は変更・削除できない */
export declare const NO_ID_CHILD_PREFIX = "idx~";
/** 親キー。キー列があればその値から作り、無ければ href を使う */
export declare function parentKeyOf(record: MaximoRecord, keyColumns: string[]): string;
/** 列の子オブジェクト名（大文字）。親の列なら null */
export declare function columnChild(col: {
    name: string;
    child?: string;
}): string | null;
/**
 * MaximoRecord[] を MXLoader と同じ平坦な行にする。
 * - 子の列を選んでいなければ親 1 行。
 * - 子の列があれば、親の値を子の行数だけ繰り返す。複数種類の子を選んだ場合は種類ごとに行を作る。
 * - 選んだ種類の子を 1 件も持たない親は、子の列を空にした親 1 行にする（子を追加できるように）。
 */
export declare function recordsToRows(records: MaximoRecord[], meta: Pick<SheetMeta, "columns" | "keyColumns">): SheetRow[];
