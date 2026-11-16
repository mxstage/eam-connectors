// 中継（/mx）の書き込みの守り（src/node/writeGuard.ts・handleMaximoProxy の writeGuard）。既定は切ってある。
import { PassThrough } from "node:stream";
import type { ClientRequest, IncomingMessage } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { AuthorizeResult } from "../src/node/licenseStore.ts";
import { authorizeWrite, createLicenseWriteGuard } from "../src/node/writeGuard.ts";
import type { UpstreamRequest } from "../src/node/mx.ts";
import { rawRequest, startTestBridge, stopAll } from "./support.ts";

afterEach(async () => {
  await stopAll();
});

const BASE = "https://maximo.prod.example";
const HEADERS = { "x-maximo-base": BASE, "x-maximo-apikey": "SECRET-KEY", "content-type": "application/json" };

function upstream(log: string[]): UpstreamRequest {
  return (options, onResponse) => {
    log.push(`${String(options.method)} ${String(options.path)}`);
    const req = new PassThrough();
    const res = new PassThrough() as unknown as IncomingMessage & PassThrough;
    (res as unknown as { statusCode: number }).statusCode = 200;
    (res as unknown as { headers: Record<string, string> }).headers = { "content-type": "application/json" };
    setTimeout(() => {
      onResponse(res as unknown as IncomingMessage);
      res.end("{}");
    }, 0);
    return req as unknown as ClientRequest;
  };
}

function licenses(result: (origin: string) => AuthorizeResult, calls: string[] = []) {
  return {
    authorize(baseUrl: string): AuthorizeResult {
      calls.push(baseUrl);
      return result(baseUrl);
    },
  };
}

const granted = (host: string): AuthorizeResult => ({ ok: true, host, license: { state: "valid", licenseId: "lic_1", hosts: [host] } });
const refused = (host: string): AuthorizeResult => ({ ok: false, problem: "not_licensed", host, licensedHosts: [] });

describe("authorizeWrite", () => {
  it("テストの接続先はキーを見ずに通す。申告の無い接続先は書かせない", () => {
    const calls: string[] = [];
    const store = licenses(refused, calls);
    expect(authorizeWrite(store, BASE, "test")).toEqual({ ok: true });
    expect(authorizeWrite(store, BASE, null)).toMatchObject({ ok: false, problem: "undeclared" });
    expect(calls).toEqual([]);
  });

  it("本番の接続先は LicenseStore.authorize を必ず通す", () => {
    const calls: string[] = [];
    expect(authorizeWrite(licenses(granted, calls), BASE)).toEqual({ ok: true });
    expect(authorizeWrite(licenses(refused, calls), BASE)).toMatchObject({ ok: false, problem: "not_licensed" });
    expect(authorizeWrite(licenses((h) => ({ ok: false, problem: "expired", host: h, licensedHosts: [] })), BASE, "production")).toMatchObject({ ok: false, problem: "expired" });
    expect(calls).toEqual([BASE, BASE]);
  });
});

describe("handleMaximoProxy の writeGuard", () => {
  it("守りが無ければ（MX Stage の既定）、書き込みもそのまま送る", async () => {
    const log: string[] = [];
    const bridge = await startTestBridge({ requestImpl: upstream(log) });
    const res = await rawRequest(bridge, "/mx/maximo/api/os/mxapiwo", { method: "POST", headers: HEADERS, body: "{}" });
    expect(res.status).toBe(200);
    expect(log).toEqual(["POST /maximo/api/os/mxapiwo"]);
  });

  it("鍵の無い本番への書き込みは上流へ送らずに 403 で断る。読むのは守らない", async () => {
    const log: string[] = [];
    const calls: string[] = [];
    const bridge = await startTestBridge({ requestImpl: upstream(log), writeGuard: createLicenseWriteGuard({ licenses: licenses(refused, calls) }) });
    const post = await rawRequest(bridge, "/mx/maximo/api/os/mxapiwo", { method: "POST", headers: HEADERS, body: JSON.stringify({ description: "x" }) });
    expect(post.status).toBe(403);
    expect(JSON.parse(post.body)).toMatchObject({ ok: false, error: "write_not_authorized" });
    expect(post.body).not.toContain("SECRET-KEY");
    const get = await rawRequest(bridge, "/mx/maximo/api/os/mxapiwo?lean=1", { headers: HEADERS });
    expect(get.status).toBe(200);
    expect(log).toEqual(["GET /maximo/api/os/mxapiwo?lean=1"]);
    expect(calls).toEqual([BASE]);
  });

  it("鍵のある本番と、テストと申告した接続先には書ける", async () => {
    const log: string[] = [];
    const guard = createLicenseWriteGuard({ licenses: licenses((h) => (h === BASE ? granted(h) : refused(h))), environmentOf: (o) => (o === "https://maximo.test.example" ? "test" : "production") });
    const bridge = await startTestBridge({ requestImpl: upstream(log), writeGuard: guard });
    expect((await rawRequest(bridge, "/mx/maximo/api/os/mxapiwo", { method: "POST", headers: HEADERS, body: "{}" })).status).toBe(200);
    const testHeaders = { ...HEADERS, "x-maximo-base": "https://maximo.test.example" };
    expect((await rawRequest(bridge, "/mx/maximo/api/os/mxapiwo", { method: "POST", headers: testHeaders, body: "{}" })).status).toBe(200);
    const other = { ...HEADERS, "x-maximo-base": "https://maximo.other.example" };
    expect((await rawRequest(bridge, "/mx/maximo/api/os/mxapiwo", { method: "POST", headers: other, body: "{}" })).status).toBe(403);
    expect(log).toHaveLength(2);
  });

  it("守りが例外を投げたら書かない", async () => {
    const log: string[] = [];
    const bridge = await startTestBridge({
      requestImpl: upstream(log),
      writeGuard: () => {
        throw new Error("boom");
      },
    });
    const res = await rawRequest(bridge, "/mx/maximo/api/os/mxapiwo", { method: "POST", headers: HEADERS, body: "{}" });
    expect(res.status).toBe(403);
    expect(log).toEqual([]);
  });

  it("予約のホストは差し替えられる（既定は *.mxstage.invalid）", async () => {
    const log: string[] = [];
    const def = await startTestBridge({ requestImpl: upstream(log) });
    const demo = { ...HEADERS, "x-maximo-base": "https://demo-ja.mxstage.invalid" };
    expect((await rawRequest(def, "/mx/maximo/api/os/mxapiwo", { headers: demo })).status).toBe(400);
    const open = await startTestBridge({ requestImpl: upstream(log), isReservedHost: () => false });
    expect((await rawRequest(open, "/mx/maximo/api/os/mxapiwo", { headers: demo })).status).toBe(200);
  });
});
