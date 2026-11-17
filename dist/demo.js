// Reserved demo identifiers (copied from MX Stage src/shared/demo.ts).
// MX Stage ships a built-in demo that answers on reserved connection IDs (demo-ja / demo-en) and on origins under
// *.mxstage.invalid (RFC 2606: never resolves in DNS). Connectors must never save or relay such a host as a normal
// connection. These are the defaults of ConnectionStore and handleMaximoProxy; callers can pass their own rules.
//
// 予約のデモの決まり（MX Stage の src/shared/demo.ts から写した。データの置き場所などデモの本体は MX Stage に残す）。
export const DEMO_LANGS = ["ja", "en"];
/** 予約の接続先 ID（保存した接続先の ID は c_<16 桁>なので重ならない） */
export const DEMO_CONNECTION_IDS = { ja: "demo-ja", en: "demo-en" };
/** 予約の Maximo のオリジン（.invalid は DNS で引けない。RFC 2606） */
export const DEMO_ORIGINS = {
    ja: "https://demo-ja.mxstage.invalid",
    en: "https://demo-en.mxstage.invalid",
};
export const RESERVED_DEMO_DOMAIN = "mxstage.invalid";
/** 予約の接続先 ID ならその言語 */
export function demoLangOfConnectionId(id) {
    for (const lang of DEMO_LANGS)
        if (DEMO_CONNECTION_IDS[lang] === id)
            return lang;
    return null;
}
/** デモのオリジン（末尾の / は問わない）ならその言語 */
export function demoLangOfBaseUrl(baseUrl) {
    if (typeof baseUrl !== "string")
        return null;
    const trimmed = baseUrl.trim().replace(/\/+$/, "").toLowerCase();
    for (const lang of DEMO_LANGS)
        if (DEMO_ORIGINS[lang] === trimmed)
            return lang;
    return null;
}
/** 予約のホスト（普通の接続先として保存・中継しない） */
export function isReservedDemoHost(hostname) {
    const h = hostname.trim().toLowerCase().replace(/\.$/, "");
    return h === RESERVED_DEMO_DOMAIN || h.endsWith(`.${RESERVED_DEMO_DOMAIN}`);
}
