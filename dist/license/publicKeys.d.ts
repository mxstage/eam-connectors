export interface LicensePublicKey {
    /** Ed25519 の公開鍵（JWK の x。base64url で 32 バイト） */
    x: string;
    /** 決済の試験用の鍵。試験の設定（MXSTAGE_LICENSE_TEST=1）のときだけ受け付ける */
    test: boolean;
}
export declare const LICENSE_PUBLIC_KEYS: Readonly<Record<string, LicensePublicKey>>;
/**
 * 取り消したライセンス（返金・不正）の ID。次の版から受け付けなくなる。
 * 期限は長くても請求期間 + 30 日なので、ここに載せるのは期限の前に止める必要があるものだけ。
 */
export declare const REVOKED_LICENSES: ReadonlySet<string>;
