// Supabase による保存処理（家族共有）。画面からは IndexedDB 版と同じ Repository として使う。
// 行レベルセキュリティにより、自分の家族のデータしか読み書きできない。

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateOptions, Repository } from "../repository";
import {
  AppError,
  type AppData,
  type Floor,
  type Item,
  type ItemInput,
  type PhotoChange,
  type PhotoRecord,
  type Room,
  type Snapshot,
  type Storage,
  type StorageInput,
  type WordGroup,
} from "../types";
import { checkCategoryRename } from "../categories";
import { cleanWordGroup, sameWordSet } from "../my-words";
import { newId, normalizeText } from "../text";
import { LIMITS, optionalText, requireName, validateItem } from "../validation";
import { PHOTO_BUCKET } from "./config";
import { toAppError } from "./errors";
import {
  toFloor,
  toItem,
  toRoom,
  toStorage,
  toWordGroup,
  type FloorRow,
  type ItemRow,
  type RoomRow,
  type StorageRow,
  type WordGroupRow,
} from "./mappers";
import { buildReplacePayload } from "./restore";

const PAGE = 1000;

function now() {
  return new Date().toISOString();
}

function check<T>(result: { data: T; error: unknown }, messages?: Parameters<typeof toAppError>[1]): T {
  if (result.error) throw toAppError(result.error, messages);
  return result.data;
}

export class SupabaseRepository implements Repository {
  /** 写真のパスは変更のたびに新しくなるため、内容をそのまま覚えておける */
  private photoCache = new Map<string, Blob>();

  constructor(
    private readonly sb: SupabaseClient,
    readonly householdId: string,
  ) {}

  // ---- 共通 ----

  /** 1000件を超えても取りこぼさないよう、分けて読み込む */
  private async selectAll<T>(table: string): Promise<T[]> {
    const rows: T[] = [];
    for (let from = 0; ; from += PAGE) {
      const data = check(
        await this.sb
          .from(table)
          .select("*")
          .eq("household_id", this.householdId)
          .order("id")
          .range(from, from + PAGE - 1),
        { fallback: "データを読み込めませんでした。通信状況を確認してください。" },
      ) as T[];
      rows.push(...data);
      if (data.length < PAGE) return rows;
    }
  }

  private async count(table: string, column: string, value: string): Promise<number> {
    const { count, error } = await this.sb
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(column, value);
    if (error) throw toAppError(error);
    return count ?? 0;
  }

