import type { AuthorizeProblem, LicenseEntry, LicenseProblem } from "../license/key.ts";
import type { LicensePublicKey } from "../license/publicKeys.ts";
export type { AuthorizeProblem, LicenseEntry, LicenseProblem } from "../license/key.ts";
/** キーを置くフォルダ（状態フォルダの下） */
export declare const LICENSES_DIR_NAME = "licenses";
/** "1" のとき、決済の試験用の鍵（s1）で署名したキーも受け付ける */
export declare const LICENSE_TEST_ENV = "MXSTAGE_LICENSE_TEST";
/** 置けるキーの数の上限 */
export declare const MAX_LICENSES = 50;
export type SaveResult = {
    ok: true;
    license: LicenseEntry;
} | {
    ok: false;
    problem: LicenseProblem;
};
export type AuthorizeResult = {
    ok: true;
    host: string;
    license: LicenseEntry;
} | {
    ok: false;
    problem: AuthorizeProblem;
    host: string | null;
    licensedHosts: string[];
};
export interface LicenseStoreOptions {
    /** 状態フォルダ（既定 ~/.config/mxstage。stateDir()） */
    dir?: string;
    /** 決済の試験用の鍵も受け付けるか（MXSTAGE_LICENSE_TEST=1） */
    allowTestKeys?: boolean;
    /** 公開鍵（試験で差し替える） */
    keys?: Readonly<Record<string, LicensePublicKey>>;
    revoked?: ReadonlySet<string>;
    /** 今の時刻（ミリ秒。試験で差し替える） */
    now?: () => number;
    /** ファイルに置かずに使うキー（開発用。--dev-license のときリポジトリの dev/*.license.key を読む） */
    bundled?: readonly string[];
}
/** 開発用のキーを置くフォルダ（リポジトリの根から）と、ファイル名の終わり */
export declare const DEV_LICENSE_DIR = "dev";
export declare const DEV_LICENSE_SUFFIX = ".license.key";
/** リポジトリの開発用のキー（dev/*.license.key）を読む。試験用の鍵のキーだけで、偽の Maximo にだけ使える */
export declare function readDevLicenses(repoRoot: string, log?: (line: string) => void): string[];
/** 環境変数から、決済の試験用の鍵を受け付けるかを読む */
export declare function licenseTestKeysAllowed(env?: NodeJS.ProcessEnv): boolean;
export declare class LicenseStore {
    private readonly folder;
    private readonly allowTestKeys;
    private readonly keys;
    private readonly revoked;
    private readonly now;
    private readonly keyObjects;
    private readonly bundled;
    constructor(opts?: LicenseStoreOptions);
    private publicKey;
    /** キーを読み、署名・鍵・期限・取り消しを確かめる */
    private check;
    private entryOf;
    /** ファイルに置いてあるキーと、開発用に読んだキー */
    private all;
    /** 置いてあるキー（ファイル名のライセンスの ID と、確かめた結果） */
    private saved;
    /** 置いてあるキーの状態（ライセンスの ID の順。開発用に読んだキーは最後） */
    list(): LicenseEntry[];
    /**
     * キーを保存する。署名が正しく、期限内で取り消されていないキーだけを保存する。
     * 同じライセンス（更新したキー）は新しいほうで置き換え、古いキーでは置き換えない。
     */
    save(text: string): SaveResult;
    /** キーを外す（置いていなければ何もしない）。外したら true */
    remove(licenseId: string): boolean;
    /**
     * 本番の接続先に反映してよいか。接続先のホストが、期限内のキーの本番の接続先に含まれていればよい。
     * 作業画面が本番に反映する直前に呼ぶ。
     */
    authorize(baseUrl: string): AuthorizeResult;
}
