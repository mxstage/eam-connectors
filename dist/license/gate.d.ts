import type { AuthorizeOutcome, LicenseGate } from "./client.ts";
/** 接続先に反映できないライセンス・環境の理由（反映できるなら null） */
export declare function licenseBlocker(gate: LicenseGate, baseUrl: string): string | null;
/** 上部バーの環境の札 */
export interface EnvironmentBadge {
    kind: "test" | "licensed" | "readonly" | "undeclared";
    text: string;
    /** 期限まで EXPIRY_WARNING_DAYS 日以内なら、その日数 */
    expiresInDays: number | null;
}
/** 接続先の環境の札（テスト / 本番・ライセンスあり / 本番・読むだけ / 未設定） */
export declare function environmentBadge(gate: LicenseGate, baseUrl: string, now: number): EnvironmentBadge;
/** 反映の直前の確かめ（橋渡し）で断られたときの文 */
export declare function authorizeFailure(outcome: Extract<AuthorizeOutcome, {
    ok: false;
}>, baseUrl: string): string;
