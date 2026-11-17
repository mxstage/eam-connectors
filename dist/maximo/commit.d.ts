import type { CellValue, ColumnSchema, CommitRowResult } from "../model.ts";
import { type MaximoRecord, type ParentCommitPlan, type SheetMeta } from "../sheet.ts";
import { type MaximoClient } from "./client.ts";
import { type StatusObjectKind } from "../status.ts";
export type InvariantCode = "I1" | "I2" | "I3" | "I4" | "I5" | "I6" | "I7" | "I8" | "I10" | "I11" | "I12" | "INPUT";
/** INPUT の違反のうち、利用者に次にできることを個別に案内するもの（文言の言語に依らず見分けるため） */
export type InvariantHint = "parentAdd" | "parentDelete" | "unknownParent" | "conflictingParentValues" | "addedParentMismatch" | "newParentKeys" | "statusEmpty" | "statusHistoryChild";
/** ステータスの属性（親の列） */
export declare const STATUS_ATTR = "STATUS";
/** 送らずに返した理由（CommitRowResult.reasonCode） */
export declare const SKIP_HISTORY = "MXSTAGE_HISTORY";
export declare const SKIP_PO_REVISION = "MXSTAGE_PO_REVISION";
export declare const SKIP_STATUS_TRANSITION = "MXSTAGE_STATUS_TRANSITION";
/** ステータスの変更（属性としては送らず、作成・更新を確かめた後に wsmethod:changeStatus で変える） */
export interface StatusChange {
    to: string;
    /** 読み込み時のステータス（新規作成は null） */
    from: string | null;
}
export declare class CommitInvariantError extends Error {
    readonly code: InvariantCode;
    readonly hint?: InvariantHint;
    constructor(code: InvariantCode, message: string, hint?: InvariantHint);
}
export declare const COMMIT_LIMITS: {
    readonly maxDeletesPerParent: 10;
    readonly maxDeletesTotal: 50;
    readonly maxParentsPerPlan: 200;
};
/** 反映パネルの「1 回の反映数」の既定（件数を指定するときの初めの値） */
export declare const DEFAULT_COMMIT_BATCH: 200;
/**
 * ParentCommitPlan に、変更・削除する子の読み込み時 _rowstamp を足したもの（旧設計 I9）。
 * Maximo では子だけを更新しても親の _rowstamp が変わらないことがあるため、触る子は子の _rowstamp でも照合する。
 * 【共有契約 ParentCommitPlan への追加を依頼中。それまではこの拡張型で持つ】
 */
export interface CommitPlan extends ParentCommitPlan {
    /** 子オブジェクト名 → 子 ID（文字列）→ 読み込み時の _rowstamp */
    expectedChildRowstamps?: Record<string, Record<string, string | null>>;
    /**
     * 新規作成（作業画面で足した親の行）。href は持たない（""）。送信先はシートを読み込んだ構造の一覧（/api/os/<構造>）だけ。
     * keys はシートのキー列（大文字）とその値。送る前と送った後に、このキーで Maximo を検索して確かめる
     */
    create?: {
        keys: Record<string, CellValue>;
    };
    /** ステータスの変更（STATUS の列を変えた・新しいレコードに STATUS を入れた） */
    status?: StatusChange;
}
/**
 * シートの差分（store の実装に依存しない素直な形）。
 * - cells: Base と異なる最終値のセル。親の列は親行・子行どちらの行キーでもよい。
 * - addedRows: 追加した行。子行の values の子の列は "CHILD.ATTR"。親の列が入っていてもよいが、親の値の変更は cells で渡す。
 *   親の行（childName が null、行キー = 親キー = キー列の値）は新規作成になる（Maximo から読み込んだシートで、キー列があるときだけ）。
 * - deletedRows: 削除した子行の行キー（親の削除は未対応）。
 */
