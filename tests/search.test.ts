import { describe, expect, it } from "vitest";
import { locationLabel, searchItems } from "@/lib/search";
import { addDemoData } from "@/lib/demo";
import { freshRepo } from "./helpers";

async function demoData() {
  const repo = freshRepo();
  await addDemoData(repo);
  return { repo, data: await repo.loadAll() };
}

describe("通常検索", () => {
  it("名前・詳しい位置・メモを対象に検索する", async () => {
    const { data } = await demoData();
    expect(searchItems(data, { q: "保証書" }).map((v) => v.item.name)).toEqual(["エアコンの保証書"]);
    expect(searchItems(data, { q: "青いファイル" }).map((v) => v.item.name)).toEqual(["エアコンの保証書"]);
    expect(searchItems(data, { q: "リビング" }).map((v) => v.item.name)).toEqual(["エアコンの保証書"]);
    expect(searchItems(data, { q: "存在しない" })).toHaveLength(0);
  });

  it("カタカナとひらがな、全角と半角の違いを吸収し、複数語はすべて含むものを返す", async () => {
    const { data } = await demoData();
    expect(searchItems(data, { q: "えあこん" })).toHaveLength(2);
    expect(searchItems(data, { q: "ｴｱｺﾝ 説明書" }).map((v) => v.item.name)).toEqual(["エアコンの取扱説明書"]);
  });

  it("カテゴリ・階・部屋・収納場所を組み合わせて絞り込める", async () => {
    const { data } = await demoData();
    const floor2 = data.floors.find((f) => f.name === "2階")!;
    const study = data.rooms.find((r) => r.name === "書斎")!;
    const shelf = data.storages.find((s) => s.name === "本棚")!;
    expect(searchItems(data, { floorId: floor2.id })).toHaveLength(3);
    expect(searchItems(data, { floorId: floor2.id, category: "書類" })).toHaveLength(2);
    expect(searchItems(data, { roomId: study.id, category: "季節用品" })).toHaveLength(0);
    expect(searchItems(data, { storageId: shelf.id }).map((v) => v.item.name)).toEqual(["エアコンの取扱説明書"]);
  });

  it("場所は 階 → 部屋 → 収納場所 の順に参照から組み立てる", async () => {
    const { repo, data } = await demoData();
    const view = searchItems(data, { q: "電動ドライバー" })[0];
    expect(locationLabel(view)).toBe("1階 → 納戸 → 工具箱");
    // 部屋名を変えると、ものの表示にも反映される
    await repo.renameRoom(view.room!.id, "物置");
    const after = searchItems(await repo.loadAll(), { q: "電動ドライバー" })[0];
    expect(locationLabel(after)).toBe("1階 → 物置 → 工具箱");
  });

  it("最近登録した順に並ぶ", async () => {
    const { data } = await demoData();
    const dates = searchItems(data, {}).map((v) => v.item.createdAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});

describe("見本データ", () => {
  it("繰り返し追加しても重複せず、見本だけを削除できる", async () => {
    const repo = freshRepo();
    expect(await addDemoData(repo)).toBe(7);
    expect(await addDemoData(repo)).toBe(0);
    const data = await repo.loadAll();
    expect(data.items).toHaveLength(7);
    expect(data.floors).toHaveLength(2);
    expect(data.items.every((i) => i.demoKey)).toBe(true);

    // 実データを見本の収納場所に追加すると、その場所は削除時に残る
    const toolbox = data.storages.find((s) => s.name === "工具箱")!;
    await repo.addItem({ name: "メジャー", category: "工具", storageId: toolbox.id, detail: "", memo: "" });
    await repo.removeDemoData();
    const after = await repo.loadAll();
    expect(after.items.map((i) => i.name)).toEqual(["メジャー"]);
    expect(after.storages.map((s) => s.name)).toEqual(["工具箱"]);
    expect(after.floors.map((f) => f.name)).toEqual(["1階"]);
  });

  it("同名の実データの階・部屋があればそれを使う", async () => {
    const repo = freshRepo();
    const f = await repo.addFloor("2階");
    await addDemoData(repo);
    const data = await repo.loadAll();
    expect(data.floors.filter((x) => x.name === "2階")).toHaveLength(1);
    expect(data.floors.find((x) => x.name === "2階")!.id).toBe(f.id);
  });
});
