// 画面に依らない反映の関門（src/license）。localStorage は外から渡す（ブラウザでなくても使える）。
import { describe, expect, it } from "vitest";
import { ENVIRONMENTS_STORAGE_KEY, LicenseClient, type EnvironmentStorage } from "../src/license/client.ts";
import { authorizeFailure, environmentBadge, licenseBlocker } from "../src/license/gate.ts";
import type { LicenseEntry } from "../src/license/key.ts";

function memoryStorage(): EnvironmentStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

const PROD = "https://maximo.acme.example";
const VALID: LicenseEntry = { state: "valid", licenseId: "lic_1", org: "ACME", hosts: [PROD], expiresAt: "2027-01-01T00:00:00.000Z" };

/** 橋渡しの入口の偽物（パス → 応答） */
function bridge(routes: Record<string, { status: number; json: unknown }>, calls: string[] = []): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const path = String(input).replace(/\?.*$/, "");
    calls.push(path);
    const r = routes[path] ?? { status: 404, json: {} };
    return new Response(JSON.stringify(r.json), { status: r.status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

describe("LicenseClient（headless）", () => {
  it("申告は渡した storage に、既定のキー（mxstage.maximo.environments）で覚える", () => {
    const storage = memoryStorage();
    const gate = new LicenseClient({ storage, fetch: bridge({}) });
    expect(gate.environmentOf("https://dev.example")).toBeNull();
    gate.declare("https://dev.example/", "test");
    expect(ENVIRONMENTS_STORAGE_KEY).toBe("mxstage.maximo.environments");
    expect(JSON.parse(storage.data.get(ENVIRONMENTS_STORAGE_KEY)!)).toEqual({ "https://dev.example": "test" });
    expect(gate.environmentOf("https://dev.example")).toBe("test");
  });

  it("キーと入口と常にテストの接続先は差し替えられる", async () => {
    const storage = memoryStorage();
    const calls: string[] = [];
    const gate = new LicenseClient({
      storage,
      storageKey: "moyai.environments",
      isBuiltInTest: (u) => u.startsWith("https://sandbox."),
      endpoints: { list: "/api/license" },
      fetch: bridge({ "/api/license": { status: 200, json: { licenses: [VALID] } } }, calls),
    });
    gate.declare("https://x.example", "production");
    expect(storage.data.has("moyai.environments")).toBe(true);
    expect(gate.environmentOf("https://sandbox.example")).toBe("test");
    // 既定ではデモのオリジンが常にテスト
    expect(new LicenseClient({}).environmentOf("https://demo-en.mxstage.invalid")).toBe("test");
    await gate.refresh();
    expect(calls).toEqual(["/api/license"]);
    expect(gate.environmentOf(PROD)).toBe("production");
  });

  it("本番の反映の関門と札", async () => {
    const gate = new LicenseClient({ storage: memoryStorage(), fetch: bridge({ "/_mxstage/license": { status: 200, json: { licenses: [VALID] } } }) });
    expect(licenseBlocker(gate, "https://other.example")).toContain("本番");
    gate.declare("https://other.example", "production");
    await gate.refresh();
    expect(licenseBlocker(gate, PROD)).toBeNull();
    expect(licenseBlocker(gate, "https://other.example")).toContain("other.example");
    gate.declare("https://t.example", "test");
    expect(licenseBlocker(gate, "https://t.example")).toBeNull();
    expect(environmentBadge(gate, PROD, Date.parse("2026-12-20T00:00:00Z"))).toMatchObject({ kind: "licensed", expiresInDays: 12 });
    expect(environmentBadge(gate, "https://other.example", 0).kind).toBe("readonly");
    expect(authorizeFailure({ ok: false, problem: "expired", licensedHosts: [] }, PROD)).toContain("maximo.acme.example");
  });

  it("橋渡しが答えなければ unavailable", async () => {
    const gate = new LicenseClient({ fetch: (async () => { throw new Error("down"); }) as typeof fetch });
    await gate.refresh();
    expect(gate.snapshot().status).toBe("unavailable");
    expect(await gate.authorize(PROD)).toMatchObject({ ok: false, problem: "unavailable" });
  });
});
