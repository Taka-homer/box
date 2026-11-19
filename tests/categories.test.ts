import { describe, expect, it } from "vitest";
import { addedCategories, categoryOptions, requireCategory, resolveCategory } from "@/lib/categories";
import { CATEGORIES, DEFAULT_CATEGORY } from "@/lib/types";
import { freshRepo } from "./helpers";

describe("カテゴリの追加", () => {
  it("最初から用意しているカテゴリの後に、ものに使われている追加分を名前順で並べる", () => {
    const items = [{ category: "書類" }, { category: "子どもの作品" }, { category: "アウトドア用品" }, { category: "子どもの作品" }];
    expect(categoryOptions(items)).toEqual([...CATEGORIES, "アウトドア用品", "子どもの作品"]);
  });

  it("入力中や編集中のカテゴリも選択肢に含める", () => {
    expect(categoryOptions([], "キャンプ", null, undefined)).toEqual([...CATEGORIES, "キャンプ"]);
  });

  it("すでにある名前と同じなら、その表記にそろえる", () => {
    expect(resolveCategory("  書類 ", [...CATEGORIES])).toBe("書類");
    expect(resolveCategory("キャンプ　用品", [...CATEGORIES])).toBe("キャンプ 用品");
  });

  it("空や長すぎる名前はエラーにする", () => {
    expect(() => requireCategory("   ")).toThrow();
    expect(() => requireCategory("あ".repeat(21))).toThrow("20文字以内");
  });

  it("追加したカテゴリで、ものを登録できる", async () => {
    const repo = freshRepo();
    const floor = await repo.addFloor("1階");
    const room = await repo.addRoom(floor.id, "リビング");
    const storage = await repo.addStorage({ roomId: room.id, name: "棚" });
    const item = await repo.addItem({ name: "テント", category: " アウトドア用品 ", storageId: storage.id, detail: "", memo: "" });
    expect(item.category).toBe("アウトドア用品");
    expect(categoryOptions((await repo.loadAll()).items)).toContain("アウトドア用品");
  });
});

describe("追加したカテゴリの変更・削除", () => {
  async function setup() {
    const repo = freshRepo();
    const floor = await repo.addFloor("1階");
    const room = await repo.addRoom(floor.id, "リビング");
    const storage = await repo.addStorage({ roomId: room.id, name: "棚" });
    const add = (name: string, category: string) =>
      repo.addItem({ name, category, storageId: storage.id, detail: "", memo: "" });
    await add("テント", "キャンプ");
    await add("寝袋", "キャンプ");
    await add("保証書", "書類");
    return repo;
  }

  it("追加したカテゴリと件数を一覧にする", async () => {
    const repo = await setup();
    expect(addedCategories((await repo.loadAll()).items)).toEqual([{ name: "キャンプ", count: 2 }]);
  });

  it("名前を変更すると、そのカテゴリのものすべてが変わる", async () => {
    const repo = await setup();
    expect(await repo.renameCategory("キャンプ", " アウトドア ")).toBe(2);
    const items = (await repo.loadAll()).items;
    expect(items.filter((i) => i.category === "アウトドア")).toHaveLength(2);
    expect(items.find((i) => i.name === "保証書")?.category).toBe("書類");
  });

  it("削除すると、そのカテゴリのものは「未分類」になる", async () => {
    const repo = await setup();
    expect(await repo.renameCategory("キャンプ", DEFAULT_CATEGORY)).toBe(2);
    expect(addedCategories((await repo.loadAll()).items)).toEqual([]);
  });

  it("最初から用意しているカテゴリは変更できない", async () => {
    const repo = await setup();
    await expect(repo.renameCategory("書類", "紙")).rejects.toThrow("変更・削除できません");
  });
});
