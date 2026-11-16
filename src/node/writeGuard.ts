// A guard for the /mx relay: every write (POST) to a production Maximo must pass LicenseStore.authorize.
//
// MX Stage checks the license in its work screen (the commit gate and POST /_mxstage/license/authorize) and its relay
// does not check writes, so MX Stage leaves this off. Other hosts (MOYAI) turn it on by passing the guard to
// handleMaximoProxy({ writeGuard }). Off by default; safe by default when on: an origin is production unless the
// caller says it is a test environment, and an undeclared environment (null) cannot be written to.
//
// 中継（/mx）の書き込みの守り。本番の接続先への書き込み（POST）は必ず LicenseStore.authorize を通す。

import type { AuthorizeResult, LicenseStore } from "./licenseStore.ts";
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

/** 断った理由の文（英語。値・キーは含めない） */
function refusal(result: Extract<AuthorizeResult, { ok: false }>): WriteGuardDecision {
  const host = result.host ?? "this Maximo";
  switch (result.problem) {
    case "expired":
      return { ok: false, problem: "expired", message: `The license for ${host} has expired. Writes to this production Maximo are blocked.` };
    case "revoked":
      return { ok: false, problem: "revoked", message: `The license for ${host} has been revoked. Writes to this production Maximo are blocked.` };
    case "bad_scope":
      return { ok: false, problem: "bad_scope", message: "The Maximo URL cannot be matched to a license." };
    default:
      return { ok: false, problem: result.problem, message: `Writing to a production Maximo needs a license. ${host} is not covered by a license key on this PC.` };
  }
}

/** 本番の接続先に書いてよいか（書き込みの直前に呼ぶ） */
export function authorizeWrite(licenses: Pick<LicenseStore, "authorize">, origin: string, environment: WriteEnvironment | null = "production"): WriteGuardDecision {
  if (environment === "test") return { ok: true };
  if (environment === null) return { ok: false, problem: "undeclared", message: "Declare whether this Maximo is production or test before writing to it." };
  const result = licenses.authorize(origin);
  return result.ok ? { ok: true } : refusal(result);
}

/** handleMaximoProxy の writeGuard に渡す守りを作る */
export function createLicenseWriteGuard(opts: LicenseWriteGuardOptions): WriteGuard {
  return (origin) => authorizeWrite(opts.licenses, origin, opts.environmentOf ? opts.environmentOf(origin) : "production");
}
