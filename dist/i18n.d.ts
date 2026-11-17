export type Locale = "en" | "ja";
export declare const LOCALES: readonly Locale[];
/** 利用者が選んだ言語を覚えておく localStorage のキー */
export declare const LOCALE_STORAGE_KEY = "mxstage.locale";
type MessageValue = string | ((...args: never[]) => string);
export interface MessageTree {
    readonly [key: string]: MessageValue | MessageTree;
}
/** 英語の文言と同じ形（文字列は文字列、関数は同じ引数の関数、入れ子は同じ入れ子） */
export type MessagesOf<T> = {
    readonly [K in keyof T]: T[K] extends string ? string : T[K] extends (...args: infer A) => string ? (...args: A) => string : MessagesOf<T[K]>;
};
export declare function isLocale(value: unknown): value is Locale;
export declare function getLocale(): Locale;
/** 言語を切り替える。変わったときだけ知らせる */
export declare function setLocale(locale: Locale): void;
/** 言語が変わったら呼ぶ。戻り値で解除する */
export declare function subscribeLocale(listener: (locale: Locale) => void): () => void;
/** 保存した設定とブラウザの言語から、使う言語を決める */
export declare function detectLocale(input: {
    stored?: string | null;
    languages?: readonly string[];
}): Locale;
/** 英語（正）と日本語の文言の組を作る。返す関数は、呼んだときの言語の文言を返す */
export declare function defineMessages<const T extends MessageTree>(en: T, ja: MessagesOf<T>): () => MessagesOf<T>;
export {};
