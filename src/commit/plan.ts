// 計画の試し（確認が要るかを先に見る）と、利用者向けの計画の失敗の文、1 回の反映数（MX Stage の src/app/commit/controller.ts から移した）。

import type { MaximoRecord, SheetMeta } from "../sheet.ts";
import { COMMIT_LIMITS, CommitInvariantError, DEFAULT_COMMIT_BATCH, planCommit, type CommitChanges, type CommitPlan, type InvariantCode, type InvariantHint } from "../maximo/commit.ts";
import { commitMessages as m } from "./messages.ts";

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

/** 不変条件ごとに、利用者が次にできることを書く */
function adviceFor(code: InvariantCode, hint: InvariantHint | undefined): string {
  const a = m().advice;
  if (code === "INPUT") return hint !== undefined ? a[hint] : a.input;
  switch (code) {
    case "I2":
      return a.I2;
    case "I3":
      return a.I3(COMMIT_LIMITS.maxDeletesPerParent, COMMIT_LIMITS.maxDeletesTotal);
    case "I4":
      return a.I4;
    case "I5":
      return a.I5;
    case "I6":
      return a.I6;
    case "I7":
      return a.I7;
    case "I8":
      return a.I8(COMMIT_LIMITS.maxParentsPerPlan);
    case "I10":
      return a.I10;
    case "I11":
      return a.I11;
    case "I12":
      return a.I12;
    default:
      return a.other;
  }
}

/** 書き込みエンジンの内部コードだけの文言を、利用者が次にできることの分かる文にする */
export function describePlanError(e: unknown): string {
  if (!(e instanceof CommitInvariantError)) return m().advice.planFailed(e instanceof Error && e.message !== "" ? e.message : m().unknownError);
  const prefix = `[${e.code}] `;
  const detail = e.message.startsWith(prefix) ? e.message.slice(prefix.length) : e.message;
  return m().advice.withDetail(adviceFor(e.code, e.hint), e.code, detail);
}

/**
 * 計画を作る。I3 / I10 / I11 は「人の確認が要る」ことが分かればよいので、確認済みとして作り直して他の問題も見る。
 * それ以外の不変条件違反は error（blockers になる）。
 */
export function attemptPlan(
  meta: SheetMeta,
  records: readonly MaximoRecord[],
  changes: CommitChanges,
  confirmed: { allowNull?: boolean; deletesConfirmed?: boolean; irreversibleConfirmed?: boolean } = {},
): PlanAttempt {
  let allowNull = confirmed.allowNull === true;
  let deletesConfirmed = confirmed.deletesConfirmed === true;
  let irreversibleConfirmed = confirmed.irreversibleConfirmed === true;
  let needsNullConfirm = false;
  let needsDeleteConfirm = false;
  let needsIrreversibleConfirm = false;
  for (let i = 0; i < 4; i++) {
    try {
      const plans = planCommit(meta, [...records], changes, { allowNull, deletesConfirmed, irreversibleConfirmed });
      return { plans, needsDeleteConfirm, needsNullConfirm, needsIrreversibleConfirm, error: null };
    } catch (e) {
      if (e instanceof CommitInvariantError && e.code === "I10" && !allowNull) {
        needsNullConfirm = true;
        allowNull = true;
        continue;
      }
      if (e instanceof CommitInvariantError && e.code === "I3" && !deletesConfirmed) {
        needsDeleteConfirm = true;
        deletesConfirmed = true;
        continue;
      }
      if (e instanceof CommitInvariantError && e.code === "I11" && !irreversibleConfirmed) {
        needsIrreversibleConfirm = true;
        irreversibleConfirmed = true;
        continue;
      }
      return { plans: [], needsDeleteConfirm, needsNullConfirm, needsIrreversibleConfirm, error: describePlanError(e) };
    }
  }
  return { plans: [], needsDeleteConfirm, needsNullConfirm, needsIrreversibleConfirm, error: m().advice.other };
}

/** 「1 回の反映数」を、この回に送る親の数にする（すべてなら全件。数は 1 以上の整数に丸める。省くと既定の 200） */
export function batchSizeOf(batch: "all" | number | undefined, total: number): number {
  if (batch === "all") return total;
  const n = typeof batch === "number" && Number.isFinite(batch) ? Math.floor(batch) : DEFAULT_COMMIT_BATCH;
  return Math.min(total, Math.max(1, n));
}
