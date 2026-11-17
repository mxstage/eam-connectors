export type StatusObjectKind = "WORKORDER" | "PO" | "SR" | "ASSET";
export interface StatusRule {
    /** 作ったときのステータス */
    initial: string;
    /** 履歴になるステータス（中身もステータスも変えられない） */
    history: readonly string[];
    /** 中身を直せるステータス（無ければ履歴でない限り直せる） */
    editable?: readonly string[];
}
export declare const STATUS_RULES: Readonly<Record<StatusObjectKind, StatusRule>>;
/** 資産の撤去済み。ここからは他のステータスへ移れない */
export declare const ASSET_DECOMMISSIONED = "DECOMMISSIONED";
/** 作業指示のステータスの移り方（今のステータス → 移れる先） */
export declare const WO_TRANSITIONS: Readonly<Record<string, readonly string[]>>;
/** 戻せないステータス（クローズ・取消・撤去・廃止）。反映の画面で人の確認が要る */
export declare const IRREVERSIBLE_STATUSES: ReadonlySet<string>;
export declare function isIrreversibleStatus(status: string): boolean;
/** 移れるか。分からない（作業指示・資産以外・知らないステータス）なら null（Maximo に任せる） */
export declare function canChangeStatus(kind: StatusObjectKind | null, from: string, to: string): boolean | null;
/** 属性の名前（大文字）から、ステータスの決まりを当てるオブジェクトを見分ける */
export declare function statusObjectKind(attrNames: Iterable<string>): StatusObjectKind | null;
