import { SecretBox, type ProtectionKind } from "./secretBox.ts";
export declare const CONNECTIONS_FILE = "connections.json";
export declare const MAX_CONNECTIONS = 50;
export declare const CONNECTION_NAME_MAX = 128;
export type ConnectionEnvironment = "production" | "test";
/** 作業画面に返す接続先（API キーを含めない） */
export interface ConnectionEntry {
    id: string;
    name: string;
    /** https://host[:port] */
    baseUrl: string;
    environment: ConnectionEnvironment | null;
    createdAt: number;
    updatedAt: number;
    lastUsedAt: number | null;
}
export interface ConnectionList {
    connections: ConnectionEntry[];
    /** 最後に使った接続先（新しい窓はこれで自動でつなぐ）。デモの予約の ID（demo-ja など）のこともある */
    lastUsedId: string | null;
    /** API キーの守り方 */
    protection: ProtectionKind;
}
export interface SaveConnectionInput {
    /** 無ければ新しく作る */
    id?: string;
    name: string;
    baseUrl: string;
    environment: ConnectionEnvironment | null;
    /** 新しく作るときは必須。直すときは省けば前のキーのまま */
    apiKey?: string;
}
export type ConnectionProblem = "invalid_name" | "invalid_url" | "invalid_key" | "key_required" | "not_found" | "too_many" | "unavailable" | "unreadable";
export type SaveConnectionResult = {
    ok: true;
    connection: ConnectionEntry;
} | {
    ok: false;
    problem: ConnectionProblem;
};
export type ResolveResult = {
    ok: true;
    origin: string;
    apiKey: string;
} | {
    ok: false;
    problem: "not_found" | "unreadable" | "unavailable";
};
/**
 * 普通の接続先として保存・中継しない、予約の接続先（ID とホスト）。
 * 既定は MX Stage の組み込みのデモ（demo-ja・demo-en と *.mxstage.invalid。src/demo.ts）。
 */
export interface ReservedConnections {
    isReservedHost(hostname: string): boolean;
    isReservedId(id: string | null | undefined): boolean;
}
/** MX Stage の組み込みのデモの予約（既定） */
export declare const MXSTAGE_DEMO_RESERVED: ReservedConnections;
/** 予約の無い決まり（デモを持たない利用側が使う） */
export declare const NO_RESERVED_CONNECTIONS: ReservedConnections;
/** https://host[:port] だけを受ける（/mx の X-Maximo-Base と同じ条件）。正規化したオリジンを返す。デモの予約のホストは受けない */
export declare function normalizeConnectionUrl(raw: string, reserved?: ReservedConnections): string | null;
export interface ConnectionStoreOptions {
    /** 状態フォルダ（既定 ~/.config/mxstage。stateDir()） */
    dir?: string;
    /** 既定は同じ状態フォルダの SecretBox（keychain の service・DPAPI の entropy も既定のまま） */
    box?: SecretBox;
    now?: () => number;
    /** 予約の接続先（既定 MXSTAGE_DEMO_RESERVED） */
    reserved?: ReservedConnections;
}
export declare class ConnectionStore {
    private readonly dir;
    private readonly file;
    private readonly box;
    private readonly now;
    private readonly reserved;
    /** 開いた API キー（ID → キー）。ファイルが変わったら作り直す */
    private cache;
    constructor(opts: ConnectionStoreOptions);
    list(): ConnectionList;
    save(input: SaveConnectionInput): Promise<SaveConnectionResult>;
    remove(id: string): boolean;
    /** この接続先を使った（新しい窓はこれを選ぶ） */
    use(id: string): ConnectionEntry | null;
    /** デモを使った（新しい窓はデモにつなぐ）。予約の ID だけを受ける */
    useDemo(id: string): boolean;
    /** /mx が使う。接続先の Maximo のオリジンと API キー */
    resolve(id: string): Promise<ResolveResult>;
    private read;
    private write;
}
