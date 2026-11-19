// IndexedDB による保存処理。写真は ArrayBuffer として別ストアに保存する。

import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction, type StoreNames } from "idb";
import type { CreateOptions, Repository } from "./repository";
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
} from "./types";
import { cleanWordGroup, sameWordSet } from "./my-words";
import { newId, sameName } from "./text";
import { checkCategoryRename } from "./categories";
import { LIMITS, optionalText, requireName, validateItem } from "./validation";

export { LIMITS } from "./validation";

interface WagayaDB extends DBSchema {
  floors: { key: string; value: Floor };
  rooms: { key: string; value: Room; indexes: { byFloor: string } };
  storages: { key: string; value: Storage; indexes: { byRoom: string } };
  items: { key: string; value: Item; indexes: { byStorage: string } };
  photos: { key: string; value: PhotoRecord };
  words: { key: string; value: WordGroup };
}

type Names = StoreNames<WagayaDB>;
type Tx<M extends IDBTransactionMode> = IDBPTransaction<WagayaDB, Names[], M>;

const ALL_STORES: Names[] = ["floors", "rooms", "storages", "items", "photos", "words"];

/** データベースの版。2 でマイ辞書を追加 */
export const DB_VERSION = 2;

function now() {
  return new Date().toISOString();
}

async function preparePhoto(change: PhotoChange | undefined): Promise<PhotoRecord | null> {
  if (!change || change.kind !== "set") return null;
  const data = await change.blob.arrayBuffer();
  return { id: newId(), type: change.blob.type || "image/jpeg", data, createdAt: now() };
}

/** 写真の変更をトランザクション内で適用し、新しい写真IDを返す */
async function applyPhoto(
  tx: Tx<"readwrite">,
  currentId: string | null,
  change: PhotoChange | undefined,
  prepared: PhotoRecord | null,
): Promise<string | null> {
  if (!change || change.kind === "keep") return currentId;
  const photos = tx.objectStore("photos");
  if (currentId) await photos.delete(currentId);
  if (change.kind === "remove") return null;
  if (!prepared) throw new AppError("写真を保存できませんでした。", "storage");
  await photos.put(prepared);
  return prepared.id;
}

export class IndexedDbRepository implements Repository {
  private dbPromise: Promise<IDBPDatabase<WagayaDB>> | null = null;

  constructor(private readonly dbName = "wagaya-shuno") {}

  private db() {
    if (!this.dbPromise) {
      if (typeof indexedDB === "undefined") {
        return Promise.reject(new AppError("このブラウザではデータを保存できません。", "storage"));
      }
      this.dbPromise = openDB<WagayaDB>(this.dbName, DB_VERSION, {
        upgrade(db, oldVersion) {
          // 既存のデータは残したまま、足りない保存場所だけを追加する
          if (oldVersion < 1) {
            db.createObjectStore("floors", { keyPath: "id" });
            db.createObjectStore("rooms", { keyPath: "id" }).createIndex("byFloor", "floorId");
            db.createObjectStore("storages", { keyPath: "id" }).createIndex("byRoom", "roomId");
            db.createObjectStore("items", { keyPath: "id" }).createIndex("byStorage", "storageId");
            db.createObjectStore("photos", { keyPath: "id" });
          }
          if (oldVersion < 2) {
            db.createObjectStore("words", { keyPath: "id" });
          }
        },
      })
        .then((db) => {
          // 別のタブで新しい版に更新されるときは、こちらの接続を閉じて更新を妨げない
          db.addEventListener("versionchange", () => {
            db.close();
            this.dbPromise = null;
          });
          return db;
        })
        .catch((e) => {
          this.dbPromise = null;
          throw e instanceof AppError
            ? e
            : new AppError(
                "データを開けませんでした。プライベートブラウズの場合は通常の画面でお試しください。",
                "storage",
              );
        });
    }
    return this.dbPromise;
  }

  private async tx(mode: IDBTransactionMode = "readwrite") {
    const db = await this.db();
    return db.transaction(ALL_STORES, mode) as Tx<"readwrite">;
  }

