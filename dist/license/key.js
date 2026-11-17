// ライセンスキーの形と中身の決まり。製品（橋渡し）と販売サイト（キーを発行する関数）が同じものを使う。
//
//   MXS1.<payload>.<signature>
//   - payload: 中身（LicensePayload）の JSON を UTF-8 にして base64url にしたもの
//   - signature: 文字列 "MXS1.<payload>" の UTF-8 に対する Ed25519 の署名を base64url にしたもの
//
// 貼り付けたときに入る改行や空白は無視する。署名の確かめ方は使う側が渡す
// （橋渡しは node:crypto、サイトは WebCrypto）。ここは Node にもブラウザにも依存しない。
export const LICENSE_PREFIX = "MXS1";
/** キーの文字数の上限（空白を除いたあと）。ふつうのキーは 400 文字ほど */
export const LICENSE_KEY_MAX_LENGTH = 4096;
const LIC_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
const KID_PATTERN = /^[a-z0-9]{1,16}$/;
/** 1 つの環境に書ける接続先（別名）の数の上限 */
export const LICENSE_MAX_HOSTS = 3;
/**
 * 接続先の URL から、ライセンスと照らし合わせる形（スキーム・ホスト・ポート）を取り出す。
 * パス（/maximo など）の違いは同じ環境とみなす。http・https 以外、利用者名・パスワード付き、読めない URL は null
 */
export function licenseHostOf(url) {
    let u;
    try {
        u = new URL(url.trim());
    }
    catch {
        return null;
    }
    if ((u.protocol !== "https:" && u.protocol !== "http:") || u.username !== "" || u.password !== "" || u.hostname === "")
        return null;
    return `${u.protocol}//${u.host}`.toLowerCase();
}
// ---------------------------------------------------------------------------
// base64url（Node の Buffer やブラウザの atob に頼らない）
// ---------------------------------------------------------------------------
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const LOOKUP = new Map([...ALPHABET].map((c, i) => [c, i]));
export function base64UrlEncode(bytes) {
    let out = "";
    for (let i = 0; i < bytes.length; i += 3) {
        const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
        out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63];
        if (i + 1 < bytes.length)
            out += ALPHABET[(n >> 6) & 63];
        if (i + 2 < bytes.length)
            out += ALPHABET[n & 63];
    }
    return out;
}
/** base64url を読む（詰め物の = は受けない）。読めなければ null */
export function base64UrlDecode(text) {
    if (text.length % 4 === 1)
        return null;
    const out = [];
    let buffer = 0;
    let bits = 0;
    for (const c of text) {
        const v = LOOKUP.get(c);
        if (v === undefined)
            return null;
        buffer = (buffer << 6) | v;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            out.push((buffer >> bits) & 0xff);
        }
    }
    // 余りのビットが 0 でないものは、同じバイト列の別の書き方なので受けない
    if (bits > 0 && (buffer & ((1 << bits) - 1)) !== 0)
        return null;
    return Uint8Array.from(out);
}
// ---------------------------------------------------------------------------
// 読む・作る
// ---------------------------------------------------------------------------
/** 貼り付けで入った空白・改行・ゼロ幅の文字を取り除く */
export function normalizeLicenseKeyText(text) {
    return text.replace(/[\s​-‍﻿]+/g, "");
}
function isPayload(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return false;
    const p = value;
    const str = (v, max) => typeof v === "string" && v.length > 0 && v.length <= max;
    const time = (v) => typeof v === "number" && Number.isInteger(v) && v > 0;
    return (p.v === 1 &&
        typeof p.kid === "string" &&
        KID_PATTERN.test(p.kid) &&
        typeof p.lic === "string" &&
        LIC_PATTERN.test(p.lic) &&
        str(p.org, 200) &&
        str(p.email, 320) &&
        Array.isArray(p.hosts) &&
        p.hosts.length >= 1 &&
        p.hosts.length <= LICENSE_MAX_HOSTS &&
        p.hosts.every((h) => typeof h === "string" && licenseHostOf(h) === h) &&
        new Set(p.hosts).size === p.hosts.length &&
        time(p.iat) &&
        time(p.exp) &&
        p.exp > p.iat &&
        (p.sub === undefined || str(p.sub, 200)));
}
/** キーの文字列を読む。署名はまだ確かめない（verifyLicenseSignature を使う側が確かめる） */
export function parseLicenseKey(text) {
    const key = normalizeLicenseKeyText(text);
    if (key === "")
        return { ok: false, problem: "empty" };
    if (key.length > LICENSE_KEY_MAX_LENGTH)
        return { ok: false, problem: "too_long" };
    const parts = key.split(".");
    if (parts.length !== 3 || parts[0] !== LICENSE_PREFIX)
        return { ok: false, problem: "format" };
    const payloadBytes = base64UrlDecode(parts[1]);
    const signature = base64UrlDecode(parts[2]);
    if (payloadBytes === null || signature === null || payloadBytes.length === 0 || signature.length !== 64)
        return { ok: false, problem: "format" };
    let payload;
    try {
        payload = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(payloadBytes));
    }
    catch {
        return { ok: false, problem: "payload" };
    }
    if (!isPayload(payload))
        return { ok: false, problem: "payload" };
    return { ok: true, key, signingInput: `${LICENSE_PREFIX}.${parts[1]}`, signature, payload };
}
/** キーを作る（販売サイトと試験が使う）。sign は署名する入力の UTF-8 を受け、Ed25519 の署名（64 バイト）を返す */
export async function encodeLicenseKey(payload, sign) {
    if (!isPayload(payload))
        throw new Error("ライセンスの中身が決まりに合いません。");
    const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
    const signingInput = `${LICENSE_PREFIX}.${body}`;
    const signature = await sign(new TextEncoder().encode(signingInput));
    return `${signingInput}.${base64UrlEncode(signature)}`;
}
/** 署名を確かめたあとの中身の状態（期限と取り消し）。nowSec は UNIX 秒 */
export function payloadState(payload, nowSec, revoked) {
    if (revoked.has(payload.lic))
        return "revoked";
    if (nowSec >= payload.exp)
        return "expired";
    return "valid";
}
