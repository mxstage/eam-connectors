import type { TypedFilter } from "../model.ts";
/** in に並べる値の上限（URL 長の保護） */
export declare const MAX_IN_VALUES = 200;
export declare class QueryBuildError extends Error {
    constructor(message: string);
}
/** 列名（"WONUM" / "EXT_WOPERMIT.EXT_PERMITDATE"）を大文字の子オブジェクト名と属性名に分ける */
export declare function splitColumnName(col: string): {
    child: string | null;
    attr: string;
};
/**
 * oslc.select を組み立てる。
 * 親は _rowstamp を必ず含め、子は child{<ID 属性>,_rowstamp,...} にする（書き込み時の照合に使う）。
 * 属性名は Maximo の lean 形式に合わせて小文字にする。
 * knownAttrs を渡すとスキーマに無い列を拒否する（列名誤りで黙って空になるのを防ぐ）。
 */
export declare function buildSelect(select: string[], childIdAttrs: Record<string, string | null>, knownAttrs?: Set<string>): string;
export interface WhereBuildResult {
    /** oslc.where に入れる文字列。条件が無ければ空文字 */
    where: string;
    /** 子属性のフィルタ。Maximo へは送らず、呼び出し元がタブ内で後段フィルタとして評価する */
    postFilters: TypedFilter[];
}
/**
 * TypedFilter[] から oslc.where を組み立てる。複数条件は and でつなぐ。
 * knownAttrs は列名（大文字、子は CHILD.ATTR）の集合。
 */
export declare function buildWhere(filters: TypedFilter[], knownAttrs: Set<string>): WhereBuildResult;
/**
 * oslc.orderBy を組み立てる。"-WONUM" は降順、"WONUM" / "+WONUM" は昇順。子の属性では並べ替えない。
 */
export declare function buildOrderBy(orderBy: string[], knownAttrs?: Set<string>): string;
export declare function upperKeys<V>(obj: Record<string, V>): Record<string, V>;
