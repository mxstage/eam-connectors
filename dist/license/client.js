// 作業画面のライセンス。橋渡しの入口（/_mxstage/license）でキーを読み書きし、接続先ごとの環境（本番／テスト）を決める。
// - 有償なのは本番の Maximo への「Maximo に反映」だけ。本番でも読み込み・Skill づくり・編集はライセンス無しでできる。
// - 接続先がキーの本番の接続先に含まれていれば、その接続先は本番（利用者が変えられない）。
// - キーに無い接続先は、利用者が接続のときに本番かテストかを申告する（localStorage の mxstage.maximo.environments）。
// - 反映の直前には、橋渡しでもう一度確かめる（authorize）。確かめられなければ本番には書かない。
import { demoLangOfBaseUrl } from "../demo.js";
import { licenseHostOf } from "./key.js";
import { normalizeScope } from "../scope.js";
/** 接続先ごとの申告を覚えておく localStorage のキー */
export const ENVIRONMENTS_STORAGE_KEY = "mxstage.maximo.environments";
export const LICENSE_ENDPOINT = "/_mxstage/license";
export const LICENSE_REMOVE_ENDPOINT = "/_mxstage/license/remove";
export const LICENSE_AUTHORIZE_ENDPOINT = "/_mxstage/license/authorize";
/** 期限が近いと知らせる日数 */
export const EXPIRY_WARNING_DAYS = 30;
function isEntry(value) {
    if (!value || typeof value !== "object")
        return false;
    const v = value;
    return (v.state === "valid" || v.state === "expired" || v.state === "revoked" || v.state === "invalid") && typeof v.licenseId === "string";
}
function entriesOf(value) {
    return Array.isArray(value) && value.every(isEntry) ? value : null;
}
/** 期限までの日数（切り上げ。期限が無ければ null） */
export function daysUntilExpiry(entry, now) {
    if (entry.expiresAt === undefined)
        return null;
    const at = Date.parse(entry.expiresAt);
    return Number.isNaN(at) ? null : Math.ceil((at - now) / 86_400_000);
}
export class LicenseClient {
    fetchImpl;
    storage;
    now;
    storageKey;
    isBuiltInTest;
    endpoints;
    state = { status: "loading", licenses: [], version: 0 };
    listeners = new Set();
    constructor(deps = {}) {
        this.fetchImpl = deps.fetch ?? ((input, init) => fetch(input, init));
        this.storage = deps.storage ?? null;
        this.now = deps.now ?? Date.now;
        this.storageKey = deps.storageKey ?? ENVIRONMENTS_STORAGE_KEY;
        this.isBuiltInTest = deps.isBuiltInTest ?? ((baseUrl) => demoLangOfBaseUrl(baseUrl) !== null);
        this.endpoints = { list: LICENSE_ENDPOINT, remove: LICENSE_REMOVE_ENDPOINT, authorize: LICENSE_AUTHORIZE_ENDPOINT, ...deps.endpoints };
    }
    snapshot() {
        return this.state;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    set(status, licenses) {
        this.state = { status, licenses, version: this.state.version + 1 };
        for (const l of [...this.listeners])
            l();
    }
    async call(path, body) {
        try {
            const res = await this.fetchImpl(body === undefined ? `${path}?t=${this.now()}` : path, {
                method: body === undefined ? "GET" : "POST",
                cache: "no-store",
                credentials: "same-origin",
                ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
            });
            const json = await res.json().catch(() => null);
            return json !== null && typeof json === "object" ? { status: res.status, json: json } : null;
        }
        catch {
            return null;
        }
    }
    /** 置いてあるキーを読み直す */
    async refresh() {
        const res = await this.call(this.endpoints.list);
        const licenses = res?.status === 200 ? entriesOf(res.json.licenses) : null;
        if (licenses === null)
            this.set("unavailable", []);
        else
            this.set("ready", licenses);
    }
    /** キーを保存する（貼り付けた文字列のまま渡す。確かめるのは橋渡し） */
    async save(key) {
        const res = await this.call(this.endpoints.list, { key });
        const licenses = res === null ? null : entriesOf(res.json.licenses);
        if (licenses !== null)
            this.set("ready", licenses);
        if (res !== null && res.status === 200 && isEntry(res.json.license))
            return { ok: true, license: res.json.license };
        if (res !== null && res.status === 422 && typeof res.json.problem === "string")
            return { ok: false, problem: res.json.problem };
        return { ok: false, problem: "unavailable" };
    }
    /** キーを外す */
    async remove(licenseId) {
        const res = await this.call(this.endpoints.remove, { licenseId });
        const licenses = res === null ? null : entriesOf(res.json.licenses);
        if (licenses !== null)
            this.set("ready", licenses);
        return res?.status === 200 && res.json.removed === true;
    }
    licenseFor(baseUrl) {
        const host = licenseHostOf(baseUrl);
        if (host === null)
            return null;
        return this.state.licenses.find((e) => e.state === "valid" && (e.hosts ?? []).includes(host)) ?? null;
    }
    async authorize(baseUrl) {
        const res = await this.call(this.endpoints.authorize, { baseUrl });
        if (res !== null && res.status === 200 && isEntry(res.json.license))
            return { ok: true, license: res.json.license };
        const licensedHosts = Array.isArray(res?.json.licensedHosts) ? res.json.licensedHosts.filter((h) => typeof h === "string") : [];
        if (res !== null && res.status === 403 && typeof res.json.problem === "string")
            return { ok: false, problem: res.json.problem, licensedHosts };
        return { ok: false, problem: "unavailable", licensedHosts };
    }
    // -------------------------------------------------------------------------
    // 接続先ごとの申告
    // -------------------------------------------------------------------------
    declarations() {
        try {
            const raw = this.storage?.getItem(this.storageKey);
            const parsed = raw ? JSON.parse(raw) : {};
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
                return {};
            return Object.fromEntries(Object.entries(parsed).filter((e) => e[1] === "production" || e[1] === "test"));
        }
        catch {
            return {};
        }
    }
    /** 利用者が申告した環境（無ければ null） */
    declared(baseUrl) {
        return this.declarations()[normalizeScope(baseUrl)] ?? null;
    }
    /** 接続先の環境を申告する（キーの本番の接続先に含まれる接続先は、申告に関わらず本番） */
    declare(baseUrl, environment) {
        const all = { ...this.declarations(), [normalizeScope(baseUrl)]: environment };
        try {
            this.storage?.setItem(this.storageKey, JSON.stringify(all));
        }
        catch {
            // 保存できなくても、次の接続でもう一度選んでもらうだけ
        }
        this.set(this.state.status, this.state.licenses);
    }
    environmentOf(baseUrl) {
        // 組み込みのデモ（この PC の中の架空の Maximo）は常にテスト。本番にはならない
        if (this.isBuiltInTest(baseUrl))
            return "test";
        if (this.licenseFor(baseUrl) !== null)
            return "production";
        return this.declared(baseUrl);
    }
}
