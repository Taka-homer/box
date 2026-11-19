import { describe, expect, it } from "vitest";
import { categoryOptions, requireCategory, resolveCategory } from "@/lib/categories";
import { CATEGORIES } from "@/lib/types";
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
