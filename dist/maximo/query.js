// oslc.select / oslc.where / oslc.orderBy の組み立て。
// LLM の文字列を直接入れない。属性名は ^[A-Za-z0-9_]+$ かつスキーマにある既知の列だけを通す。
const NAME_RE = /^[A-Za-z0-9_]+$/;
/** in に並べる値の上限（URL 長の保護） */
export const MAX_IN_VALUES = 200;
export class QueryBuildError extends Error {
    constructor(message) {
        super(message);
        this.name = "QueryBuildError";
    }
}
/** 列名（"WONUM" / "EXT_WOPERMIT.EXT_PERMITDATE"）を大文字の子オブジェクト名と属性名に分ける */
export function splitColumnName(col) {
    const parts = col.split(".");
    if (parts.length > 2)
        throw new QueryBuildError(`Column name ${JSON.stringify(col)} can have at most 2 levels (grandchild objects are not supported)`);
    for (const p of parts) {
        if (!NAME_RE.test(p))
            throw new QueryBuildError(`Column name ${JSON.stringify(col)} contains characters that cannot be used`);
    }
    if (parts.length === 2)
        return { child: parts[0].toUpperCase(), attr: parts[1].toUpperCase() };
    return { child: null, attr: parts[0].toUpperCase() };
}
function assertKnown(col, knownAttrs) {
    if (knownAttrs && !knownAttrs.has(col))
        throw new QueryBuildError(`Column ${col} is not in the object structure`);
}
/**
 * oslc.select を組み立てる。
 * 親は _rowstamp を必ず含め、子は child{<ID 属性>,_rowstamp,...} にする（書き込み時の照合に使う）。
 * 属性名は Maximo の lean 形式に合わせて小文字にする。
 * knownAttrs を渡すとスキーマに無い列を拒否する（列名誤りで黙って空になるのを防ぐ）。
 */
export function buildSelect(select, childIdAttrs, knownAttrs) {
    const idAttrs = upperKeys(childIdAttrs);
    const parent = ["_rowstamp"];
    const children = new Map();
    for (const col of select) {
        const { child, attr } = splitColumnName(col);
        if (attr === "_ROWSTAMP")
            continue;
        assertKnown(child ? `${child}.${attr}` : attr, knownAttrs);
        if (child) {
            let list = children.get(child);
            if (!list) {
                list = [];
                const idAttr = idAttrs[child];
                if (idAttr) {
                    if (!NAME_RE.test(idAttr))
                        throw new QueryBuildError(`Invalid ID attribute name for child ${child}`);
                    list.push(idAttr.toLowerCase());
                }
                list.push("_rowstamp");
                children.set(child, list);
            }
            pushUnique(list, attr.toLowerCase());
        }
        else {
            pushUnique(parent, attr.toLowerCase());
        }
    }
    const parts = [...parent];
    for (const [child, attrs] of children)
        parts.push(`${child.toLowerCase()}{${attrs.join(",")}}`);
    return parts.join(",");
}
/**
 * TypedFilter[] から oslc.where を組み立てる。複数条件は and でつなぐ。
 * knownAttrs は列名（大文字、子は CHILD.ATTR）の集合。
 */
