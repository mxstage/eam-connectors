// 保存する API キーの暗号化（橋渡しの中だけ）。
// - API キーは AES-256-GCM で暗号化して connections.json に置く。暗号化の鍵（マスター鍵・32 バイトの乱数）は OS に守らせる:
//     Windows: DPAPI（CurrentUser）で包んで connections.key に置く。同じ Windows の利用者でないと開けない（別の PC・別の利用者に写しても読めない）
//     macOS:   キーチェーン（サービス名 "MX Stage"）に置き、connections.key にはその印だけを書く
//     そのほか: connections.key（パーミッション 600）にそのまま置く（OS の保護は無い）
// - マスター鍵は最初に使うときに 1 回だけ開き、プロセスのメモリに置く。鍵・API キーをログにもエラー文にも出さない。
// - OS の道具（PowerShell・security）には鍵を標準入力で渡す（コマンドラインに載せない。ほかのプロセスから見えるため）。
import { spawn } from "node:child_process";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { stateDir } from "./stateDir.js";
export const SECRET_KEY_FILE = "connections.key";
/** キーチェーンの項目（macOS） */
export const KEYCHAIN_SERVICE = "MX Stage";
export const KEYCHAIN_ACCOUNT = "connections-master-key";
export class SecretBoxError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = "SecretBoxError";
        this.code = code;
    }
}
const COMMAND_TIMEOUT_MS = 30_000;
/** 既定の口。出力が大きすぎる・時間がかかりすぎるものは失敗にする */
export const runCommand = (command, args, input) => new Promise((resolve, reject) => {
    const child = spawn(command, [...args], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let out = "";
    const timer = setTimeout(() => {
        child.kill();
        reject(new Error("timeout"));
    }, COMMAND_TIMEOUT_MS);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (d) => {
        out += d;
        if (out.length > 64 * 1024)
            child.kill();
    });
    // 標準エラーは読み捨てる（中身を外に出さない）
    child.stderr.resume();
    child.on("error", (e) => {
        clearTimeout(timer);
        reject(e);
    });
    child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0)
            resolve(out);
        else
            reject(new Error(`exit ${code ?? "?"}`));
    });
    child.stdin.on("error", () => undefined);
    child.stdin.end(input);
});
/** DPAPI に渡すおまけの値（同じ利用者のほかのアプリが DPAPI で包んだものと取り違えないため） */
export const DPAPI_ENTROPY = "mxstage-connections";
/** 上書きする名前（キーチェーンの項目・DPAPI のおまけの値）に使える文字。OS の道具に渡す文に埋め込むので、引用符・改行は使わせない */
const OS_NAME_RE = /^[A-Za-z0-9 ._-]{1,64}$/;
function psPrefix(entropy) {
    return "$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Security;" + `$e=[Text.Encoding]::UTF8.GetBytes('${entropy}');` + "$d=[Convert]::FromBase64String([Console]::In.ReadToEnd().Trim());";
}
function psProtect(entropy) {
    return `${psPrefix(entropy)}[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($d,$e,'CurrentUser'))`;
}
function psUnprotect(entropy) {
    return `${psPrefix(entropy)}[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Unprotect($d,$e,'CurrentUser'))`;
}
function osName(value, fallback, what) {
    if (value === undefined)
        return fallback;
    if (!OS_NAME_RE.test(value))
        throw new TypeError(`${what} must be 1-64 characters of letters, digits, space, '.', '_' or '-'`);
    return value;
}
const PS_ARGS = ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command"];
export class SecretBox {
    file;
    platform;
    run;
    keychainService;
    keychainAccount;
    dpapiEntropy;
    master = null;
    opening = null;
    constructor(opts) {
        this.file = join(opts.dir ?? stateDir(), SECRET_KEY_FILE);
        this.platform = opts.platform ?? process.platform;
        this.run = opts.run ?? runCommand;
        this.keychainService = osName(opts.keychainService, KEYCHAIN_SERVICE, "keychainService");
        this.keychainAccount = osName(opts.keychainAccount, KEYCHAIN_ACCOUNT, "keychainAccount");
        this.dpapiEntropy = osName(opts.dpapiEntropy, DPAPI_ENTROPY, "dpapiEntropy");
    }
    /** この PC で使う守り方 */
    kind() {
        if (this.platform === "win32")
            return "dpapi";
        if (this.platform === "darwin")
            return "keychain";
        return "file";
    }
    async seal(plain, aad) {
        const key = await this.masterKey(true);
        const iv = randomBytes(12);
        const cipher = createCipheriv("aes-256-gcm", key, iv);
        cipher.setAAD(Buffer.from(aad, "utf8"));
        const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
        return { iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") };
    }
    async open(sealed, aad) {
        const key = await this.masterKey(false);
        try {
            const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(sealed.iv, "base64"));
            decipher.setAAD(Buffer.from(aad, "utf8"));
            decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
            return Buffer.concat([decipher.update(Buffer.from(sealed.data, "base64")), decipher.final()]).toString("utf8");
        }
        catch {
            throw new SecretBoxError("unreadable", "The saved API key cannot be decrypted on this PC.");
        }
    }
    /** マスター鍵。create が true なら、無ければ作る */
    async masterKey(create) {
        if (this.master)
            return this.master;
        if (!this.opening) {
            this.opening = this.load(create).finally(() => {
                this.opening = null;
            });
        }
        const key = await this.opening;
        this.master = key;
        return key;
    }
    async load(create) {
        const existing = this.readKeyFile();
        if (existing)
            return this.unwrap(existing);
        if (!create)
            throw new SecretBoxError("unreadable", "No key to decrypt saved API keys was found on this PC.");
        const key = randomBytes(32);
        const kind = this.kind();
        let record;
        try {
            if (kind === "dpapi") {
                const wrapped = (await this.run("powershell.exe", [...PS_ARGS, psProtect(this.dpapiEntropy)], key.toString("base64"))).trim();
                if (!/^[A-Za-z0-9+/=]+$/.test(wrapped))
                    throw new Error("bad output");
                record = { version: 1, kind, value: wrapped };
            }
            else if (kind === "keychain") {
                // security -i は標準入力のコマンドを読む（鍵をコマンドラインに載せない）。16 進なので引用符は要らない
                await this.run("/usr/bin/security", ["-i"], `add-generic-password -U -s "${this.keychainService}" -a "${this.keychainAccount}" -w ${key.toString("hex")}\n`);
                record = { version: 1, kind };
            }
            else {
                record = { version: 1, kind, value: key.toString("base64") };
            }
        }
        catch {
            throw new SecretBoxError("unavailable", "The OS could not protect the key for saved API keys.");
        }
        this.writeKeyFile(record);
        return key;
    }
    async unwrap(record) {
        try {
            let key;
            if (record.kind === "dpapi") {
                if (this.platform !== "win32" || !record.value)
                    throw new Error("not here");
                key = Buffer.from((await this.run("powershell.exe", [...PS_ARGS, psUnprotect(this.dpapiEntropy)], record.value)).trim(), "base64");
            }
            else if (record.kind === "keychain") {
                if (this.platform !== "darwin")
                    throw new Error("not here");
                key = Buffer.from((await this.run("/usr/bin/security", ["find-generic-password", "-s", this.keychainService, "-a", this.keychainAccount, "-w"], "")).trim(), "hex");
            }
            else {
                key = Buffer.from(record.value ?? "", "base64");
            }
            if (key.length !== 32)
                throw new Error("bad key");
            return key;
        }
        catch {
            throw new SecretBoxError("unreadable", "The saved API keys cannot be decrypted on this PC (they were saved by another user or PC).");
        }
    }
    readKeyFile() {
        if (!existsSync(this.file))
            return null;
        try {
            const v = JSON.parse(readFileSync(this.file, "utf8"));
            if (v.version === 1 && (v.kind === "dpapi" || v.kind === "keychain" || v.kind === "file"))
                return v;
        }
        catch {
            // 壊れていれば読めないものとして扱う（作り直すと、保存済みのキーが開けなくなるので上書きしない）
        }
        throw new SecretBoxError("unreadable", `${SECRET_KEY_FILE} is damaged.`);
    }
    writeKeyFile(record) {
        mkdirSync(dirname(this.file), { recursive: true });
        const tmp = `${this.file}.${process.pid}.tmp`;
        writeFileSync(tmp, `${JSON.stringify(record)}\n`, { mode: 0o600 });
        try {
            chmodSync(tmp, 0o600);
        }
        catch {
            // Windows ではパーミッションを付けられない（DPAPI が守る）
        }
        renameSync(tmp, this.file);
    }
}