  async close() {
    if (this.dbPromise) (await this.dbPromise).close();
    this.dbPromise = null;
  }

  // ---- 読み込み ----

  async loadAll(): Promise<AppData> {
    const tx = await this.tx("readonly");
    const [floors, rooms, storages, items, words] = await Promise.all([
      tx.objectStore("floors").getAll(),
      tx.objectStore("rooms").getAll(),
      tx.objectStore("storages").getAll(),
      tx.objectStore("items").getAll(),
      tx.objectStore("words").getAll(),
    ]);
    await tx.done;
    floors.sort((a, b) => a.order - b.order);
    rooms.sort((a, b) => a.order - b.order);
    storages.sort((a, b) => a.name.localeCompare(b.name, "ja"));
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    words.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { floors, rooms, storages, items, words };
  }

  async getPhoto(photoId: string): Promise<Blob | null> {
    const db = await this.db();
    const rec = await db.get("photos", photoId);
    return rec ? new Blob([rec.data], { type: rec.type }) : null;
  }

  // ---- 階 ----

  async addFloor(nameValue: string, options?: CreateOptions): Promise<Floor> {
    const name = requireName(nameValue, "階の名前");
    const tx = await this.tx();
    const floors = await tx.objectStore("floors").getAll();
    if (floors.some((f) => sameName(f.name, name))) {
      throw new AppError(`「${name}」はすでに登録されています。`, "duplicate");
    }
    const t = now();
    const floor: Floor = {
      id: newId(),
      name,
      order: floors.reduce((m, f) => Math.max(m, f.order), -1) + 1,
      ...(options?.demoKey ? { demoKey: options.demoKey } : {}),
      createdAt: t,
      updatedAt: t,
    };
    await tx.objectStore("floors").add(floor);
    await tx.done;
    return floor;
  }

  async renameFloor(id: string, nameValue: string): Promise<void> {
    const name = requireName(nameValue, "階の名前");
    const tx = await this.tx();
    const store = tx.objectStore("floors");
    const floor = await store.get(id);
    if (!floor) throw new AppError("階が見つかりません。", "not_found");
    const all = await store.getAll();
    if (all.some((f) => f.id !== id && sameName(f.name, name))) {
      throw new AppError(`「${name}」はすでに登録されています。`, "duplicate");
    }
    await store.put({ ...floor, name, updatedAt: now() });
    await tx.done;
  }

  async reorderFloors(orderedIds: string[]): Promise<void> {
    const tx = await this.tx();
    const store = tx.objectStore("floors");
    for (const [index, id] of orderedIds.entries()) {
      const floor = await store.get(id);
      if (floor && floor.order !== index) await store.put({ ...floor, order: index });
    }
    await tx.done;
  }

  async deleteFloor(id: string): Promise<void> {
    const tx = await this.tx();
    const floor = await tx.objectStore("floors").get(id);
    if (!floor) throw new AppError("階が見つかりません。", "not_found");
    const count = await tx.objectStore("rooms").index("byFloor").count(id);
    if (count > 0) {
      throw new AppError(`「${floor.name}」には部屋が${count}件あります。先に部屋を削除してください。`, "has_children");
    }
    await tx.objectStore("floors").delete(id);
    await tx.done;
  }

  // ---- 部屋 ----

  private async assertRoomNameFree(tx: Tx<"readwrite">, floorId: string, name: string, exceptId?: string) {
    const rooms = await tx.objectStore("rooms").index("byFloor").getAll(floorId);
    if (rooms.some((r) => r.id !== exceptId && sameName(r.name, name))) {
      throw new AppError(`この階には「${name}」がすでにあります。`, "duplicate");
    }
    return rooms;
  }

  async addRoom(floorId: string, nameValue: string, options?: CreateOptions): Promise<Room> {
    const name = requireName(nameValue, "部屋の名前");
    const tx = await this.tx();
    if (!(await tx.objectStore("floors").get(floorId))) throw new AppError("階を選んでください。", "not_found");
    const rooms = await this.assertRoomNameFree(tx, floorId, name);
    const t = now();
    const room: Room = {
      id: newId(),
      floorId,
      name,
      order: rooms.reduce((m, r) => Math.max(m, r.order), -1) + 1,
      ...(options?.demoKey ? { demoKey: options.demoKey } : {}),
      createdAt: t,
      updatedAt: t,
    };
    await tx.objectStore("rooms").add(room);
    await tx.done;
    return room;
  }

