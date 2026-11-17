import { type MaximoRecord, type SheetMeta, type SheetRow } from "../sheet.ts";
import type { MaximoClient } from "../maximo/client.ts";
/** replaceParents の 1 件: 親キーと、Maximo から読み直した親レコード・その親の行 */
export interface ParentReplacement {
    parentKey: string;
    record: MaximoRecord;
    rows: readonly SheetRow[];
}
/** 読み直しに要るシートの部分（MX Stage の Sheet はこれを満たす） */
export interface ReloadableSheet {
    readonly meta: SheetMeta;
    readonly records: readonly MaximoRecord[];
    /** 親キーの行（読み込み時の行は added が null） */
    group(parentKey: string): readonly {
        rowKey: string;
        added: unknown;
    }[];
}
export interface ReloadOutcome {
    replacements: ParentReplacement[];
    /** 読み直せなかった親 → 理由（値を含めない） */
    failures: Map<string, string>;
}
/**
 * 親ごとに、読み込み時の href をそのシートの select で GET し直す。
 * 行はシートに出ていた子（読み込み時にあった子のうちシートに行があったもの）と、読み込み時に無かった子（反映で追加した子）だけにする。
 * 読み込み時に子の属性の条件で外していた子を、反映をきっかけにシートへ出さないため。
 * 新しく作った親（created: 親キー → 作ったときに Maximo が返した href）は、その href で読み、Maximo にある子をすべて出す
 * （送った子のほか、分類の仕様の行など Maximo が足した子も見えるように）。
 */
export declare function reloadParents(client: MaximoClient, sheet: ReloadableSheet, parentKeys: readonly string[], created?: ReadonlyMap<string, string>): Promise<ReloadOutcome>;
