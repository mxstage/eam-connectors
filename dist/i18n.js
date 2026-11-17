// 作業画面の言語（英語と日本語）。英語を正とし、日本語は英語と同じ形にそろえる（抜けは型検査で見つかる）。
//
//   const m = defineMessages(
//     { title: "Settings", saved: (n: number) => `${n} saved` },
//     { title: "設定", saved: (n) => `${n} 件を保存しました` },
//   );
//   m().title      // 今の言語の文言
//
// 言語の決め方: 利用者が設定で選んだもの（localStorage の mxstage.locale）→ 無ければブラウザの言語が日本語なら日本語、
// それ以外は英語。切り替えたら subscribeLocale で知らせ、画面は作り直して表示を変える（作業データはタブのメモリにあるので、再読み込みはしない）。
// LLM に渡す文言（ツールの説明・結果・案内）は、ここを通さず英語だけにする。ただし作業画面にも出る文
// （反映の関門の理由・反映の結果・ライセンスの案内など）は、ここを通して今の言語にする（LLM は利用者の言葉で答える）。
export const LOCALES = ["en", "ja"];
/** 利用者が選んだ言語を覚えておく localStorage のキー */
export const LOCALE_STORAGE_KEY = "mxstage.locale";
let current = "en";
const listeners = new Set();
export function isLocale(value) {
    return value === "en" || value === "ja";
}
export function getLocale() {
    return current;
}
/** 言語を切り替える。変わったときだけ知らせる */
export function setLocale(locale) {
    if (!isLocale(locale) || locale === current)
        return;
    current = locale;
    for (const listener of [...listeners])
        listener(locale);
}
/** 言語が変わったら呼ぶ。戻り値で解除する */
export function subscribeLocale(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
/** 保存した設定とブラウザの言語から、使う言語を決める */
export function detectLocale(input) {
    if (isLocale(input.stored))
        return input.stored;
    const first = (input.languages ?? [])[0] ?? "";
    return first.toLowerCase().startsWith("ja") ? "ja" : "en";
}
/** 英語（正）と日本語の文言の組を作る。返す関数は、呼んだときの言語の文言を返す */
export function defineMessages(en, ja) {
    const english = en;
    return () => (current === "ja" ? ja : english);
}
