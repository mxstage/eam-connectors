// 保存の場所・キーチェーンの項目・DPAPI のおまけの値は、既定を MX Stage と同じにし、引数で差し替えられる。
import { mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ConnectionStore, MXSTAGE_DEMO_RESERVED, NO_RESERVED_CONNECTIONS, normalizeConnectionUrl } from "../src/node/connections.ts";
import { DPAPI_ENTROPY, KEYCHAIN_ACCOUNT, KEYCHAIN_SERVICE, SecretBox, type CommandRunner } from "../src/node/secretBox.ts";
import { LicenseStore } from "../src/node/licenseStore.ts";
import { DEFAULT_STATE_DIR_NAME, stateDir } from "../src/node/stateDir.ts";

const dirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "eamc-"));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe("状態フォルダ", () => {
  it("既定は ~/.config/mxstage（MX Stage と同じ）。ホームと名前を差し替えられる", () => {
    expect(DEFAULT_STATE_DIR_NAME).toBe("mxstage");
    expect(stateDir()).toBe(join(homedir(), ".config", "mxstage"));
    expect(stateDir({ home: "/h", name: "other" })).toBe(join("/h", ".config", "other"));
  });

  it("LicenseStore は dir を省くと状態フォルダの licenses を読む（書かない）", () => {
    expect(() => new LicenseStore({ keys: {} }).list()).not.toThrow();
  });
});

describe("SecretBox の名前", () => {
  it("既定はキーチェーン MX Stage / connections-master-key、DPAPI mxstage-connections", async () => {
    expect([KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, DPAPI_ENTROPY]).toEqual(["MX Stage", "connections-master-key", "mxstage-connections"]);
    const dir = tempDir();
    const calls: { args: readonly string[]; input: string }[] = [];
    let stored = "";
    const run: CommandRunner = async (_command, args, input) => {
      calls.push({ args, input });
      if (args[0] === "-i") {
        stored = /-w ([0-9a-f]{64})/.exec(input)?.[1] ?? "";
        return "";
      }
      return `${stored}\n`;
    };
    const box = new SecretBox({ dir, platform: "darwin", run });
    await box.seal("x", "aad");
    expect(calls[0]?.input).toContain('-s "MX Stage" -a "connections-master-key"');
    const win: { args: readonly string[] }[] = [];
    await new SecretBox({ dir: tempDir(), platform: "win32", run: async (_c, args, input) => (win.push({ args }), input) }).seal("x", "aad");
    expect(win[0]?.args.join(" ")).toContain("GetBytes('mxstage-connections')");
  });

  it("差し替えた名前を使う。引用符や改行は受けない", async () => {
    const calls: { args: readonly string[]; input: string }[] = [];
    const run: CommandRunner = async (_c, args, input) => (calls.push({ args, input }), args[0] === "-i" ? "" : input);
    await new SecretBox({ dir: tempDir(), platform: "darwin", run, keychainService: "MOYAI Test", keychainAccount: "k1" }).seal("x", "aad");
    expect(calls[0]?.input).toContain('-s "MOYAI Test" -a "k1"');
    calls.length = 0;
    await new SecretBox({ dir: tempDir(), platform: "win32", run, dpapiEntropy: "moyai-x" }).seal("x", "aad");
    expect(calls[0]?.args.join(" ")).toContain("GetBytes('moyai-x')");
    expect(() => new SecretBox({ dir: tempDir(), keychainService: 'a" -w x' })).toThrow(TypeError);
    expect(() => new SecretBox({ dir: tempDir(), dpapiEntropy: "a');evil('" })).toThrow(TypeError);
  });
});

describe("予約の接続先", () => {
  it("既定は MX Stage のデモ（*.mxstage.invalid と demo-ja・demo-en）", async () => {
    expect(normalizeConnectionUrl("https://demo-ja.mxstage.invalid")).toBeNull();
    expect(normalizeConnectionUrl("https://demo-ja.mxstage.invalid", NO_RESERVED_CONNECTIONS)).toBe("https://demo-ja.mxstage.invalid");
    const dir = tempDir();
    const store = new ConnectionStore({ dir, box: new SecretBox({ dir, platform: "linux" }) });
    expect(store.useDemo("demo-ja")).toBe(true);
    expect(store.list().lastUsedId).toBe("demo-ja");
    expect(MXSTAGE_DEMO_RESERVED.isReservedId("demo-en")).toBe(true);
  });

  it("予約を外すと、デモの ID は受けない", () => {
    const dir = tempDir();
    const store = new ConnectionStore({ dir, box: new SecretBox({ dir, platform: "linux" }), reserved: NO_RESERVED_CONNECTIONS });
    expect(store.useDemo("demo-ja")).toBe(false);
  });
});
