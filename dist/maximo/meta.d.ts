import type { ColumnSchema } from "../model.ts";
import { type MaximoClient } from "./client.ts";
export interface ObjectStructureListItem {
    /** オブジェクト構造名（大文字） */
    name: string;
    description: string;
    href: string | null;
}
/** apimeta?lean=1 の一覧を名前・説明の部分一致（大文字小文字を区別しない）で絞り込む */
export declare function listObjectStructures(client: MaximoClient, query?: string, limit?: number): Promise<ObjectStructureListItem[]>;
/**
 * apimeta の応答から name/description/href を抽出する。
 * 応答の形は版によって違う可能性があるため（配列 / member / apis）、どれでも受け付ける。【P0-1 で実機の形を確認する】
 */
export declare function parseApiMeta(json: unknown): ObjectStructureListItem[];
/** Maximo に定義されたオブジェクト構造 1 つ（MXAPIINTOBJECT の行） */
export interface DefinedObjectStructure {
    /** オブジェクト構造名（大文字） */
    name: string;
    description: string;
    /** 適用先（USEWITH）。Maximo の言語の値のまま（例 統合、マイグレーション・マネージャー） */
    usewith: string;
}
/** Maximo に定義されたすべてのオブジェクト構造を MXAPIINTOBJECT から読む（名前順） */
export declare function listDefinedObjectStructures(client: MaximoClient): Promise<DefinedObjectStructure[]>;
/** API で使えるオブジェクト構造の一覧（apimeta と Maximo の定義を合わせたもの） */
export interface StructureList {
    /** API で使える構造（名前順） */
    items: Array<{
        name: string;
        description: string;
    }>;
    /** Maximo に定義された構造の数。定義を読めなければ null */
    definedCount: number | null;
    /** apimeta に載らず、定義から足した数 */
    addedFromDefinitions: number;
    /** 定義はあるが、適用先が API で使えないため読み込まない構造（名前順） */
    notApi: DefinedObjectStructure[];
    /** 定義（MXAPIINTOBJECT）を読めなかった理由。このときは apimeta の一覧だけ */
    definedError?: string;
}
/**
 * apimeta の一覧に、Maximo の定義（MXAPIINTOBJECT）にあって apimeta に載らない構造を足す。
 * 実機（2026-09-17）では、顧客が作った EXT_* などが apimeta に載らなかったが、jsonschemas も行の読み取りもできた。
 * 足すのは、apimeta に載る構造と同じ適用先（USEWITH）のものだけ。適用先の値は Maximo の言語で返るので名前で決め打ちせず、
 * apimeta に載る構造の適用先から決める。それ以外（マイグレーション・マネージャー・WOS など。jsonschemas が 500 を返した）は notApi にする。
 */
export declare function mergeStructureLists(listed: readonly ObjectStructureListItem[], defined: readonly DefinedObjectStructure[] | {
    error: string;
}): StructureList;
export interface ObjectStructureInfo {
    os: string;
    /** 親の列 → 子の列の順。子の列名は "CHILD.ATTR" */
    columns: ColumnSchema[];
    /** スキーマの主キー表示（pk）から得た親のキー列。無ければ空 */
    keyColumns: string[];
    /** 子オブジェクト名 → 子を特定する属性（推定できなければ null） */
    childIdAttrs: Record<string, string | null>;
}
/** jsonschemas/{os}?oslc.select=* を取得して解析する */
export declare function getObjectStructureInfo(client: MaximoClient, os: string): Promise<ObjectStructureInfo>;
/** オブジェクト構造の列。child を渡すとその子オブジェクトの列だけを返す */
export declare function describeObjectStructure(client: MaximoClient, os: string, child?: string): Promise<ColumnSchema[]>;
export declare function filterChildColumns(info: ObjectStructureInfo, child?: string): ColumnSchema[];
/**
 * jsonschemas の応答を ColumnSchema[] に解析する。
 * - 列名は大文字。_rowstamp / href / localref など _ で始まるシステム項目は除く。
 * - type:"array"（items に properties）または type:"object"（properties）のプロパティは子オブジェクトとして
 *   "CHILD.ATTR" の列にし child を設定する。孫オブジェクトは未対応なので除く。
 * - 型は subType / format / type から決める。
 * - readOnly は readOnly / readonly / x-readonly / x-readOnly のいずれかが真なら採用する。
 */
export declare function parseJsonSchema(os: string, schema: unknown): ObjectStructureInfo;
/**
 * ChildIdAttr（子を特定する属性）の決め方。上から順に、子のスキーマに実在する属性だけを採用する。
 *   1. 既知の対応（MULTIASSETLOCCI → MULTIID など）
 *   2. "<子オブジェクト名>ID"（Maximo が作る一意 ID 列の命名。例 EXT_WOPERMIT → EXT_WOPERMITID）
 *   3. "<子オブジェクト名>UID"
 *   4. 子のスキーマの主キー表示（pk 等）が 1 属性だけならそれ
 *   いずれにも当たらなければ null（その子は変更・削除できず、追加だけ可能）。
 * 子オブジェクト名は OS 上の別名（プロパティ名）と、スキーマの resource / objectName の両方で試す。
 * 【この推定は仮定に基づく。P0-1 で EXT_WOPERMIT・ASSETSPEC などの実機スキーマを見て確認が必要】
 */
export declare function inferChildIdAttr(childName: string, childSchema: Record<string, unknown>, containerProp?: Record<string, unknown>): string | null;
