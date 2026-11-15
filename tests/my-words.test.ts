import { describe, expect, it } from "vitest";
import { openDB } from "idb";
import { IndexedDbRepository } from "@/lib/idb-repository";
import { cleanWordGroup, splitWordInput } from "@/lib/my-words";
import { parseBackup, serializeBackup } from "@/lib/backup";
import { searchItems, searchRelated } from "@/lib/search";
import { freshRepo, seedPlace } from "./helpers";

describe("マイ辞書の入力", () => {
  it("区切り文字で分け、重複や表記ゆれを除く", () => {
    expect(splitWordInput("ボイラー室、機械室, 裏の部屋 / 倉庫")).toEqual(["ボイラー室", "機械室", "裏の部屋", "倉庫"]);
    expect(cleanWordGroup(["機械室", "機械室", "ｷｶｲｼﾂ", "かいだん"])).toEqual(["機械室", "ｷｶｲｼﾂ", "かいだん"]);
    expect(cleanWordGroup(["カイダン", "かいだん", "階段"])).toEqual(["カイダン", "階段"]);
  });

  it("2語未満・多すぎる・長すぎる入力を拒否する", () => {
    expect(() => cleanWordGroup(["機械室"])).toThrow(/2つ以上/);
    expect(() => cleanWordGroup(["同じ", "同じ"])).toThrow(/2つ以上/);
    expect(() => cleanWordGroup(Array.from({ length: 11 }, (_, i) => `言葉${i}`))).toThrow(/10個まで/);
    expect(() => cleanWordGroup(["あ".repeat(31), "い"])).toThrow(/長すぎ/);
  });
});

describe("マイ辞書の保存", () => {
  it("追加・編集・削除ができ、同じ組み合わせは登録できない", async () => {
    const repo = freshRepo();
    const g = await repo.addWordGroup(["ボイラー室", "機械室"]);
    await expect(repo.addWordGroup(["機械室", "ボイラー室"])).rejects.toMatchObject({ code: "duplicate" });
    await repo.updateWordGroup(g.id, ["ボイラー室", "機械室", "設備室"]);
    expect((await repo.loadAll()).words[0].words).toEqual(["ボイラー室", "機械室", "設備室"]);
    await repo.deleteWordGroup(g.id);
    expect((await repo.loadAll()).words).toEqual([]);
  });

  it("旧版（版1）のデータベースから、データを残したまま更新できる", async () => {
    const name = `upgrade-${Date.now()}`;
    const old = await openDB(name, 1, {
      upgrade(db) {
        db.createObjectStore("floors", { keyPath: "id" });
        db.createObjectStore("rooms", { keyPath: "id" }).createIndex("byFloor", "floorId");
        db.createObjectStore("storages", { keyPath: "id" }).createIndex("byRoom", "roomId");
        db.createObjectStore("items", { keyPath: "id" }).createIndex("byStorage", "storageId");
        db.createObjectStore("photos", { keyPath: "id" });
      },
    });
    await old.put("floors", { id: "f1", name: "1階", order: 0, createdAt: "x", updatedAt: "x" });
    old.close();

    const repo = new IndexedDbRepository(name);
    const data = await repo.loadAll();
    expect(data.floors.map((f) => f.name)).toEqual(["1階"]);
    expect(data.words).toEqual([]);
    await repo.addWordGroup(["物置", "倉庫"]);
    expect((await repo.loadAll()).words).toHaveLength(1);
  });
});

describe("マイ辞書を使った検索", () => {
  it("登録した言い換えで見つかる（双方向）", async () => {
    const repo = freshRepo();
    const { storage } = await seedPlace(repo);
    await repo.addItem({ name: "ボイラー室の鍵", category: "日用品", storageId: storage.id, detail: "", memo: "" });

    let data = await repo.loadAll();
    expect(searchItems(data, { q: "機械室" })).toHaveLength(0);
    expect(searchRelated(data, { q: "機械室" }).views).toHaveLength(0);

    await repo.addWordGroup(["ボイラー室", "機械室"]);
    data = await repo.loadAll();
    const r = searchRelated(data, { q: "機械室" });
    expect(r.views.map((v) => v.item.name)).toEqual(["ボイラー室の鍵"]);
    expect(r.views[0].matchedWords).toEqual(["ボイラー室"]);
  });

  it("内蔵の辞書と組み合わせて使える", async () => {
    const repo = freshRepo();
    const { storage } = await seedPlace(repo);
    await repo.addItem({ name: "ダイキンの説明書", category: "書類", storageId: storage.id, detail: "", memo: "" });
    await repo.addWordGroup(["ダイキン", "リビングのエアコン"]);
    // 「クーラー」→（内蔵）エアコン →（マイ辞書）は使わないが、「リビングのエアコン」→ ダイキン は使える
    const data = await repo.loadAll();
    expect(searchRelated(data, { q: "リビングのエアコン" }).views.map((v) => v.item.name)).toEqual(["ダイキンの説明書"]);
  });
});

describe("マイ辞書のバックアップ", () => {
  it("書き出し・復元でマイ辞書も保持される", async () => {
    const repo = freshRepo();
    await repo.addWordGroup(["ボイラー室", "機械室"]);
    const json = serializeBackup(await repo.exportSnapshot());
    expect(JSON.parse(json).version).toBe(2);
    const { snapshot, summary } = parseBackup(json);
    expect(summary.words).toBe(1);
    const target = freshRepo();
    await target.replaceAll(snapshot);
    expect((await target.loadAll()).words[0].words).toEqual(["ボイラー室", "機械室"]);
  });

  it("マイ辞書がない旧形式（版1）のバックアップも読み込める", async () => {
    const repo = freshRepo();
    await seedPlace(repo);
    const v2 = JSON.parse(serializeBackup(await repo.exportSnapshot()));
    const v1 = { ...v2, version: 1, data: { ...v2.data } };
    delete v1.data.words;
    const { snapshot } = parseBackup(JSON.stringify(v1));
    expect(snapshot.words).toEqual([]);
    expect(snapshot.floors).toHaveLength(1);
  });
});
