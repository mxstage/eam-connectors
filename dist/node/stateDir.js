// The state folder shared by MX Stage and MOYAI: ~/.config/mxstage on every OS
// (on Windows %USERPROFILE%\.config\mxstage — not %LOCALAPPDATA%, which MSIX-packaged hosts redirect).
// 状態フォルダ（接続先・暗号の鍵・ライセンスキーの置き場所）。既定は MX Stage と同じ ~/.config/mxstage。
import { homedir } from "node:os";
import { join } from "node:path";
/** 既定の状態フォルダの名前（~/.config の下） */
export const DEFAULT_STATE_DIR_NAME = "mxstage";
/** 状態フォルダの場所（作らない） */
export function stateDir(opts = {}) {
    return join(opts.home ?? homedir(), ".config", opts.name ?? DEFAULT_STATE_DIR_NAME);
}
