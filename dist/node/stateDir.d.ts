/** 既定の状態フォルダの名前（~/.config の下） */
export declare const DEFAULT_STATE_DIR_NAME = "mxstage";
export interface StateDirOptions {
    /** ホームフォルダ（既定は os.homedir()） */
    home?: string;
    /** ~/.config の下のフォルダの名前（既定 "mxstage"。MOYAI も既定のまま共有する） */
    name?: string;
}
/** 状態フォルダの場所（作らない） */
export declare function stateDir(opts?: StateDirOptions): string;