  async renameRoom(id: string, nameValue: string): Promise<void> {
    const name = requireName(nameValue, "部屋の名前");
    const tx = await this.tx();
    const room = await tx.objectStore("rooms").get(id);
    if (!room) throw new AppError("部屋が見つかりません。", "not_found");
    await this.assertRoomNameFree(tx, room.floorId, name, id);
    await tx.objectStore("rooms").put({ ...room, name, updatedAt: now() });
    await tx.done;
  }

  async reorderRooms(floorId: string, orderedIds: string[]): Promise<void> {
    const tx = await this.tx();
    const store = tx.objectStore("rooms");
    for (const [index, id] of orderedIds.entries()) {
      const room = await store.get(id);
      if (room && room.floorId === floorId && room.order !== index) await store.put({ ...room, order: index });
    }
    await tx.done;
  }

  async deleteRoom(id: string): Promise<void> {
    const tx = await this.tx();
    const room = await tx.objectStore("rooms").get(id);
    if (!room) throw new AppError("部屋が見つかりません。", "not_found");
    const count = await tx.objectStore("storages").index("byRoom").count(id);
    if (count > 0) {
      throw new AppError(
        `「${room.name}」には収納場所が${count}件あります。先に収納場所を削除してください。`,
        "has_children",
      );
    }
    await tx.objectStore("rooms").delete(id);
    await tx.done;
  }

  // ---- 収納場所 ----

  private async assertStorageNameFree(tx: Tx<"readwrite">, roomId: string, name: string, exceptId?: string) {
    const list = await tx.objectStore("storages").index("byRoom").getAll(roomId);
    if (list.some((s) => s.id !== exceptId && sameName(s.name, name))) {
      throw new AppError(`この部屋には「${name}」がすでにあります。`, "duplicate");
    }
  }

  async addStorage(input: StorageInput, photo?: PhotoChange, options?: CreateOptions): Promise<Storage> {
    const name = requireName(input.name, "収納場所の名前");
    const prepared = await preparePhoto(photo);
    const tx = await this.tx();
    if (!(await tx.objectStore("rooms").get(input.roomId))) throw new AppError("部屋を選んでください。", "not_found");
    await this.assertStorageNameFree(tx, input.roomId, name);
    const t = now();
    const storage: Storage = {
      id: newId(),
      roomId: input.roomId,
      name,
      photoId: await applyPhoto(tx, null, photo, prepared),
      ...(options?.demoKey ? { demoKey: options.demoKey } : {}),
      createdAt: t,
      updatedAt: t,
    };
    await tx.objectStore("storages").add(storage);
    await tx.done;
    return storage;
  }

  async updateStorage(id: string, input: StorageInput, photo: PhotoChange): Promise<void> {
    const name = requireName(input.name, "収納場所の名前");
    const prepared = await preparePhoto(photo);
    const tx = await this.tx();
    const storage = await tx.objectStore("storages").get(id);
    if (!storage) throw new AppError("収納場所が見つかりません。", "not_found");
    if (!(await tx.objectStore("rooms").get(input.roomId))) throw new AppError("部屋を選んでください。", "not_found");
    await this.assertStorageNameFree(tx, input.roomId, name, id);
    const photoId = await applyPhoto(tx, storage.photoId, photo, prepared);
    await tx.objectStore("storages").put({ ...storage, name, roomId: input.roomId, photoId, updatedAt: now() });
    await tx.done;
  }