export interface CommitChanges {
    cells: Array<{
        rowKey: string;
        col: string;
        value: CellValue;
    }>;
    addedRows: Array<{
        rowKey: string;
        parentKey: string;
        childName: string | null;
        values: Record<string, CellValue>;
    }>;
    deletedRows: string[];
}
export interface PlanCommitOptions {
    /** null（空文字を含む）への変更を許す（I10） */
    allowNull?: boolean;
    /** 削除件数の上限を超えることを人が確認した（I3） */
    deletesConfirmed?: boolean;
    /** 戻せないステータスへの変更を人が確認した（I11） */
    irreversibleConfirmed?: boolean;
}
/** 差分からコミット計画（親 1 件につき HTTP 1 回）を作る。不変条件に違反すれば例外 */
export declare function planCommit(meta: SheetMeta, records: MaximoRecord[], changes: CommitChanges, opts?: PlanCommitOptions): CommitPlan[];
export declare function isNullish(v: CellValue | undefined): boolean;
/** 差分判定の等価（null と空文字は同じとみなす） */
export declare function sameCell(a: CellValue | undefined, b: CellValue | undefined): boolean;
export interface ValidatePlanOptions {
    allowNull: boolean;
    deletesConfirmed: boolean;
    /** 戻せないステータスへの変更を人が確認した（I11。省くと確かめない） */
    irreversibleConfirmed?: boolean;
    childIdAttrs?: Record<string, string | null>;
    /** シートの列定義。渡すと I5（列に有る・readOnly でない・キー列でない）も検査する */
    columns?: ColumnSchema[];
    keyColumns?: string[];
    /** 1 回に送れる親の数（I8）。省くと COMMIT_LIMITS.maxParentsPerPlan。計画を作るだけのときは Infinity */
    maxParents?: number;
}
/** 計画そのものの不変条件を検査する（送信前にもう一度呼ぶ） */
export declare function validatePlans(plans: readonly CommitPlan[], opts: ValidatePlanOptions): void;
export interface PatchRequest {
    url: string;
    method: "POST";
    headers: {
        "x-method-override": "PATCH";
        patchtype: "MERGE";
        transactionid: string;
        batcherror: "1";
        properties: "*";
        "content-type": "application/json";
    };
    body: Record<string, unknown>;
}
/** 親 1 件分の PATCH（POST + x-method-override）を組み立てる。lean 形式なので属性名は小文字 */
export declare function buildPatchRequest(plan: ParentCommitPlan, transactionId: string): PatchRequest;
/** 送信直前の検査（I1 MERGE、I6 空配列、I7 href） */
export declare function assertSafePatchRequest(req: PatchRequest, plan: ParentCommitPlan): void;
export interface StatusRequest {
    url: string;
    method: "POST";
    headers: {
        "x-method-override": "PATCH";
        transactionid: string;
        "content-type": "application/json";
    };
    body: {
        status: string;
        memo: string;
    };
}
/**
 * ステータスの変更（レコードへの POST ?action=wsmethod:changeStatus、x-method-override: PATCH）。
 * 日付は送らない（Maximo の今になる）。ステータスの日付は前の変更より後でなければならず、作ったばかりの記録に
 * 過去の日付は付けられないため。過去の作業の日付は ACTSTART・ACTFINISH に属性として書く
 */
export declare function buildStatusRequest(recordPath: string, change: StatusChange, transactionId: string): StatusRequest;
export interface CreateRequest {
    url: string;
    method: "POST";
    headers: {
        transactionid: string;
        properties: "*";
        "content-type": "application/json";
    };
    body: Record<string, unknown>;
}
/**
 * 新規作成の要求（構造の一覧への POST。x-method-override は付けない）。collectionPath は /maximo/api/os/<構造>。
 * 本文はキーを含む親の属性と、追加する子の配列だけ（子に ID・_action は付けない）
 */
