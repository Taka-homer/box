import { describe, expect, it } from "vitest";
import { addDemoData } from "@/lib/demo";
import { extractConcepts } from "@/lib/related-words";
import { searchItems, searchRelated } from "@/lib/search";
import { freshRepo } from "./helpers";

async function demoData() {
  const repo = freshRepo();
  await addDemoData(repo);
  return { repo, data: await repo.loadAll() };
}

const names = (r: { views: { item: { name: string } }[] }) => r.views.map((v) => v.item.name);

describe("関連語の取り出し", () => {
  it("文章から辞書の言葉を取り出す（長い言葉を優先）", () => {
    expect(extractConcepts("冷房の修理に必要な書類").map((c) => c.label)).toEqual(["冷房", "修理", "書類"]);
    expect(extractConcepts("取扱説明書").map((c) => c.label)).toEqual(["取扱説明書"]);
    expect(extractConcepts("クーラー 電池").map((c) => c.label)).toEqual(["クーラー", "電池"]);
  });

  it("辞書にない言葉はそのまま使う", () => {
    const [c] = extractConcepts("ぽんぽこ");
    expect(c.label).toBe("ぽんぽこ");
    expect(c.terms.map((t) => t.norm)).toEqual(["ぽんぽこ"]);
  });

  it("言葉の一部だけでも広げる（説明→説明書）", () => {
    const [c] = extractConcepts("説明");
    expect(c.terms.map((t) => t.label)).toContain("取扱説明書");
  });
});

describe("関連語検索", () => {
  it("「冷房の修理に必要な書類」でエアコンの保証書と取扱説明書が見つかる", async () => {
    const { data } = await demoData();
    expect(searchItems(data, { q: "冷房の修理に必要な書類" })).toHaveLength(0);
    const r = searchRelated(data, { q: "冷房の修理に必要な書類" });
    expect(names(r).slice(0, 2).sort()).toEqual(["エアコンの保証書", "エアコンの取扱説明書"].sort());
    expect(names(r)).not.toContain("電動ドライバー");
    expect(r.views[0].matchedWords).toContain("エアコン");
  });

  it("言い換えや用途から探せる", async () => {
    const { data } = await demoData();
    expect(names(searchRelated(data, { q: "クーラー" }))).toEqual(
      expect.arrayContaining(["エアコンの保証書", "エアコンの取扱説明書"]),
    );
    expect(names(searchRelated(data, { q: "棚を組み立てる道具" }))).toEqual(["電動ドライバー"]);
    expect(names(searchRelated(data, { q: "年末に飾るもの" }))).toEqual(["クリスマス飾り"]);
    expect(names(searchRelated(data, { q: "マニュアル" }))).toEqual(["エアコンの取扱説明書"]);
  });

  it("関連は一方向：「修理」では保証書が出るが、「保証書」では説明書に広がらない", async () => {
    const { data } = await demoData();
    expect(names(searchRelated(data, { q: "修理" }))).toEqual(
      expect.arrayContaining(["エアコンの保証書", "エアコンの取扱説明書"]),
    );
    const direct = new Set(searchItems(data, { q: "保証書" }).map((v) => v.item.id));
    expect(names(searchRelated(data, { q: "保証書" }, direct))).toEqual([]);
  });

  it("通常検索で見つかったものは重複して出さない", async () => {
    const { data } = await demoData();
    const direct = searchItems(data, { q: "エアコン" });
    const related = searchRelated(data, { q: "エアコン" }, new Set(direct.map((v) => v.item.id)));
    expect(direct).toHaveLength(2);
    expect(names(related)).not.toContain("エアコンの保証書");
  });

  it("絞り込みも適用される", async () => {
    const { data } = await demoData();
    const floor1 = data.floors.find((f) => f.name === "1階")!;
    expect(searchRelated(data, { q: "冷房の書類", floorId: floor1.id }).views).toHaveLength(0);
  });

  it("関係のない言葉では何も出さない", async () => {
    const { data } = await demoData();
    expect(searchRelated(data, { q: "ぽんぽこ" }).views).toHaveLength(0);
    expect(searchRelated(data, { q: "" }).views).toHaveLength(0);
  });
});
