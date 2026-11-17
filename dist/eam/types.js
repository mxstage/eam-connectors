// EAM intermediate forms: a system-neutral shape for the asset tree, maintenance plans and work records.
// Maximo is the first system mapped onto them (./maximo.ts); IFS and SAP are planned to map onto the same types.
// This is a foundation: read-side types and mappings only. Writes still go through the Maximo commit engine.
//
// EAM の中間形（資産の木・保全計画・作業の実績）。業務システムに依らない形で、Maximo の対応は ./maximo.ts。
/** 中間形の id を作る（種類:サイト/番号。サイトが無ければ種類:番号） */
export function eamId(kind, siteId, code) {
    return siteId ? `${kind}:${siteId}/${code}` : `${kind}:${code}`;
}
