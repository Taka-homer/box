// バックアップを家族のデータとして復元するための変換。
// 別の家族や以前のデータとIDがぶつからないよう、すべてのIDを新しく振り直す。

import type { Snapshot } from "../types";
import { normalizeText } from "../text";

export interface ReplacePayload {
  floors: Record<string, unknown>[];
  rooms: Record<string, unknown>[];
  storages: Record<string, unknown>[];
  items: Record<string, unknown>[];
  words: Record<string, unknown>[];
}

/**
 * @param photoPaths 元の写真ID → アップロード後の保存先パス
 * @param makeId 新しいIDを作る関数
 */
export function buildReplacePayload(
  snapshot: Snapshot,
  photoPaths: Map<string, string>,
  makeId: () => string,
): ReplacePayload {
  const remap = new Map<string, string>();
  const idOf = (old: string) => {
    let id = remap.get(old);
    if (!id) {
      id = makeId();
      remap.set(old, id);
    }
    return id;
  };
  const required = (old: string, label: string) => {
    const id = remap.get(old);
    if (!id) throw new Error(`missing ${label}: ${old}`);
    return id;
  };
  const photo = (id: string | null) => (id ? (photoPaths.get(id) ?? null) : null);

  const floors = snapshot.floors.map((f) => ({
    id: idOf(f.id),
    name: f.name,
    name_key: normalizeText(f.name),
    sort_order: f.order,
    demo_key: f.demoKey ?? null,
    created_at: f.createdAt,
    updated_at: f.updatedAt,
  }));
  const rooms = snapshot.rooms.map((r) => ({
    id: idOf(r.id),
    floor_id: required(r.floorId, "floor"),
    name: r.name,
    name_key: normalizeText(r.name),
    sort_order: r.order,
    demo_key: r.demoKey ?? null,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  }));
  const storages = snapshot.storages.map((s) => ({
    id: idOf(s.id),
    room_id: required(s.roomId, "room"),
    name: s.name,
    name_key: normalizeText(s.name),
    photo_path: photo(s.photoId),
    demo_key: s.demoKey ?? null,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  }));
  const items = snapshot.items.map((i) => ({
    id: idOf(i.id),
    storage_id: required(i.storageId, "storage"),
    name: i.name,
    category: i.category,
    detail: i.detail,
    memo: i.memo,
    photo_path: photo(i.photoId),
    status: i.status,
    last_checked_at: i.lastCheckedAt,
    demo_key: i.demoKey ?? null,
    created_at: i.createdAt,
    updated_at: i.updatedAt,
  }));
  const words = snapshot.words.map((w) => ({
    id: idOf(w.id),
    words: w.words,
    created_at: w.createdAt,
    updated_at: w.updatedAt,
  }));
  return { floors, rooms, storages, items, words };
}
