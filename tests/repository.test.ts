import { describe, expect, it } from "vitest";
import { IndexedDbRepository } from "@/lib/idb-repository";
import { AppError } from "@/lib/types";
import { freshRepo, pngBlob, seedPlace } from "./helpers";

const baseItem = { name: "エアコンの保証書", category: "書類" as const, detail: "青いファイル", memo: "" };

describe("階・部屋・収納場所", () => {
  it("同じ階の部屋名、同じ部屋の収納場所名の重複を防ぐ（表記ゆれも含む）", async () => {
    const repo = freshRepo();
    const { floor, room } = await seedPlace(repo);
    await expect(repo.addRoom(floor.id, " 書斎 ")).rejects.toMatchObject({ code: "duplicate" });
    await expect(repo.addStorage({ roomId: room.id, name: "本棚" })).rejects.toMatchObject({ code: "duplicate" });
    await expect(repo.addFloor("２階")).rejects.toMatchObject({ code: "duplicate" });
    // 別の階なら同じ部屋名を使える
    const f1 = await repo.addFloor("1階");
    await expect(repo.addRoom(f1.id, "書斎")).resolves.toBeTruthy();
  });

  it("配下のデータがある階・部屋・収納場所は削除できない", async () => {
    const repo = freshRepo();
    const { floor, room, storage } = await seedPlace(repo);
    await repo.addItem({ ...baseItem, storageId: storage.id });
    await expect(repo.deleteFloor(floor.id)).rejects.toThrow(/部屋が1件/);
    await expect(repo.deleteRoom(room.id)).rejects.toThrow(/収納場所が1件/);
    await expect(repo.deleteStorage(storage.id)).rejects.toThrow(/1点のもの/);
  });

  it("登録物を別の収納場所へ移動してから収納場所を削除できる", async () => {
    const repo = freshRepo();
    const { room, storage } = await seedPlace(repo);
    const other = await repo.addStorage({ roomId: room.id, name: "机の引き出し" });
    const item = await repo.addItem({ ...baseItem, storageId: storage.id });
    expect(await repo.moveItemsAndDeleteStorage(storage.id, other.id)).toBe(1);
    const data = await repo.loadAll();
    expect(data.storages.map((s) => s.id)).toEqual([other.id]);
    expect(data.items.find((i) => i.id === item.id)?.storageId).toBe(other.id);
  });

  it("並べ替えと名前変更が保存される", async () => {
    const repo = freshRepo();
    const a = await repo.addFloor("1階");
    const b = await repo.addFloor("2階");
    await repo.reorderFloors([b.id, a.id]);
    await repo.renameFloor(a.id, "一階");
    const data = await repo.loadAll();
    expect(data.floors.map((f) => f.name)).toEqual(["2階", "一階"]);
  });

  it("収納場所を別の部屋へ移すと、そこにあるものの場所も変わる", async () => {
    const repo = freshRepo();
    const { floor, storage } = await seedPlace(repo);
    const room2 = await repo.addRoom(floor.id, "寝室");
    await repo.addItem({ ...baseItem, storageId: storage.id });
    await repo.updateStorage(storage.id, { roomId: room2.id, name: "本棚（大）" }, { kind: "keep" });
    const data = await repo.loadAll();
    const s = data.storages.find((x) => x.id === data.items[0].storageId)!;
    expect(s.roomId).toBe(room2.id);
    expect(s.name).toBe("本棚（大）");
  });
});

