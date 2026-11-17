// タブ内のシートの内部表現と、Maximo へのコミット計画の型。
// 画面のシートストア（src/app/store）と書き込みエンジン（src/app/maximo）が共有する。
// ---------------------------------------------------------------------------
// 行キー
//   親行:  encodeURIComponent(キー値1)|encodeURIComponent(キー値2)
//   子行:  <親キー>#<子オブジェクト名>:<encodeURIComponent(子ID)>   新規の子は ID を "new~<連番>" にする
// ---------------------------------------------------------------------------
const PARENT_SEP = "|";
const CHILD_SEP = "#";
const ID_SEP = ":";
export const NEW_CHILD_PREFIX = "new~";
function keyPart(v) {
    return encodeURIComponent(v === null ? "" : String(v));
}
export function makeParentKey(keyValues) {
    return keyValues.map(keyPart).join(PARENT_SEP);
}
export function makeChildRowKey(parentKey, childName, childId) {
    return `${parentKey}${CHILD_SEP}${childName}${ID_SEP}${keyPart(childId)}`;
}
export function parseRowKey(rowKey) {
    const i = rowKey.indexOf(CHILD_SEP);
    if (i < 0)
        return { parentKey: rowKey, childName: null, childId: null, isNewChild: false };
    const parentKey = rowKey.slice(0, i);
    const rest = rowKey.slice(i + 1);
    const j = rest.indexOf(ID_SEP);
    const childName = j < 0 ? rest : rest.slice(0, j);
    const childId = j < 0 ? null : decodeURIComponent(rest.slice(j + 1));
    return { parentKey, childName, childId, isNewChild: childId !== null && childId.startsWith(NEW_CHILD_PREFIX) };
}
