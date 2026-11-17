import type { AuthorizeProblem, LicenseEntry, LicenseProblem } from "./key.ts";
export type Environment = "production" | "test";
/** 接続先ごとの申告を覚えておく localStorage のキー */
export declare const ENVIRONMENTS_STORAGE_KEY = "mxstage.maximo.environments";
export declare const LICENSE_ENDPOINT = "/_mxstage/license";
export declare const LICENSE_REMOVE_ENDPOINT = "/_mxstage/license/remove";
export declare const LICENSE_AUTHORIZE_ENDPOINT = "/_mxstage/license/authorize";
/** 期限が近いと知らせる日数 */
export declare const EXPIRY_WARNING_DAYS = 30;
export interface EnvironmentStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
export interface LicenseSnapshot {
    /** loading: 読み込み中 / ready: 読めた / unavailable: 橋渡しがライセンスを扱えない・つながらない */
    status: "loading" | "ready" | "unavailable";
    licenses: readonly LicenseEntry[];
    /** 変わるたびに増える（反映の可否の計算をやり直す目印） */
    version: number;
}
export type LicenseSaveOutcome = {
    ok: true;
    license: LicenseEntry;
} | {
    ok: false;
    problem: LicenseProblem | "unavailable";
};
export type AuthorizeOutcome = {
    ok: true;
    license: LicenseEntry;
} | {
    ok: false;
    problem: AuthorizeProblem | "unavailable";
    licensedHosts: string[];
};
/** 反映の関門（src/app/commit/controller.ts）が使う口 */
export interface LicenseGate {
    snapshot(): LicenseSnapshot;
    subscribe(listener: () => void): () => void;
    /** 期限内のキーのうち、接続先を本番の接続先に持つもの */
    licenseFor(baseUrl: string): LicenseEntry | null;
    /** 接続先の環境。キーにあれば本番、無ければ利用者の申告、申告も無ければ null */
    environmentOf(baseUrl: string): Environment | null;
    /** 本番に反映する直前に、橋渡しでもう一度確かめる */
    authorize(baseUrl: string): Promise<AuthorizeOutcome>;
}
export interface LicenseClientDeps {
    fetch?: typeof fetch;
    /** 接続先ごとの申告を覚える場所（ブラウザなら localStorage。省くと覚えない） */
    storage?: EnvironmentStorage | null;
    /** 申告を覚えるキー（既定 ENVIRONMENTS_STORAGE_KEY） */
    storageKey?: string;
    now?: () => number;
    /** 常にテストとして扱う接続先（既定は MX Stage の組み込みのデモのオリジン） */
    isBuiltInTest?: (baseUrl: string) => boolean;
    /** 橋渡しの入口（既定 LICENSE_ENDPOINT など。同じオリジンの相対パス） */
    endpoints?: Partial<LicenseEndpoints>;
}
export interface LicenseEndpoints {
    list: string;
    remove: string;
    authorize: string;
}
/** 期限までの日数（切り上げ。期限が無ければ null） */
export declare function daysUntilExpiry(entry: LicenseEntry, now: number): number | null;
export declare class LicenseClient implements LicenseGate {
    private readonly fetchImpl;
    private readonly storage;
    private readonly now;
    private readonly storageKey;
    private readonly isBuiltInTest;
    private readonly endpoints;
    private state;
    private readonly listeners;
    constructor(deps?: LicenseClientDeps);
    snapshot(): LicenseSnapshot;
    subscribe(listener: () => void): () => void;
    private set;
    private call;
    /** 置いてあるキーを読み直す */
    refresh(): Promise<void>;
    /** キーを保存する（貼り付けた文字列のまま渡す。確かめるのは橋渡し） */
    save(key: string): Promise<LicenseSaveOutcome>;
    /** キーを外す */
    remove(licenseId: string): Promise<boolean>;
    licenseFor(baseUrl: string): LicenseEntry | null;
    authorize(baseUrl: string): Promise<AuthorizeOutcome>;
    private declarations;
    /** 利用者が申告した環境（無ければ null） */
    declared(baseUrl: string): Environment | null;
    /** 接続先の環境を申告する（キーの本番の接続先に含まれる接続先は、申告に関わらず本番） */
    declare(baseUrl: string, environment: Environment): void;
    environmentOf(baseUrl: string): Environment | null;
}
