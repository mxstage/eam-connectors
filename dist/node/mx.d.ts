import type { ClientRequest, IncomingMessage, RequestOptions, ServerResponse } from "node:http";
/**
 * 上流（Maximo）への要求の時間の上限。応答の頭が届くまでの時間と、本文が途切れている時間の両方に使う。
 * 上限が無いと、応答しない Maximo への要求がタブの fetch と上流の接続をいつまでも抱える。
 */
export declare const MX_UPSTREAM_TIMEOUT_MS = 60000;
export interface ProxyError {
    status: number;
    error: string;
    message: string;
}
/** 上流の応答ヘッダから、転送してよいものだけを残す */
export declare function sanitizeUpstreamHeaders(upstream: NodeJS.Dict<string | string[]>, status: number): Record<string, string | string[]>;
/** X-Maximo-Base を検証して転送先のオリジンを返す */
export declare function parseMaximoBase(value: string | undefined, allowedHosts: string[], isReservedHost?: (hostname: string) => boolean): {
    origin: string;
} | ProxyError;
/** /mx を除いたパスと検索文字列が転送してよいものか調べる */
export declare function checkProxyPath(path: string, search: string): ProxyError | null;
/** 転送するヘッダだけを取り出し、apikey を足す */
export declare function forwardHeaders(incoming: NodeJS.Dict<string | string[]>, apikey: string): Record<string, string>;
/** 上流へ要求を出す関数（試験で差し替える） */
export type UpstreamRequest = (options: RequestOptions & {
    rejectUnauthorized?: boolean;
}, onResponse: (res: IncomingMessage) => void) => ClientRequest;
export interface MaximoProxyOptions {
    /** 空なら無制限 */
    allowedHosts: string[];
    /** 自己署名証明書の Maximo に届かせる（この接続だけ検証を切る） */
    insecure: boolean;
    /** 既定は node:https / node:http の request */
    requestImpl?: UpstreamRequest | undefined;
    /** 上流への要求の時間の上限（既定 MX_UPSTREAM_TIMEOUT_MS） */
    timeoutMs?: number | undefined;
    /** 保存した接続先のオリジンと API キー（あれば X-Maximo-Base・X-Maximo-Apikey は読まない。src/node/connections.ts） */
    saved?: {
        origin: string;
        apiKey: string;
    } | undefined;
    /**
     * 書き込み（POST。Maximo の更新・作成・削除・ステータスの変更はすべて POST）を送る前に呼ぶ守り。
     * 既定は無し（MX Stage は画面の反映の関門と authorize で確かめるので、中継では確かめない）。
     * 渡すと、ok でない書き込みは上流へ送らずに 403（error: "write_not_authorized"）で断る。src/node/writeGuard.ts
     */
    writeGuard?: WriteGuard | undefined;
    /** 予約のホスト（既定は MX Stage の組み込みのデモ *.mxstage.invalid） */
    isReservedHost?: ((hostname: string) => boolean) | undefined;
}
/** 書き込みの守りの答え */
export type WriteGuardDecision = {
    ok: true;
} | {
    ok: false;
    problem: string;
    message: string;
};
/** 転送先のオリジン（https://host[:port]）への書き込みを許すか */
export type WriteGuard = (origin: string) => WriteGuardDecision;
/** /mx/* を Maximo へ転送する */
export declare function handleMaximoProxy(req: IncomingMessage, res: ServerResponse, url: URL, opts: MaximoProxyOptions): void;