export declare function buildCreateRequest(plan: CommitPlan, transactionId: string, collectionPath: string): CreateRequest;
/** 新規作成の送信直前の検査: 一覧への POST、上書きの指定なし、キーをすべて送る、子は追加だけ */
export declare function assertSafeCreateRequest(req: CreateRequest, plan: CommitPlan, collectionPath: string): void;
export interface CommitRowOutcome extends CommitRowResult {
    transactionId: string | null;
    /** リクエストを Maximo へ送った（結果が不明な場合を含む） */
    sent: boolean;
    /** 新規作成を確かめたときの、作ったレコードの href（Maximo が返したもの。画面を読み直すのに使う） */
    createdHref?: string;
}
export interface ExecuteCommitOptions {
    onRow?: (result: CommitRowOutcome, plan: ParentCommitPlan) => void;
    /** 最初に送った 1 件（カナリア）の結果を人に見せ、続行してよければ true を返す */
    waitForCanaryContinue: (canary: CommitRowOutcome) => Promise<boolean>;
    /** 削除件数の上限超えを人が確認した（I3） */
    maxDeletesConfirmed?: boolean;
    /** null への変更を許す（I10） */
    allowNull?: boolean;
    /** 戻せないステータスへの変更を人が確認した（I11） */
    irreversibleConfirmed?: boolean;
    /**
     * ステータスの決まりを当てるオブジェクト（作業指示・注文書など。src/shared/status.ts の statusObjectKind）と、
     * 構造に HISTORYFLAG・STATUS があるか。送る前に読み直して、履歴・改訂が要る注文書・移れないステータスを送らずに返す
     */
    statusGuard?: {
        kind: StatusObjectKind | null;
        hasStatus: boolean;
        hasHistoryFlag: boolean;
    };
    /** 子オブジェクト名 → ID 属性（SheetMeta.childIdAttrs）。追加だけの子の照合に使う */
    childIdAttrs?: Record<string, string | null>;
    /** シートの定義。渡すと送信前に I5（readOnly・キー列）も検査し直す。childIdAttrs が無ければここから取る */
    meta?: Pick<SheetMeta, "columns" | "keyColumns" | "childIdAttrs">;
    /** error / unknown になったら残りを skipped にする（既定 true） */
    stopOnFailure?: boolean;
    makeTransactionId?: (plan: ParentCommitPlan, index: number) => string;
    /**
     * シートを読み込んだオブジェクト構造（例 MXAPIWO）。渡すと、送信先をその構造のレコード（/api/os/mxapiwo/...）に限る（I7）。
     * 読み込みに使った構造とは別の構造へ書き込まないため。
     */
    os?: string;
    /** 1 回に送れる親の数（I8）。反映パネルの「1 回の反映数」。省くと COMMIT_LIMITS.maxParentsPerPlan、すべてなら Infinity */
    maxParents?: number;
}
/**
 * 計画を 1 親ずつ実行する。precheck（読み直し照合）→ 送信 → verify。
 * - precheck で _rowstamp か子 ID 集合が違えば conflict（送らない）
 * - 2xx → verify（読み直して変更した属性・子操作が反映されているか。変更していない子が消えていないか）
 * - 409 → reconcile（読み直して反映済みなら verified、未反映・読み直し失敗なら unknown）
 * - 通信エラー・タイムアウト / reasonCode の無い 5xx / JSON でない 2xx・リダイレクト → 読み直した結果を message に書き、状態は unknown
 * - reasonCode 付きのエラー → error。送る前にクライアントが止めた場合（API キー未設定など）は error（sent:false）
 * - 送信先（I7）・transactionid・本文は、1 件も送らないうちに全計画分を検査する（違反は例外）
 * - onRow が例外を投げたら残りは skipped にして結果を返す
 * 自動再試行はしない。
 */
export declare function executeCommit(client: MaximoClient, plans: CommitPlan[], opts: ExecuteCommitOptions): Promise<CommitRowOutcome[]>;
/**
 * 送った値と読み直した値の比較。null と空文字と省略は同じ、数値は数値として、
 * 日付だけの値（YYYY-MM-DD）は読み直した日時の先頭と比べる。日時は時刻として比べる。
 */
export declare function sameValue(sent: CellValue, got: CellValue | undefined): boolean;
export interface WriteLogEntry {
    at: string;
    parentKey: string;
    transactionId: string | null;
    ops: {
        change: number;
        delete: number;
        add: number;
        attrs: string[];
        status?: string;
    };
    httpStatus: number | null;
    reasonCode: string | null;
    result: CommitRowResult["status"];
}
export declare function writeLogEntry(plan: ParentCommitPlan, result: CommitRowOutcome, at?: number): WriteLogEntry;
