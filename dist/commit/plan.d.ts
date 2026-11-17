import type { MaximoRecord, SheetMeta } from "../sheet.ts";
import { type CommitChanges, type CommitPlan } from "../maximo/commit.ts";
export interface PlanAttempt {
    plans: CommitPlan[];
    /** 確認が無いと I3（削除件数の上限）に引っかかる */
    needsDeleteConfirm: boolean;
    /** 確認が無いと I10（null への変更）に引っかかる */
    needsNullConfirm: boolean;
    /** 確認が無いと I11（戻せないステータス）に引っかかる */
    needsIrreversibleConfirm: boolean;
    /** I3 / I10 / I11 以外で計画を作れなかった理由（利用者向けの文言。末尾の括弧に内部コードを残す） */
    error: string | null;
}
/** 書き込みエンジンの内部コードだけの文言を、利用者が次にできることの分かる文にする */
export declare function describePlanError(e: unknown): string;
/**
 * 計画を作る。I3 / I10 / I11 は「人の確認が要る」ことが分かればよいので、確認済みとして作り直して他の問題も見る。
 * それ以外の不変条件違反は error（blockers になる）。
 */
export declare function attemptPlan(meta: SheetMeta, records: readonly MaximoRecord[], changes: CommitChanges, confirmed?: {
    allowNull?: boolean;
    deletesConfirmed?: boolean;
    irreversibleConfirmed?: boolean;
}): PlanAttempt;
/** 「1 回の反映数」を、この回に送る親の数にする（すべてなら全件。数は 1 以上の整数に丸める。省くと既定の 200） */
export declare function batchSizeOf(batch: "all" | number | undefined, total: number): number;
