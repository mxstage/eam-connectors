// 保存した接続先（src/bridge/connections.ts・secretBox.ts）と、その入口（/_mxstage/connections・/mx の X-Maximo-Connection）。
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import type { ClientRequest, IncomingMessage } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { ConnectionStore, normalizeConnectionUrl } from "../src/node/connections.ts";
import type { UpstreamRequest } from "../src/node/mx.ts";
import { SecretBox, type CommandRunner } from "../src/node/secretBox.ts";
import { rawRequest, startTestBridge, stopAll } from "./support.ts";

const dirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "mxs-conn-"));
  dirs.push(dir);
  return dir;
}

afterEach(async () => {
  await stopAll();
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

/** OS の保護を使わない（ファイルの鍵）。試験の PC の DPAPI・キーチェーンには触らない */
function fileStore(dir = tempDir(), now = () => 1_000): ConnectionStore {
  return new ConnectionStore({ dir, now, box: new SecretBox({ dir, platform: "linux" }) });
}

const KEY = "SECRET-api-key-123";

describe("接続先の保存", () => {
  it("保存して一覧に出す。API キーは一覧にもファイルにも平文で出さない", async () => {
    const dir = tempDir();
    const store = fileStore(dir);
    const saved = await store.save({ name: " dev ", baseUrl: "https://maximo.example.com/", environment: "test", apiKey: KEY });
    expect(saved).toMatchObject({ ok: true, connection: { name: "dev", baseUrl: "https://maximo.example.com", environment: "test" } });
    const list = store.list();
    expect(list.connections).toHaveLength(1);
    expect(list.protection).toBe("file");
    expect(JSON.stringify(list)).not.toContain(KEY);
    expect(readFileSync(join(dir, "connections.json"), "utf8")).not.toContain(KEY);
  });

  it("別のプロセス（新しい ConnectionStore）でもキーを開ける", async () => {
    const dir = tempDir();
    const saved = await fileStore(dir).save({ name: "dev", baseUrl: "https://maximo.example.com", environment: null, apiKey: KEY });
    if (!saved.ok) throw new Error("保存できませんでした");
    const resolved = await fileStore(dir).resolve(saved.connection.id);
    expect(resolved).toEqual({ ok: true, origin: "https://maximo.example.com", apiKey: KEY });
  });

  it("直すときに API キーを省けば前のキーのまま、渡せば入れ替える", async () => {
    const store = fileStore();
    const saved = await store.save({ name: "dev", baseUrl: "https://a.example.com", environment: "test", apiKey: KEY });
    if (!saved.ok) throw new Error("保存できませんでした");
    const id = saved.connection.id;
    await store.save({ id, name: "dev2", baseUrl: "https://b.example.com", environment: "production" });
    expect(await store.resolve(id)).toEqual({ ok: true, origin: "https://b.example.com", apiKey: KEY });
    expect(store.list().connections[0]).toMatchObject({ name: "dev2", environment: "production" });
    await store.save({ id, name: "dev2", baseUrl: "https://b.example.com", environment: "production", apiKey: "NEW-KEY" });
    expect(await store.resolve(id)).toMatchObject({ apiKey: "NEW-KEY" });
  });

  it("正しくない入力は保存しない", async () => {
    const store = fileStore();
    expect(await store.save({ name: "", baseUrl: "https://a.example.com", environment: null, apiKey: KEY })).toEqual({ ok: false, problem: "invalid_name" });
    expect(await store.save({ name: "x", baseUrl: "http://a.example.com", environment: null, apiKey: KEY })).toEqual({ ok: false, problem: "invalid_url" });
    expect(await store.save({ name: "x", baseUrl: "https://a.example.com/maximo", environment: null, apiKey: KEY })).toEqual({ ok: false, problem: "invalid_url" });
    expect(await store.save({ name: "x", baseUrl: "https://a.example.com", environment: null, apiKey: "has space" })).toEqual({ ok: false, problem: "invalid_key" });
    expect(await store.save({ name: "x", baseUrl: "https://a.example.com", environment: null })).toEqual({ ok: false, problem: "key_required" });
    expect(await store.save({ id: "c_0000000000000000", name: "x", baseUrl: "https://a.example.com", environment: null, apiKey: KEY })).toEqual({ ok: false, problem: "not_found" });
    expect(store.list().connections).toHaveLength(0);
  });

  it("最後に使った接続先を覚え、消したら忘れる", async () => {
    const store = fileStore();
    const a = await store.save({ name: "a", baseUrl: "https://a.example.com", environment: null, apiKey: KEY });
    const b = await store.save({ name: "b", baseUrl: "https://b.example.com", environment: null, apiKey: KEY });
    if (!a.ok || !b.ok) throw new Error("保存できませんでした");
    expect(store.use(b.connection.id)).toMatchObject({ id: b.connection.id, lastUsedAt: 1_000 });
    expect(store.list().lastUsedId).toBe(b.connection.id);
    expect(store.remove(b.connection.id)).toBe(true);
    expect(store.list().lastUsedId).toBeNull();
    expect(await store.resolve(b.connection.id)).toEqual({ ok: false, problem: "not_found" });
    expect(store.remove(b.connection.id)).toBe(false);
  });

  it("URL は https://host[:port] だけ", () => {
    expect(normalizeConnectionUrl("https://m.example.com:9443/")).toBe("https://m.example.com:9443");
    expect(normalizeConnectionUrl("https://m.example.com/maximo")).toBeNull();
    expect(normalizeConnectionUrl("https://u:p@m.example.com")).toBeNull();
    expect(normalizeConnectionUrl("not a url")).toBeNull();
  });
});

describe("OS の保護（secretBox）", () => {
  it("Windows では DPAPI（PowerShell）で鍵を包む。鍵は標準入力で渡し、コマンドラインに載せない", async () => {
    const dir = tempDir();
    const calls: { command: string; args: readonly string[]; input: string }[] = [];
    // 包む・開くの代わりに base64 をそのまま返す偽物
    const run: CommandRunner = async (command, args, input) => {
      calls.push({ command, args, input });
      return input;
    };
    const store = new ConnectionStore({ dir, box: new SecretBox({ dir, platform: "win32", run }) });
    const saved = await store.save({ name: "dev", baseUrl: "https://a.example.com", environment: null, apiKey: KEY });
    if (!saved.ok) throw new Error("保存できませんでした");
    expect(calls[0]?.command).toBe("powershell.exe");
    expect(calls[0]?.args.join(" ")).toContain("Protect");
    const master = calls[0]?.input ?? "";
    expect(calls[0]?.args.join(" ")).not.toContain(master);
    expect(JSON.parse(readFileSync(join(dir, "connections.key"), "utf8"))).toMatchObject({ version: 1, kind: "dpapi" });

    // 新しいプロセスでは 1 回だけ開く（開いた鍵はメモリに置く）
    const fresh = new ConnectionStore({ dir, box: new SecretBox({ dir, platform: "win32", run }) });
    expect(await fresh.resolve(saved.connection.id)).toMatchObject({ ok: true, apiKey: KEY });
    expect(await fresh.resolve(saved.connection.id)).toMatchObject({ ok: true, apiKey: KEY });
    expect(calls.filter((c) => c.args.join(" ").includes("Unprotect"))).toHaveLength(1);
  });

  it("macOS ではキーチェーンに置き、ファイルには印だけを書く", async () => {
    const dir = tempDir();
    let stored = "";
    const run: CommandRunner = async (command, args, input) => {
      expect(command).toBe("/usr/bin/security");
      if (args[0] === "-i") {
        stored = /-w ([0-9a-f]{64})/.exec(input)?.[1] ?? "";
        return "";
      }
      return `${stored}\n`;
    };
    const saved = await new ConnectionStore({ dir, box: new SecretBox({ dir, platform: "darwin", run }) }).save({ name: "dev", baseUrl: "https://a.example.com", environment: null, apiKey: KEY });
    if (!saved.ok) throw new Error("保存できませんでした");
    expect(stored).toHaveLength(64);
    const keyFile = readFileSync(join(dir, "connections.key"), "utf8");
    expect(keyFile).not.toContain(stored);
    const fresh = new ConnectionStore({ dir, box: new SecretBox({ dir, platform: "darwin", run }) });
    expect(await fresh.resolve(saved.connection.id)).toMatchObject({ ok: true, apiKey: KEY });
  });

  it("OS が保護できなければ保存しない。別の PC・利用者の鍵では開けない", async () => {
    const dir = tempDir();
    const failing: CommandRunner = async () => {
      throw new Error("no powershell");
    };
    const store = new ConnectionStore({ dir, box: new SecretBox({ dir, platform: "win32", run: failing }) });
    expect(await store.save({ name: "dev", baseUrl: "https://a.example.com", environment: null, apiKey: KEY })).toEqual({ ok: false, problem: "unavailable" });

    const ok: CommandRunner = async (_c, _a, input) => input;
    const saved = await new ConnectionStore({ dir, box: new SecretBox({ dir, platform: "win32", run: ok }) }).save({ name: "dev", baseUrl: "https://a.example.com", environment: null, apiKey: KEY });
    if (!saved.ok) throw new Error("保存できませんでした");
    const other = new ConnectionStore({ dir, box: new SecretBox({ dir, platform: "win32", run: failing }) });
    expect(await other.resolve(saved.connection.id)).toEqual({ ok: false, problem: "unreadable" });
  });
});

interface Captured {
  options: Record<string, unknown> | null;
}

function fakeUpstream(capture: Captured): UpstreamRequest {
  return (options, onResponse) => {
    capture.options = options as unknown as Record<string, unknown>;
    const req = new PassThrough();
    const res = new PassThrough() as unknown as IncomingMessage & PassThrough;
    (res as unknown as { statusCode: number }).statusCode = 200;
    (res as unknown as { headers: Record<string, string> }).headers = { "content-type": "application/json" };
    setTimeout(() => {
      onResponse(res as unknown as IncomingMessage);
      res.end(JSON.stringify({ userName: "MAXADMIN" }));
    }, 0);
    return req as unknown as ClientRequest;
  };
}

const JSON_HEADERS = { "content-type": "application/json", "sec-fetch-site": "same-origin" };