  async deleteStorage(id: string): Promise<void> {
    const tx = await this.tx();
    const storage = await tx.objectStore("storages").get(id);
    if (!storage) throw new AppError("収納場所が見つかりません。", "not_found");
    const count = await tx.objectStore("items").index("byStorage").count(id);
    if (count > 0) {
      throw new AppError(
        `「${storage.name}」には${count}点のものが登録されています。別の収納場所へ移動してから削除してください。`,
        "has_children",
      );
    }
    if (storage.photoId) await tx.objectStore("photos").delete(storage.photoId);
    await tx.objectStore("storages").delete(id);
    await tx.done;
  }

  async moveItemsAndDeleteStorage(id: string, targetStorageId: string): Promise<number> {
    if (id === targetStorageId) throw new AppError("別の収納場所を選んでください。");
    const tx = await this.tx();
    const storage = await tx.objectStore("storages").get(id);
    if (!storage) throw new AppError("収納場所が見つかりません。", "not_found");
    if (!(await tx.objectStore("storages").get(targetStorageId))) {
      throw new AppError("移動先の収納場所が見つかりません。", "not_found");
    }
    const items = await tx.objectStore("items").index("byStorage").getAll(id);
    const t = now();
    for (const item of items) {
      await tx.objectStore("items").put({ ...item, storageId: targetStorageId, updatedAt: t });
    }
    if (storage.photoId) await tx.objectStore("photos").delete(storage.photoId);
    await tx.objectStore("storages").delete(id);
    await tx.done;
    return items.length;
  }

  // ---- もの・書類 ----

  async addItem(inputValue: ItemInput, photo?: PhotoChange, options?: CreateOptions): Promise<Item> {
    const input = validateItem(inputValue);
    const prepared = await preparePhoto(photo);
    const tx = await this.tx();
    if (!(await tx.objectStore("storages").get(input.storageId))) {
      throw new AppError("選んだ収納場所が見つかりません。選び直してください。", "not_found");
    }
    const t = now();
    const item: Item = {
      id: newId(),
      ...input,
      photoId: await applyPhoto(tx, null, photo, prepared),
      status: "normal",
      lastCheckedAt: null,
      ...(options?.demoKey ? { demoKey: options.demoKey } : {}),
      createdAt: t,
      updatedAt: t,
    };
    await tx.objectStore("items").add(item);
    await tx.done;
    return item;
  }

  async updateItem(id: string, inputValue: ItemInput, photo: PhotoChange): Promise<void> {
    const input = validateItem(inputValue);
    const prepared = await preparePhoto(photo);
    const tx = await this.tx();
    const item = await tx.objectStore("items").get(id);
    if (!item) throw new AppError("登録が見つかりません。削除された可能性があります。", "not_found");
    if (!(await tx.objectStore("storages").get(input.storageId))) {
      throw new AppError("選んだ収納場所が見つかりません。選び直してください。", "not_found");
    }
    const photoId = await applyPhoto(tx, item.photoId, photo, prepared);
    await tx.objectStore("items").put({ ...item, ...input, photoId, updatedAt: now() });
    await tx.done;
  }

  async deleteItem(id: string): Promise<void> {
    const tx = await this.tx();
    const item = await tx.objectStore("items").get(id);
    if (!item) throw new AppError("登録が見つかりません。", "not_found");
    if (item.photoId) await tx.objectStore("photos").delete(item.photoId);
    await tx.objectStore("items").delete(id);
    await tx.done;
  }

  private async patchItem(id: string, patch: (item: Item, tx: Tx<"readwrite">) => Promise<Partial<Item>>) {
    const tx = await this.tx();
    const item = await tx.objectStore("items").get(id);
    if (!item) throw new AppError("登録が見つかりません。", "not_found");
    const changes = await patch(item, tx);
    await tx.objectStore("items").put({ ...item, ...changes, updatedAt: now() });
    await tx.done;
  }

  markFound(id: string) {
    return this.patchItem(id, async () => ({ status: "normal", lastCheckedAt: now() }));
  }

  markMissing(id: string) {
    // 最後に記録された場所は残し、状態だけ変える
    return this.patchItem(id, async () => ({ status: "missing" }));
  }

