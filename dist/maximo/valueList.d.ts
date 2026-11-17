import { type MaximoClient } from "./client.ts";
/** 接続（接続先の URL とクライアント）。利用側の接続の型は、これを満たせばよい */
export interface MaximoConnectionLike {
    info: {
        baseUrl: string;
    };
    client: MaximoClient;
}
/** 現在の Maximo 接続。未接続・自動ロック中は null */
export interface ConnectionProvider<C extends MaximoConnectionLike = MaximoConnectionLike> {
    current(): C | null;
    subscribe(listener: () => void): () => void;
}
export interface ValueListItem {
    value: string;
    description?: string;
}
/** 1 つの一覧で読む件数の上限（画面で選ぶための一覧なので、これより多い表はここで打ち切る） */
export declare const VALUE_LIST_MAX_ITEMS = 1000;
/** getlist の応答の member を一覧にする。値の重複は最初のものだけ残す */
export declare function parseValueList(json: unknown, attr: string): ValueListItem[];
/**
 * レコード（親または子）の href と属性名から、getlist の一覧を取る（nextPage をたどり、上限で打ち切る）。
 * 失敗したら例外（呼び出し側で静かに自由入力にする）。
 */
export declare function fetchValueList(client: MaximoClient, recordHref: string, attr: string, opts?: {
    maxItems?: number;
    pageSize?: number;
}): Promise<ValueListItem[]>;
/** 一覧の取り方（どのレコードの、どの属性の一覧か） */
export interface ValueListTarget {
    /** 読み込みに使ったオブジェクト構造 */
    os: string;
    /** シートの列名（子は CHILD.ATTR）。覚えておく単位 */
    col: string;
    /** getlist を付けるレコードの href（親、子の列なら子の href） */
    href: string;
    /** getlist~ に付ける属性名（子の列なら子の属性名） */
    attr: string;
    /** シートを読み込んだ接続先。今の接続先と違えば取らない（別の Maximo の一覧になるため） */
    baseUrl?: string;
}
export type ValueListState = {
    status: "loading";
} | {
    status: "ready";
    items: readonly ValueListItem[];
} | {
    status: "none";
};
/**
 * getlist の一覧をセッションの間だけ覚える。同じ一覧を同時に 2 度取りに行かない。
 * 失敗・空の一覧は "none" として覚え、同じ列では取り直さない（作業を止めず、自由入力にする）。
 */
export declare class ValueListService {
    private readonly connection;
    private readonly cache;
    private readonly pending;
    private readonly fetchList;
    constructor(opts: {
        connection: ConnectionProvider;
        fetchList?: typeof fetchValueList;
    });
    private keyOf;
    /** 覚えている一覧（取っていない・接続していなければ undefined） */
    peek(os: string, col: string): ValueListState | undefined;
    /** 一覧を返す（覚えていなければ取る）。未接続なら "none"（覚えない） */
    load(target: ValueListTarget): Promise<ValueListState>;
    /** 覚えた一覧を捨てる（接続先を変えたときなど） */
    clear(): void;
}
