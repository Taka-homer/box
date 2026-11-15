// 通常検索（キーワード一致）。AI検索とは別の処理として扱う。

import type { AppData, Category, Floor, Item, ItemStatus, Room, Storage } from "./types";
import { normalizeText } from "./text";
import { dictionaryWith, extractConcepts, matchConcept } from "./related-words";

export interface ItemView {
  item: Item;
  storage: Storage | null;
  room: Room | null;
  floor: Floor | null;
}

export interface SearchFilters {
  q?: string;
  category?: Category | "";
  floorId?: string;
  roomId?: string;
  storageId?: string;
  status?: ItemStatus | "";
}

export interface Lookup {
  floors: Map<string, Floor>;
  rooms: Map<string, Room>;
  storages: Map<string, Storage>;
}

export function buildLookup(data: AppData): Lookup {
  return {
    floors: new Map(data.floors.map((f) => [f.id, f])),
    rooms: new Map(data.rooms.map((r) => [r.id, r])),
    storages: new Map(data.storages.map((s) => [s.id, s])),
  };
}

/** ものから 階 → 部屋 → 収納場所 を参照でたどる */
export function resolveItem(item: Item, lookup: Lookup): ItemView {
  const storage = lookup.storages.get(item.storageId) ?? null;
  const room = storage ? lookup.rooms.get(storage.roomId) ?? null : null;
  const floor = room ? lookup.floors.get(room.floorId) ?? null : null;
  return { item, storage, room, floor };
}

export function locationLabel(view: Pick<ItemView, "floor" | "room" | "storage">): string {
  return [view.floor?.name, view.room?.name, view.storage?.name].filter(Boolean).join(" → ") || "場所が不明";
}

/** 名前・詳しい位置・メモを対象に、スペース区切りの全語を含むものを探す */
export function matchesKeyword(item: Item, q: string): boolean {
  const words = normalizeText(q).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeText([item.name, item.detail, item.memo].join(" "));
  return words.every((w) => haystack.includes(w));
}

export function hasActiveFilters(f: SearchFilters): boolean {
  return Boolean(f.category || f.floorId || f.roomId || f.storageId || f.status);
}

export function filterViews<T extends ItemView>(views: T[], f: SearchFilters): T[] {
  return views.filter((v) => {
    if (f.category && v.item.category !== f.category) return false;
    if (f.status && v.item.status !== f.status) return false;
    if (f.storageId && v.item.storageId !== f.storageId) return false;
    if (f.roomId && v.room?.id !== f.roomId) return false;
    if (f.floorId && v.floor?.id !== f.floorId) return false;
    return true;
  });
}

export interface RelatedView extends ItemView {
  /** 一致した関連語（画面の説明用） */
  matchedWords: string[];
  score: number;
}

export interface RelatedResult {
  /** 検索文から取り出した言葉 */
  concepts: string[];
  views: RelatedView[];
}

/**
 * 関連語辞書を使った検索（AIではない）。
 * 通常検索で見つかったもの（excludeIds）を除き、関連語の一致数が多い順に返す。
 * 言葉が複数あるときは、半分以上の言葉に関連するものだけを残す。
 */
export function searchRelated(
  data: AppData,
  filters: SearchFilters,
  excludeIds: Set<string> = new Set(),
  limit = 30,
): RelatedResult {
  // マイ辞書の言葉も言い換えとして使う
  const concepts = extractConcepts(filters.q ?? "", dictionaryWith(data.words));
  if (concepts.length === 0) return { concepts: [], views: [] };
  const required = Math.ceil(concepts.length / 2);
  const lookup = buildLookup(data);

  const scored: RelatedView[] = [];
  for (const item of data.items) {
    if (excludeIds.has(item.id)) continue;
    // 関連語ではカテゴリ名も手がかりにする（例：「道具」→ 工具）
    const haystack = normalizeText([item.name, item.detail, item.memo, item.category].join(" "));
    const matched = concepts.map((c) => matchConcept(haystack, c)).filter((t) => t !== null);
    if (matched.length < required) continue;
    scored.push({
      ...resolveItem(item, lookup),
      matchedWords: [...new Set(matched.map((t) => t.label))],
      score: matched.length,
    });
  }
  const views = filterViews(scored, filters);
  views.sort((a, b) => b.score - a.score || b.item.createdAt.localeCompare(a.item.createdAt));
  return { concepts: concepts.map((c) => c.label), views: views.slice(0, limit) };
}

/** 最近登録した順に並べた検索結果を返す */
export function searchItems(data: AppData, filters: SearchFilters): ItemView[] {
  const lookup = buildLookup(data);
  const views = data.items
    .filter((item) => matchesKeyword(item, filters.q ?? ""))
    .map((item) => resolveItem(item, lookup));
  return filterViews(views, filters).sort((a, b) => b.item.createdAt.localeCompare(a.item.createdAt));
}
