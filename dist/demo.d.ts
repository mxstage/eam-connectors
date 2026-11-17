export type DemoLang = "ja" | "en";
export declare const DEMO_LANGS: readonly DemoLang[];
/** 予約の接続先 ID（保存した接続先の ID は c_<16 桁>なので重ならない） */
export declare const DEMO_CONNECTION_IDS: Readonly<Record<DemoLang, string>>;
/** 予約の Maximo のオリジン（.invalid は DNS で引けない。RFC 2606） */
export declare const DEMO_ORIGINS: Readonly<Record<DemoLang, string>>;
export declare const RESERVED_DEMO_DOMAIN = "mxstage.invalid";
/** 予約の接続先 ID ならその言語 */
export declare function demoLangOfConnectionId(id: string | null | undefined): DemoLang | null;
/** デモのオリジン（末尾の / は問わない）ならその言語 */
export declare function demoLangOfBaseUrl(baseUrl: string | null | undefined): DemoLang | null;
/** 予約のホスト（普通の接続先として保存・中継しない） */
export declare function isReservedDemoHost(hostname: string): boolean;
