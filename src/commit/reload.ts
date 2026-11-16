// 反映を確かめた親を Maximo から読み直し、シートの base を置き換える行を作る。

import type { CellValue } from "../model.ts";
import { makeChildRowKey, type MaximoRecord, type SheetMeta, type SheetRow } from "../sheet.ts";
import type { MaximoClient } from "../maximo/client.ts";
import { parentKeyOf, parseMember, recordsToRows } from "../maximo/load.ts";
import { buildSelect, upperKeys } from "../maximo/query.ts";
import { commitMessages as m } from "./messages.ts";

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
  group(parentKey: string): readonly { rowKey: string; added: unknown }[];
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
export async function reloadParents(
  client: MaximoClient,
  sheet: ReloadableSheet,
  parentKeys: readonly string[],
  created: ReadonlyMap<string, string> = new Map(),
): Promise<ReloadOutcome> {
  const meta = sheet.meta;
  const names = meta.columns.map((c) => c.name);
  const select = buildSelect([...meta.keyColumns, ...names], meta.childIdAttrs, new Set(names));
  const idAttrs = upperKeys(meta.childIdAttrs);
  const byKey = new Map<string, MaximoRecord>();
  for (const r of sheet.records) byKey.set(parentKeyOf(r, meta.keyColumns), r);
  const replacements: ParentReplacement[] = [];
  const failures = new Map<string, string>();
  for (const pk of parentKeys) {
    const createdHref = created.get(pk);
    const old = byKey.get(pk) ?? (createdHref !== undefined ? { href: createdHref, rowstamp: null, attrs: {}, children: {} } : undefined);
    if (old === undefined) {
      failures.set(pk, m().reload.parentNotFound);
      continue;
    }
    let rec: MaximoRecord;
    try {
      const path = client.hrefToPath(old.href);
      const json = await client.get(`${path}?lean=1&oslc.select=${encodeURIComponent(select)}`);
      // 以後の書き込み先は読み込み時の href に固定する（I7）
      rec = { ...parseMember(json, idAttrs, { requireHref: false }), href: old.href };
    } catch (e) {
      failures.set(pk, m().reload.readFailed(e instanceof Error ? e.message : m().unknownError));
      continue;
    }
    if (parentKeyOf(rec, meta.keyColumns) !== pk) {
      failures.set(pk, m().reload.keyMismatch);
      continue;
    }
    let rows: SheetRow[];
    try {
      rows = recordsToRows([rec], meta);
    } catch (e) {
      failures.set(pk, m().reload.rowsInvalid(e instanceof Error ? e.message : m().unknownError));
      continue;
    }
    replacements.push({ parentKey: pk, record: rec, rows: visibleRows(sheet, pk, old, rows) });
  }
  return { replacements, failures };
}

function visibleRows(sheet: ReloadableSheet, pk: string, old: MaximoRecord, rows: SheetRow[]): SheetRow[] {
  const shown = new Set(
    sheet
      .group(pk)
      .filter((r) => r.added === null)
      .map((r) => r.rowKey),
  );
  const loaded = new Set<string>();
  for (const [kind, list] of Object.entries(old.children)) {
    for (const c of list) if (c.idAttr && c.id !== null) loaded.add(makeChildRowKey(pk, kind, c.id));
  }
  const kept = rows.filter((r) => r.childName === null || shown.has(r.rowKey) || !loaded.has(r.rowKey));
  if (kept.length > 0) return kept;
  // 出ていた子がすべて消えた: 子を追加できるよう、子の列を空にした親だけの行にする
  const first = rows[0];
  if (first === undefined) return rows;
  const values: Record<string, CellValue> = { ...first.values };
  for (const c of sheet.meta.columns) if (c.child) values[c.name] = null;
  return [{ rowKey: pk, parentKey: pk, childName: null, values }];
}