export function buildWhere(filters, knownAttrs) {
    const clauses = [];
    const postFilters = [];
    for (const f of filters) {
        const { child, attr } = splitColumnName(f.attr);
        const col = child ? `${child}.${attr}` : attr;
        assertKnown(col, knownAttrs);
        if (child) {
            // 子のフィルタを oslc.where に入れると「条件に合う子を持つ親」の絞り込みになり、
            // 子の行の絞り込みと意味が変わるため、Maximo へは送らない
            postFilters.push({ ...f, attr: col });
            continue;
        }
        clauses.push(buildClause(attr.toLowerCase(), f));
    }
    return { where: clauses.join(" and "), postFilters };
}
function buildClause(a, f) {
    switch (f.op) {
        case "eq":
            return `${a}=${scalar(f, false)}`;
        case "ne":
            return `${a}!=${scalar(f, false)}`;
        case "gt":
            return `${a}>${ordered(f)}`;
        case "gte":
            return `${a}>=${ordered(f)}`;
        case "lt":
            return `${a}<${ordered(f)}`;
        case "lte":
            return `${a}<=${ordered(f)}`;
        case "in": {
            if (!Array.isArray(f.value) || f.value.length === 0)
                throw new QueryBuildError(`in for ${f.attr} needs an array of at least one value`);
            if (f.value.length > MAX_IN_VALUES)
                throw new QueryBuildError(`in for ${f.attr} takes at most ${MAX_IN_VALUES} values`);
            return `${a} in [${f.value.map((v) => formatValue(f.attr, v, false)).join(",")}]`;
        }
        case "notin":
            // Maximo の否定の in は文書化された構文が確かでなく（!="[a,b]" などは実装依存）、
            // 誤ると条件が黙って無視されて全件が返る。安全のため Maximo へは送らない
            throw new QueryBuildError(`notin for ${f.attr} cannot be used in a Maximo query. Express it with in or ne, or filter in the tab after loading`);
        case "like": {
            if (Array.isArray(f.value) || f.value === null || f.value === undefined || typeof f.value === "boolean") {
                throw new QueryBuildError(`like for ${f.attr} needs a string`);
            }
            const s = String(f.value);
            if (s === "")
                throw new QueryBuildError(`like for ${f.attr} cannot be an empty string`);
            assertSafeString(f.attr, s, true);
            return `${a}="%${s}%"`;
        }
        case "isnull":
            assertNoValue(f);
            return `${a}!="*"`;
        case "notnull":
            assertNoValue(f);
            return `${a}="*"`;
        default:
            throw new QueryBuildError(`Unsupported operator ${String(f.op)}`);
    }
}
function scalar(f, _ordered) {
    if (Array.isArray(f.value))
        throw new QueryBuildError(`${f.op} for ${f.attr} cannot take an array`);
    if (f.value === undefined || f.value === null)
        throw new QueryBuildError(`${f.op} for ${f.attr} has no value (use isnull or notnull to test for empty)`);
    return formatValue(f.attr, f.value, false);
}
function ordered(f) {
    if (typeof f.value === "boolean")
        throw new QueryBuildError(`${f.op} for ${f.attr} cannot take a boolean`);
    return scalar(f, true);
}
function formatValue(attr, v, allowPercent) {
    if (v === null)
        throw new QueryBuildError(`The value for ${attr} cannot be null (use isnull or notnull)`);
    if (typeof v === "number") {
        if (!Number.isFinite(v))
            throw new QueryBuildError(`Invalid number for ${attr}`);
        return String(v);
    }
    if (typeof v === "boolean")
        return v ? "true" : "false";
    if (v === "")
        throw new QueryBuildError(`The value for ${attr} cannot be an empty string (use isnull or notnull)`);
    // "*" 単独は Maximo で「値がある」の意味になるので値として使わない
    if (v === "*")
        throw new QueryBuildError(`The value for ${attr} cannot be * (use notnull)`);
    assertSafeString(attr, v, allowPercent);
    return `"${v}"`;
}
function assertSafeString(attr, s, allowPercent) {
    // Maximo の oslc.where には " のエスケープ方法が文書化されていないため拒否する
    if (s.includes('"'))
        throw new QueryBuildError(`A value for ${attr} containing " cannot be used in a query`);
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f]/.test(s))
        throw new QueryBuildError(`The value for ${attr} must not contain control characters`);
    // % は Maximo でワイルドカードとして解釈され、完全一致のつもりが部分一致になる
    if (!allowPercent && s.includes("%"))
        throw new QueryBuildError(`The value for ${attr} must not contain % (use like for substring matches)`);
}
function assertNoValue(f) {
    if (f.value !== undefined && f.value !== null)
        throw new QueryBuildError(`${f.op} for ${f.attr} takes no value`);
}
/**
 * oslc.orderBy を組み立てる。"-WONUM" は降順、"WONUM" / "+WONUM" は昇順。子の属性では並べ替えない。
 */
export function buildOrderBy(orderBy, knownAttrs) {
    return orderBy
        .map((o) => {
        const desc = o.startsWith("-");
        const name = o.replace(/^[+-]/, "");
        const { child, attr } = splitColumnName(name);
        if (child)
            throw new QueryBuildError(`Cannot sort by the child attribute ${name}`);
        assertKnown(attr, knownAttrs);
        return `${desc ? "-" : "+"}${attr.toLowerCase()}`;
    })
        .join(",");
}
function pushUnique(list, v) {
    if (!list.includes(v))
        list.push(v);
}
export function upperKeys(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj))
        out[k.toUpperCase()] = v;
    return out;
}
