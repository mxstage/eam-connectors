import type { LicenseStore } from "./licenseStore.ts";
import type { WriteGuard, WriteGuardDecision } from "./mx.ts";
export type WriteEnvironment = "production" | "test";
export interface LicenseWriteGuardOptions {
    /** ライセンスキーの置き場所（authorize だけを使う） */
    licenses: Pick<LicenseStore, "authorize">;
    /**
     * 転送先のオリジンの環境。"test" ならキー無しで書ける。null（申告が無い）は書かせない。
     * 省くと、どの接続先も本番として扱う。
     */
    environmentOf?: (origin: string) => WriteEnvironment | null;
}
/** 本番の接続先に書いてよいか（書き込みの直前に呼ぶ） */
export declare function authorizeWrite(licenses: Pick<LicenseStore, "authorize">, origin: string, environment?: WriteEnvironment | null): WriteGuardDecision;
/** handleMaximoProxy の writeGuard に渡す守りを作る */
export declare function createLicenseWriteGuard(opts: LicenseWriteGuardOptions): WriteGuard;
