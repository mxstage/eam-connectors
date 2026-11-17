export declare const PAST_STATUS_STORAGE_KEY = "mxstage.maximo.pastStatus";
export declare const PAST_STATUS_CHOICES: readonly ["COMP", "CLOSE"];
export type PastStatus = (typeof PAST_STATUS_CHOICES)[number];
export declare const DEFAULT_PAST_STATUS: PastStatus;
export interface PastStatusStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
export interface StatusPrefs {
    pastStatusOf(baseUrl: string): PastStatus;
}
/** 接続先の過去の作業のステータス（選んでいなければ COMP） */
export declare function pastStatusOf(storage: PastStatusStorage | null, baseUrl: string): PastStatus;
export declare function setPastStatus(storage: PastStatusStorage | null, baseUrl: string, status: PastStatus): void;
export declare function createStatusPrefs(storage: PastStatusStorage | null): StatusPrefs;