  private async uploadPhoto(blob: Blob): Promise<string> {
    const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
    const path = `${this.householdId}/${newId()}.${ext}`;
    const { error } = await this.sb.storage
      .from(PHOTO_BUCKET)
      .upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false });
    if (error) throw toAppError(error, { fallback: "写真を保存できませんでした。通信状況を確認してください。" });
    this.photoCache.set(path, blob);
    return path;
  }

  private async removePhotos(paths: (string | null | undefined)[]) {
    const list = paths.filter((p): p is string => Boolean(p));
    if (list.length === 0) return;
    // 写真の削除に失敗しても、登録内容の保存は成功として扱う
    await this.sb.storage.from(PHOTO_BUCKET).remove(list).catch(() => undefined);
    list.forEach((p) => this.photoCache.delete(p));
  }

  /**
   * 写真の変更を反映して行を保存する。
   * 先に新しい写真を保存し、行の保存に成功したら古い写真を消す（失敗したら新しい写真を消す）。
   */
  private async withPhoto<T>(
    current: string | null,
    change: PhotoChange | undefined,
    save: (photoPath: string | null) => Promise<T>,
  ): Promise<T> {
    if (!change || change.kind === "keep") return save(current);
    const next = change.kind === "set" ? await this.uploadPhoto(change.blob) : null;
    try {
      const result = await save(next);
      if (current) await this.removePhotos([current]);
      return result;
    } catch (e) {
      if (next) await this.removePhotos([next]);
      throw e;
    }
  }

  private async getRow<T>(table: string, id: string, notFound: string): Promise<T> {
    const data = check(await this.sb.from(table).select("*").eq("id", id).maybeSingle());
    if (!data) throw new AppError(notFound, "not_found");
    return data as T;
  }

  // ---- 読み込み ----

  async loadAll(): Promise<AppData> {
    const [floors, rooms, storages, items, words] = await Promise.all([
      this.selectAll<FloorRow>("floors"),
      this.selectAll<RoomRow>("rooms"),
      this.selectAll<StorageRow>("storages"),
      this.selectAll<ItemRow>("items"),
      this.selectAll<WordGroupRow>("word_groups"),
    ]);
    return {
      floors: floors.map(toFloor).sort((a, b) => a.order - b.order),
      rooms: rooms.map(toRoom).sort((a, b) => a.order - b.order),
      storages: storages.map(toStorage).sort((a, b) => a.name.localeCompare(b.name, "ja")),
      items: items.map(toItem).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      words: words.map(toWordGroup).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }

  async getPhoto(path: string): Promise<Blob | null> {
    const cached = this.photoCache.get(path);
    if (cached) return cached;
    const { data, error } = await this.sb.storage.from(PHOTO_BUCKET).download(path);
    if (error || !data) return null;
    this.photoCache.set(path, data);
    return data;
  }

  // ---- 階 ----

  async addFloor(nameValue: string, options?: CreateOptions): Promise<Floor> {
    const name = requireName(nameValue, "階の名前");
    const last = check(
      await this.sb
        .from("floors")
        .select("sort_order")
        .eq("household_id", this.householdId)
        .order("sort_order", { ascending: false })
        .limit(1),
    ) as { sort_order: number }[];
    const row = check(
      await this.sb
        .from("floors")
        .insert({
          household_id: this.householdId,
          name,
          name_key: normalizeText(name),
          sort_order: (last[0]?.sort_order ?? -1) + 1,
          demo_key: options?.demoKey ?? null,
        })
        .select()
        .single(),
      { duplicate: `「${name}」はすでに登録されています。` },
    ) as FloorRow;
    return toFloor(row);
  }

  async renameFloor(id: string, nameValue: string): Promise<void> {
    const name = requireName(nameValue, "階の名前");
    const rows = check(
      await this.sb
        .from("floors")
        .update({ name, name_key: normalizeText(name), updated_at: now() })
        .eq("id", id)
        .select("id"),
      { duplicate: `「${name}」はすでに登録されています。` },
    );
    if (!rows?.length) throw new AppError("階が見つかりません。", "not_found");
  }

  async reorderFloors(orderedIds: string[]): Promise<void> {
    for (const [index, id] of orderedIds.entries()) {
      check(await this.sb.from("floors").update({ sort_order: index }).eq("id", id));
    }
  }

  async deleteFloor(id: string): Promise<void> {
    const floor = await this.getRow<FloorRow>("floors", id, "階が見つかりません。");
    const n = await this.count("rooms", "floor_id", id);
    const message = `「${floor.name}」には部屋が${n}件あります。先に部屋を削除してください。`;
    if (n > 0) throw new AppError(message, "has_children");
    check(await this.sb.from("floors").delete().eq("id", id), { hasChildren: message });
  }

  // ---- 部屋 ----

  async addRoom(floorId: string, nameValue: string, options?: CreateOptions): Promise<Room> {
    const name = requireName(nameValue, "部屋の名前");
    if (!floorId) throw new AppError("階を選んでください。");
    const last = check(
      await this.sb
        .from("rooms")
        .select("sort_order")
        .eq("floor_id", floorId)
        .order("sort_order", { ascending: false })
        .limit(1),
    ) as { sort_order: number }[];
    const row = check(
      await this.sb
        .from("rooms")
        .insert({
          household_id: this.householdId,
          floor_id: floorId,
          name,
          name_key: normalizeText(name),
          sort_order: (last[0]?.sort_order ?? -1) + 1,
          demo_key: options?.demoKey ?? null,
        })
        .select()
        .single(),
      { duplicate: `この階には「${name}」がすでにあります。`, hasChildren: "階が見つかりません。選び直してください。" },
    ) as RoomRow;
    return toRoom(row);
  }

  async renameRoom(id: string, nameValue: string): Promise<void> {
    const name = requireName(nameValue, "部屋の名前");
    const rows = check(
      await this.sb
        .from("rooms")
        .update({ name, name_key: normalizeText(name), updated_at: now() })
        .eq("id", id)
        .select("id"),
      { duplicate: `この階には「${name}」がすでにあります。` },
    );
    if (!rows?.length) throw new AppError("部屋が見つかりません。", "not_found");
  }

  async reorderRooms(floorId: string, orderedIds: string[]): Promise<void> {
    for (const [index, id] of orderedIds.entries()) {
      check(await this.sb.from("rooms").update({ sort_order: index }).eq("id", id).eq("floor_id", floorId));
    }
  }

  async deleteRoom(id: string): Promise<void> {
    const room = await this.getRow<RoomRow>("rooms", id, "部屋が見つかりません。");
    const n = await this.count("storages", "room_id", id);
    const message = `「${room.name}」には収納場所が${n}件あります。先に収納場所を削除してください。`;
    if (n > 0) throw new AppError(message, "has_children");
    check(await this.sb.from("rooms").delete().eq("id", id), { hasChildren: message });
  }

  // ---- 収納場所 ----

  async addStorage(input: StorageInput, photo?: PhotoChange, options?: CreateOptions): Promise<Storage> {
    const name = requireName(input.name, "収納場所の名前");
    if (!input.roomId) throw new AppError("部屋を選んでください。");
    return this.withPhoto(null, photo, async (photoPath) => {
      const row = check(
        await this.sb
          .from("storages")
          .insert({
            household_id: this.householdId,
            room_id: input.roomId,
            name,
            name_key: normalizeText(name),
            photo_path: photoPath,
            demo_key: options?.demoKey ?? null,
          })
          .select()
          .single(),
        { duplicate: `この部屋には「${name}」がすでにあります。`, hasChildren: "部屋が見つかりません。選び直してください。" },
      ) as StorageRow;
      return toStorage(row);
    });
  }

  async updateStorage(id: string, input: StorageInput, photo: PhotoChange): Promise<void> {
    const name = requireName(input.name, "収納場所の名前");
    const current = await this.getRow<StorageRow>("storages", id, "収納場所が見つかりません。");
    await this.withPhoto(current.photo_path, photo, async (photoPath) => {
      check(
        await this.sb
          .from("storages")
          .update({ name, name_key: normalizeText(name), room_id: input.roomId, photo_path: photoPath, updated_at: now() })
          .eq("id", id),
        { duplicate: `この部屋には「${name}」がすでにあります。`, hasChildren: "部屋が見つかりません。選び直してください。" },
      );
    });
  }

  async deleteStorage(id: string): Promise<void> {
    const storage = await this.getRow<StorageRow>("storages", id, "収納場所が見つかりません。");
    const n = await this.count("items", "storage_id", id);
    const message = `「${storage.name}」には${n}点のものが登録されています。別の収納場所へ移動してから削除してください。`;
    if (n > 0) throw new AppError(message, "has_children");
    check(await this.sb.from("storages").delete().eq("id", id), { hasChildren: message });
    await this.removePhotos([storage.photo_path]);
  }

  async moveItemsAndDeleteStorage(id: string, targetStorageId: string): Promise<number> {
    if (id === targetStorageId) throw new AppError("別の収納場所を選んでください。");
    const storage = await this.getRow<StorageRow>("storages", id, "収納場所が見つかりません。");
    const moved = check(
      await this.sb.rpc("move_items_and_delete_storage", { p_storage: id, p_target: targetStorageId }),
    ) as number;
    await this.removePhotos([storage.photo_path]);
    return moved;
  }

  // ---- もの・書類 ----

  private itemRow(input: ItemInput) {
    return {
      name: input.name,
      category: input.category,
      storage_id: input.storageId,
      detail: input.detail,
      memo: input.memo,
    };
  }

  async addItem(inputValue: ItemInput, photo?: PhotoChange, options?: CreateOptions): Promise<Item> {
    const input = validateItem(inputValue);
    return this.withPhoto(null, photo, async (photoPath) => {
      const row = check(
        await this.sb
          .from("items")
          .insert({
            household_id: this.householdId,
            ...this.itemRow(input),
            photo_path: photoPath,
            demo_key: options?.demoKey ?? null,
          })
          .select()
          .single(),
        { hasChildren: "選んだ収納場所が見つかりません。選び直してください。" },
      ) as ItemRow;
      return toItem(row);
    });
  }

  async updateItem(id: string, inputValue: ItemInput, photo: PhotoChange): Promise<void> {
    const input = validateItem(inputValue);
    const current = await this.getRow<ItemRow>("items", id, "登録が見つかりません。削除された可能性があります。");
    await this.withPhoto(current.photo_path, photo, async (photoPath) => {
      check(
        await this.sb
          .from("items")
          .update({ ...this.itemRow(input), photo_path: photoPath, updated_at: now() })
          .eq("id", id),
        { hasChildren: "選んだ収納場所が見つかりません。選び直してください。" },
      );
    });
  }

  async deleteItem(id: string): Promise<void> {
    const item = await this.getRow<ItemRow>("items", id, "登録が見つかりません。");
    check(await this.sb.from("items").delete().eq("id", id));
    await this.removePhotos([item.photo_path]);
  }

  private async patchItem(id: string, patch: Record<string, unknown>, hasChildren?: string) {
    const rows = check(
      await this.sb
        .from("items")
        .update({ ...patch, updated_at: now() })
        .eq("id", id)
        .select("id"),
      { hasChildren },
    );
    if (!rows?.length) throw new AppError("登録が見つかりません。", "not_found");
  }

  markFound(id: string) {
    return this.patchItem(id, { status: "normal", last_checked_at: now() });
  }

  markMissing(id: string) {
    return this.patchItem(id, { status: "missing" });
  }

  moveItem(id: string, storageId: string, detailValue: string) {
    const detail = optionalText(detailValue, "詳しい位置", LIMITS.detail);
    if (!storageId) return Promise.reject(new AppError("移動先の収納場所を選んでください。"));
    return this.patchItem(
      id,
      { storage_id: storageId, detail, status: "normal", last_checked_at: now() },
      "移動先の収納場所が見つかりません。",
    );
  }

  async renameCategory(from: string, toValue: string): Promise<number> {
    const to = checkCategoryRename(from, toValue);
    if (to === from) return 0;
    const rows = check(
      await this.sb
        .from("items")
        .update({ category: to, updated_at: now() })
        .eq("household_id", this.householdId)
        .eq("category", from)
        .select("id"),
    );
    return rows?.length ?? 0;
  }

  // ---- マイ辞書 ----

  private async assertWordsFree(words: string[], exceptId?: string) {
    const all = await this.selectAll<WordGroupRow>("word_groups");
    if (all.some((g) => g.id !== exceptId && sameWordSet(g.words, words))) {
      throw new AppError("同じ組み合わせの言葉がすでに登録されています。", "duplicate");
    }
  }

  async addWordGroup(input: string[]): Promise<WordGroup> {
    const words = cleanWordGroup(input);
    await this.assertWordsFree(words);
    const row = check(
      await this.sb.from("word_groups").insert({ household_id: this.householdId, words }).select().single(),
    ) as WordGroupRow;
    return toWordGroup(row);
  }

  async updateWordGroup(id: string, input: string[]): Promise<void> {
    const words = cleanWordGroup(input);
    await this.assertWordsFree(words, id);
    const rows = check(
      await this.sb.from("word_groups").update({ words, updated_at: now() }).eq("id", id).select("id"),
    );
    if (!rows?.length) throw new AppError("登録が見つかりません。", "not_found");
  }

  async deleteWordGroup(id: string): Promise<void> {
    check(await this.sb.from("word_groups").delete().eq("id", id));
  }

  // ---- 一括 ----

  async exportSnapshot(): Promise<Snapshot> {
    const data = await this.loadAll();
    const paths = [...data.storages.map((s) => s.photoId), ...data.items.map((i) => i.photoId)].filter(
      (p): p is string => Boolean(p),
    );
    const photos: PhotoRecord[] = [];
    for (const path of new Set(paths)) {
      const blob = await this.getPhoto(path);
      if (!blob) throw new AppError("写真を読み込めませんでした。通信状況を確認してから、もう一度お試しください。", "storage");
      photos.push({ id: path, type: blob.type || "image/jpeg", data: await blob.arrayBuffer(), createdAt: now() });
    }
    return { ...data, photos };
  }

  async replaceAll(snapshot: Snapshot): Promise<void> {
    const before = await this.loadAll();
    const oldPaths = [...before.storages.map((s) => s.photoId), ...before.items.map((i) => i.photoId)];

    // 1. 写真を先にアップロードする
    const uploaded = new Map<string, string>();
    try {
      for (const p of snapshot.photos) {
        uploaded.set(p.id, await this.uploadPhoto(new Blob([p.data], { type: p.type })));
      }
      // 2. データを1つの処理でまとめて置き換える
      const payload = buildReplacePayload(snapshot, uploaded, newId);
      check(await this.sb.rpc("replace_household_data", { p_household: this.householdId, p_data: payload }), {
        fallback: "復元できませんでした。現在のデータは変更されていません。",
      });
    } catch (e) {
      await this.removePhotos([...uploaded.values()]);
      throw toAppError(e, { fallback: "復元できませんでした。現在のデータは変更されていません。" });
    }
    // 3. 使われなくなった写真を消す
    await this.removePhotos(oldPaths);
  }

  async removeDemoData(): Promise<void> {
    let data = await this.loadAll();
    const demoItems = data.items.filter((i) => i.demoKey);
    if (demoItems.length) {
      check(await this.sb.from("items").delete().in("id", demoItems.map((i) => i.id)));
      await this.removePhotos(demoItems.map((i) => i.photoId));
    }
    data = await this.loadAll();
    for (const s of data.storages.filter((s) => s.demoKey && !data.items.some((i) => i.storageId === s.id))) {
      check(await this.sb.from("storages").delete().eq("id", s.id));
      await this.removePhotos([s.photoId]);
    }
    data = await this.loadAll();
    for (const r of data.rooms.filter((r) => r.demoKey && !data.storages.some((s) => s.roomId === r.id))) {
      check(await this.sb.from("rooms").delete().eq("id", r.id));
    }
    data = await this.loadAll();
    for (const f of data.floors.filter((f) => f.demoKey && !data.rooms.some((r) => r.floorId === f.id))) {
      check(await this.sb.from("floors").delete().eq("id", f.id));
    }
  }
}
