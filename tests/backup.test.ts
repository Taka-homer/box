import { describe, expect, it } from "vitest";
import { BACKUP_FORMAT, BACKUP_VERSION, parseBackup, serializeBackup } from "@/lib/backup";
import { freshRepo, pngBlob, seedPlace } from "./helpers";

async function sample() {
  const repo = freshRepo();
  const { storage } = await seedPlace(repo);
  await repo.updateStorage(storage.id, { roomId: storage.roomId, name: storage.name }, { kind: "set", blob: pngBlob([9, 8, 7]) });
  const item = await repo.addItem(
    { name: "保証書", category: "書類", storageId: storage.id, detail: "上段", memo: "メモ" },
    { kind: "set", blob: pngBlob([1, 2, 3, 4]) },
  );
  await repo.markFound(item.id);
  return repo;
}

describe("バックアップ", () => {
  it("書き出し→別の端末で復元しても、写真と参照関係が保持される", async () => {
    const source = await sample();
    const json = serializeBackup(await source.exportSnapshot());
    const parsed = JSON.parse(json);
    expect(parsed.format).toBe(BACKUP_FORMAT);
    expect(parsed.version).toBe(BACKUP_VERSION);

    const { snapshot, summary } = parseBackup(json);
    expect(summary).toMatchObject({ floors: 1, rooms: 1, storages: 1, items: 1, photos: 2, words: 0 });

    const target = freshRepo();
    await target.addFloor("消えるデータ");
    await target.replaceAll(snapshot);

    const before = await source.exportSnapshot();
    const after = await target.exportSnapshot();
    expect(after.floors).toEqual(before.floors);
    expect(after.items).toEqual(before.items);
    const storage = after.storages[0];
    const storagePhoto = await target.getPhoto(storage.photoId!);
    expect(Array.from(new Uint8Array(await storagePhoto!.arrayBuffer()))).toEqual([9, 8, 7]);
    const itemPhoto = await target.getPhoto(after.items[0].photoId!);
    expect(Array.from(new Uint8Array(await itemPhoto!.arrayBuffer()))).toEqual([1, 2, 3, 4]);
    expect(after.items[0].storageId).toBe(storage.id);
  });

  it("形式が違うファイル・壊れたファイルを拒否する", () => {
    expect(() => parseBackup("{not json")).toThrow(/壊れている/);
    expect(() => parseBackup(JSON.stringify({ hello: 1 }))).toThrow(/バックアップファイルではありません/);
    expect(() =>
      parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 99, exportedAt: "", data: {} })),
    ).toThrow(/新しい版/);
    expect(() =>
      parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: "", data: { floors: [] } })),
    ).toThrow(/不足や誤り/);
  });

  it("参照先のない収納場所・写真を含むバックアップを拒否する", async () => {
    const repo = await sample();
    const good = JSON.parse(serializeBackup(await repo.exportSnapshot()));

    const brokenRef = structuredClone(good);
    brokenRef.data.items[0].storageId = "nothing";
    expect(() => parseBackup(JSON.stringify(brokenRef))).toThrow(/つながりに誤り/);

    const missingPhoto = structuredClone(good);
    missingPhoto.data.photos = [];
    expect(() => parseBackup(JSON.stringify(missingPhoto))).toThrow(/写真が不足/);

    const dupe = structuredClone(good);
    dupe.data.floors.push(dupe.data.floors[0]);
    expect(() => parseBackup(JSON.stringify(dupe))).toThrow(/重複/);

    const badPhoto = structuredClone(good);
    badPhoto.data.photos[0].data = "@@not base64@@";
    expect(() => parseBackup(JSON.stringify(badPhoto))).toThrow(/写真データが壊れて/);
  });
});
