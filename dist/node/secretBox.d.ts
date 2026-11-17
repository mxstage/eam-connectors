export declare const SECRET_KEY_FILE = "connections.key";
/** キーチェーンの項目（macOS） */
export declare const KEYCHAIN_SERVICE = "MX Stage";
export declare const KEYCHAIN_ACCOUNT = "connections-master-key";
export type ProtectionKind = "dpapi" | "keychain" | "file";
/** 暗号文（すべて base64） */
export interface SealedSecret {
    iv: string;
    tag: string;
    data: string;
}
/** OS の道具を動かす口（試験で差し替える）。標準出力を返す。失敗したら例外 */
export type CommandRunner = (command: string, args: readonly string[], input: string) => Promise<string>;
export declare class SecretBoxError extends Error {
    readonly code: "unavailable" | "unreadable";
    constructor(code: "unavailable" | "unreadable", message: string);
}
/** 既定の口。出力が大きすぎる・時間がかかりすぎるものは失敗にする */
export declare const runCommand: CommandRunner;
/** DPAPI に渡すおまけの値（同じ利用者のほかのアプリが DPAPI で包んだものと取り違えないため） */
export declare const DPAPI_ENTROPY = "mxstage-connections";
export interface SecretBoxOptions {
    /** 状態フォルダ（既定 ~/.config/mxstage。stateDir()） */
    dir?: string;
    /** 既定は process.platform */
    platform?: NodeJS.Platform;
    run?: CommandRunner;
    /** キーチェーンの項目のサービス名（macOS。既定 "MX Stage"） */
    keychainService?: string;
    /** キーチェーンの項目のアカウント名（macOS。既定 "connections-master-key"） */
    keychainAccount?: string;
    /** DPAPI のおまけの値（Windows。既定 "mxstage-connections"） */
    dpapiEntropy?: string;
}
export declare class SecretBox {
    private readonly file;
    private readonly platform;
    private readonly run;
    private readonly keychainService;
    private readonly keychainAccount;
    private readonly dpapiEntropy;
    private master;
    private opening;
    constructor(opts: SecretBoxOptions);
    /** この PC で使う守り方 */
    kind(): ProtectionKind;
    seal(plain: string, aad: string): Promise<SealedSecret>;
    open(sealed: SealedSecret, aad: string): Promise<string>;
    /** マスター鍵。create が true なら、無ければ作る */
    private masterKey;
    private load;
    private unwrap;
    private readKeyFile;
    private writeKeyFile;
}
