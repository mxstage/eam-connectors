export declare const LICENSE_PREFIX = "MXS1";
/** キーの文字数の上限（空白を除いたあと）。ふつうのキーは 400 文字ほど */
export declare const LICENSE_KEY_MAX_LENGTH = 4096;
export interface LicensePayload {
    /** 中身の形の版 */
    v: 1;
    /** 署名に使った鍵の名前（p1 = 本番、s1 = 決済の試験用） */
    kid: string;
    /** ライセンスの ID。更新しても変わらない */
    lic: string;
    /** 組織名 */
    org: string;
    /** 購入者のメール。製品は画面にも LLM にも出さない */
    email: string;
    /**
     * ライセンスで書き込める本番の Maximo の環境（1 ライセンス = 1 環境）の接続先。
     * 同じ環境の別名（社内用と社外用など）を 3 つまで。licenseHostOf で正規化した形（https://host[:port]）
     */
    hosts: string[];
    /** 発行した時刻（UNIX 秒） */
    iat: number;
    /** 期限（UNIX 秒）。請求期間の終わり + 30 日 */
    exp: number;
    /** 決済のサブスクリプションの ID など（無いこともある） */
    sub?: string;
}
/** キーを読めなかった理由 */
export type LicenseKeyProblem = "empty" | "too_long" | "format" | "payload";
export type ParsedLicenseKey = {
    ok: true;
    key: string;
    signingInput: string;
    signature: Uint8Array;
    payload: LicensePayload;
} | {
    ok: false;
    problem: LicenseKeyProblem;
};
/** キーを受け付けなかった理由 */
export type LicenseProblem = LicenseKeyProblem | "signature" | "unknown_key" | "test_key" | "expired" | "revoked" | "older" | "too_many";
/** 置いてある 1 つのキーの状態。キーそのものとメールは入れない */
export interface LicenseEntry {
    state: "valid" | "expired" | "revoked" | "invalid";
    /** state が invalid のときの理由 */
    problem?: LicenseProblem;
    licenseId: string;
    org?: string;
    /** 本番の接続先（https://host[:port]） */
    hosts?: string[];
    issuedAt?: string;
    expiresAt?: string;
    /** 決済の試験用の鍵で署名したキー */
    test?: boolean;
    /** 開発用に橋渡しが読んだキー（--dev-license）。ファイルには無く、外せない */
    bundled?: boolean;
}
/** 本番に反映できない理由 */
export type AuthorizeProblem = "no_license" | "not_licensed" | "expired" | "revoked" | "bad_scope";
/** 1 つの環境に書ける接続先（別名）の数の上限 */
export declare const LICENSE_MAX_HOSTS = 3;
/**
 * 接続先の URL から、ライセンスと照らし合わせる形（スキーム・ホスト・ポート）を取り出す。
 * パス（/maximo など）の違いは同じ環境とみなす。http・https 以外、利用者名・パスワード付き、読めない URL は null
 */
export declare function licenseHostOf(url: string): string | null;
export declare function base64UrlEncode(bytes: Uint8Array): string;
/** base64url を読む（詰め物の = は受けない）。読めなければ null */
export declare function base64UrlDecode(text: string): Uint8Array | null;
/** 貼り付けで入った空白・改行・ゼロ幅の文字を取り除く */
export declare function normalizeLicenseKeyText(text: string): string;
/** キーの文字列を読む。署名はまだ確かめない（verifyLicenseSignature を使う側が確かめる） */
export declare function parseLicenseKey(text: string): ParsedLicenseKey;
/** キーを作る（販売サイトと試験が使う）。sign は署名する入力の UTF-8 を受け、Ed25519 の署名（64 バイト）を返す */
export declare function encodeLicenseKey(payload: LicensePayload, sign: (input: Uint8Array) => Uint8Array | Promise<Uint8Array>): Promise<string>;
/** 署名を確かめたあとの中身の状態（期限と取り消し）。nowSec は UNIX 秒 */
export declare function payloadState(payload: LicensePayload, nowSec: number, revoked: ReadonlySet<string>): "valid" | "expired" | "revoked";
