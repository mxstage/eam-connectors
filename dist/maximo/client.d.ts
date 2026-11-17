export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;
export type MaximoVia = "proxy" | "direct";
export interface MaximoClientOptions {
    /** Maximo のオリジン（例 https://maximo.example.com）。末尾の / は取り除く */
    baseUrl: string;
    /** API キーを返す関数。クライアントはキーを保持せず、呼び出しごとに取り出す */
    apiKey: () => string;
    /** proxy: 橋渡しの /mx 経由、direct: ブラウザから Maximo へ直接（CORS 設定が必要） */
    via: MaximoVia;
    /**
     * 橋渡しに保存した接続先の ID（proxy だけ）。あれば API キーを送らず、橋渡しがキーを付ける（src/bridge/connections.ts）。
     * このとき apiKey は使わない
     */
    connectionId?: string;
    fetchImpl?: FetchLike;
    /** 再試行の待ち。試験で待たないよう差し替える */
    sleep?: (ms: number) => Promise<void>;
    /** 再試行の初回待ち時間（2 倍ずつ伸ばす） */
    retryBaseMs?: number;
    /** GET の再試行回数の上限 */
    maxRetries?: number;
    /** 1 リクエストのタイムアウト */
    timeoutMs?: number;
    /** Maximo のコンテキストルート。既定 /maximo */
    contextRoot?: string;
}
/** Maximo が返したエラー（{Error:{reasonCode,message,statusCode}}）。判定は reasonCode で行う */
export declare class MaximoError extends Error {
    readonly status: number;
    readonly reasonCode: string | null;
    constructor(status: number, reasonCode: string | null, message: string);
}
/** 通信エラー・タイムアウト。書き込みでは「結果不明」として扱う */
export declare class MaximoNetworkError extends Error {
    readonly timedOut: boolean;
    constructor(message: string, timedOut: boolean);
}
export interface MaximoResponse {
    status: number;
    /** JSON を解析した本文。空なら null */
    body: unknown;
}
export declare class MaximoClient {
    readonly baseUrl: string;
    readonly via: MaximoVia;
    readonly contextRoot: string;
    /** 例 /maximo/api */
    readonly apiRoot: string;
    private readonly apiKey;
    /** 橋渡しに保存した接続先の ID（無ければ null） */
    readonly connectionId: string | null;
    private readonly fetchImpl;
    private readonly sleep;
    private readonly retryBaseMs;
    private readonly maxRetries;
    private readonly timeoutMs;
    constructor(opts: MaximoClientOptions);
    /**
     * Maximo が返した href（nextPage や member の href）を、このクライアントで送る path+query に付け替える。
     * href のオリジンは使わない（Maximo が内部ホスト名を返すことがあり、別オリジンへ送らないため）。
     * コンテキストルート配下でなければ拒否する。
     */
    hrefToPath(href: string): string;
    /** GET して JSON を返す。429/502/503/504 と通信エラーは指数バックオフで再試行する */
    get<T = unknown>(path: string): Promise<T>;
    /**
     * 書き込み（POST）。再試行しない。
     * - 2xx 以外（2xx でも本文が {Error:{...}} のもの）と、JSON でない応答は MaximoError
     * - 通信エラー・タイムアウトは MaximoNetworkError
     * - それ以外の Error は送る前に止めたもの（path の不正・API キー未設定など。リクエストは送っていない）
     */
    post(path: string, headers: Record<string, string>, body: unknown): Promise<MaximoResponse>;
    private backoff;
    private buildUrl;
    private buildHeaders;
    private fetchOnce;
}
/** Maximo のエラー応答を MaximoError に変換する */
export declare function toMaximoError(status: number, body: unknown): MaximoError;
export declare function isRecord(v: unknown): v is Record<string, unknown>;
