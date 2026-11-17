import type { WriteLogEntry } from "../maximo/commit.ts";
export declare const WRITE_LOG_CSV_HEADER: readonly ["at", "parentKey", "transactionId", "change", "delete", "add", "attrs", "httpStatus", "reasonCode", "result"];
export declare function writeLogCsv(entries: readonly WriteLogEntry[]): string;