describe("もの・書類", () => {
  it("名前と収納場所が必須", async () => {
    const repo = freshRepo();
    const { storage } = await seedPlace(repo);
    await expect(repo.addItem({ ...baseItem, name: "  ", storageId: storage.id })).rejects.toBeInstanceOf(AppError);
    await expect(repo.addItem({ ...baseItem, storageId: "missing" })).rejects.toMatchObject({ code: "not_found" });
  });

  it("登録時は未確認、見つからない→見つかったで状態と確認日時が変わる", async () => {
    const repo = freshRepo();
    const { storage } = await seedPlace(repo);
    const item = await repo.addItem({ ...baseItem, storageId: storage.id });
    expect(item.lastCheckedAt).toBeNull();
    expect(item.status).toBe("normal");

    await repo.markMissing(item.id);
    let saved = (await repo.loadAll()).items[0];
    expect(saved.status).toBe("missing");
    expect(saved.storageId).toBe(storage.id); // 最後の場所は残る
    expect(saved.lastCheckedAt).toBeNull();

    await repo.markFound(item.id);
    saved = (await repo.loadAll()).items[0];
    expect(saved.status).toBe("normal");
    expect(saved.lastCheckedAt).not.toBeNull();
    expect(saved.createdAt).toBe(item.createdAt);
  });

  it("置き場所の変更で場所・詳しい位置・状態・確認日時が更新され、再読み込み後も保持される", async () => {
    const name = `persist-${Date.now()}`;
    const repo = new IndexedDbRepository(name);
    const { room, storage } = await seedPlace(repo);
    const target = await repo.addStorage({ roomId: room.id, name: "机の引き出し" });
    const item = await repo.addItem({ ...baseItem, storageId: storage.id });
    await repo.markMissing(item.id);
    await repo.moveItem(item.id, target.id, "一番下");
    await repo.close();

    const reopened = new IndexedDbRepository(name);
    const saved = (await reopened.loadAll()).items[0];
    expect(saved.storageId).toBe(target.id);
    expect(saved.detail).toBe("一番下");
    expect(saved.status).toBe("normal");
    expect(saved.lastCheckedAt).not.toBeNull();
  });

  it("ものの写真を追加・変更・削除でき、古い写真は残らない", async () => {
    const repo = freshRepo();
    const { storage } = await seedPlace(repo);
    const item = await repo.addItem({ ...baseItem, storageId: storage.id }, { kind: "set", blob: pngBlob() });
    expect(item.photoId).toBeTruthy();
    const blob = await repo.getPhoto(item.photoId!);
    expect(blob?.type).toBe("image/png");
    expect(new Uint8Array(await blob!.arrayBuffer())[0]).toBe(137);

    await repo.updateItem(item.id, { ...baseItem, storageId: storage.id }, { kind: "set", blob: pngBlob([1, 2]) });
    let snap = await repo.exportSnapshot();
    expect(snap.photos).toHaveLength(1);
    expect(snap.photos[0].id).not.toBe(item.photoId);

    await repo.updateItem(item.id, { ...baseItem, storageId: storage.id }, { kind: "remove" });
    snap = await repo.exportSnapshot();
    expect(snap.photos).toHaveLength(0);
    expect(snap.items[0].photoId).toBeNull();
  });

  it("削除すると写真も消える", async () => {
    const repo = freshRepo();
    const { storage } = await seedPlace(repo);
    const item = await repo.addItem({ ...baseItem, storageId: storage.id }, { kind: "set", blob: pngBlob() });
    await repo.deleteItem(item.id);
    const snap = await repo.exportSnapshot();
    expect(snap.items).toHaveLength(0);
    expect(snap.photos).toHaveLength(0);
  });

  it("収納場所の写真は1つで、その場所のものすべてから参照される", async () => {
    const repo = freshRepo();
    const { room } = await seedPlace(repo);
    const s = await repo.addStorage({ roomId: room.id, name: "押し入れ" }, { kind: "set", blob: pngBlob() });
    await repo.addItem({ ...baseItem, storageId: s.id });
    await repo.addItem({ ...baseItem, name: "取扱説明書", storageId: s.id });
    const snap = await repo.exportSnapshot();
    expect(snap.photos).toHaveLength(1);
    expect(snap.items.every((i) => i.photoId === null)).toBe(true);
  });
});