  moveItem(id: string, storageId: string, detailValue: string) {
    const detail = optionalText(detailValue, "詳しい位置", LIMITS.detail);
    return this.patchItem(id, async (_item, tx) => {
      if (!(await tx.objectStore("storages").get(storageId))) {
        throw new AppError("移動先の収納場所を選んでください。", "not_found");
      }
      return { storageId, detail, status: "normal", lastCheckedAt: now() };
    });
  }

  async renameCategory(from: string, toValue: string): Promise<number> {
    const to = checkCategoryRename(from, toValue);
    if (to === from) return 0;
    const tx = await this.tx();
    const items = (await tx.objectStore("items").getAll()).filter((i) => i.category === from);
    const t = now();
    for (const item of items) {
      await tx.objectStore("items").put({ ...item, category: to, updatedAt: t });
    }
    await tx.done;
    return items.length;
  }

  // ---- マイ辞書 ----

  private async assertWordsFree(tx: Tx<"readwrite">, words: string[], exceptId?: string) {
    const all = await tx.objectStore("words").getAll();
    if (all.some((g) => g.id !== exceptId && sameWordSet(g.words, words))) {
      throw new AppError("同じ組み合わせの言葉がすでに登録されています。", "duplicate");
    }
  }

  async addWordGroup(input: string[]): Promise<WordGroup> {
    const words = cleanWordGroup(input);
    const tx = await this.tx();
    await this.assertWordsFree(tx, words);
    const t = now();
    const group: WordGroup = { id: newId(), words, createdAt: t, updatedAt: t };
    await tx.objectStore("words").add(group);
    await tx.done;
    return group;
  }

  async updateWordGroup(id: string, input: string[]): Promise<void> {
    const words = cleanWordGroup(input);
    const tx = await this.tx();
    const group = await tx.objectStore("words").get(id);
    if (!group) throw new AppError("登録が見つかりません。", "not_found");
    await this.assertWordsFree(tx, words, id);
    await tx.objectStore("words").put({ ...group, words, updatedAt: now() });
    await tx.done;
  }

  async deleteWordGroup(id: string): Promise<void> {
    const tx = await this.tx();
    await tx.objectStore("words").delete(id);
    await tx.done;
  }

  // ---- 一括 ----

  async exportSnapshot(): Promise<Snapshot> {
    const data = await this.loadAll();
    const db = await this.db();
    const photos = await db.getAll("photos");
    return { ...data, photos };
  }

  async replaceAll(snapshot: Snapshot): Promise<void> {
    const tx = await this.tx();
    for (const name of ALL_STORES) await tx.objectStore(name).clear();
    for (const f of snapshot.floors) await tx.objectStore("floors").put(f);
    for (const r of snapshot.rooms) await tx.objectStore("rooms").put(r);
    for (const s of snapshot.storages) await tx.objectStore("storages").put(s);
    for (const i of snapshot.items) await tx.objectStore("items").put(i);
    for (const p of snapshot.photos) await tx.objectStore("photos").put(p);
    for (const w of snapshot.words) await tx.objectStore("words").put(w);
    await tx.done;
  }

  async removeDemoData(): Promise<void> {
    const tx = await this.tx();
    const items = await tx.objectStore("items").getAll();
    for (const item of items.filter((i) => i.demoKey)) {
      if (item.photoId) await tx.objectStore("photos").delete(item.photoId);
      await tx.objectStore("items").delete(item.id);
    }
    for (const s of await tx.objectStore("storages").getAll()) {
      if (s.demoKey && (await tx.objectStore("items").index("byStorage").count(s.id)) === 0) {
        if (s.photoId) await tx.objectStore("photos").delete(s.photoId);
        await tx.objectStore("storages").delete(s.id);
      }
    }
    for (const r of await tx.objectStore("rooms").getAll()) {
      if (r.demoKey && (await tx.objectStore("storages").index("byRoom").count(r.id)) === 0) {
        await tx.objectStore("rooms").delete(r.id);
      }
    }
    for (const f of await tx.objectStore("floors").getAll()) {
      if (f.demoKey && (await tx.objectStore("rooms").index("byFloor").count(f.id)) === 0) {
        await tx.objectStore("floors").delete(f.id);
      }
    }
    await tx.done;
  }
}
