import { describe, expect, it } from "vitest";
import { handleAiSearch } from "@/server/ai-search/handle";
import type { AiSearchAdapter } from "@/server/ai-search/adapter";
import { toCandidates } from "@/lib/ai-client";
import { validateImageFile, fitSize } from "@/lib/image";
import type { Item } from "@/lib/types";

const candidates = [
  { id: "a", name: "エアコンの保証書", category: "書類" as const, detail: "", memo: "リビングのエアコン用" },
  { id: "b", name: "エアコンの取扱説明書", category: "書類" as const, detail: "", memo: "" },
];

function fakeAdapter(result: { id: string; reason: string }[] | Error): AiSearchAdapter & { received?: unknown } {
  const adapter: AiSearchAdapter & { received?: unknown } = {
    name: "fake",
    async search(query, cands) {
      adapter.received = { query, cands };
      if (result instanceof Error) throw result;
      return result;
    },
  };
  return adapter;
}

describe("AI検索", () => {
  it("未設定なら利用できないことを返す", async () => {
    const res = await handleAiSearch(null, { query: "x", candidates });
    expect(res.status).toBe(503);
    expect(res.body.ok).toBe(false);
  });

  it("AIが返したIDのうち、実在する登録物だけを返す（重複も除く）", async () => {
    const adapter = fakeAdapter([
      { id: "a", reason: "保証の書類" },
      { id: "made-up", reason: "存在しない" },
      { id: "b", reason: "説明書" },
      { id: "a", reason: "重複" },
    ]);
    const res = await handleAiSearch(adapter, { query: "冷房の修理に必要な書類", candidates });
    expect(res).toEqual({
      status: 200,
      body: { ok: true, matches: [{ id: "a", reason: "保証の書類" }, { id: "b", reason: "説明書" }] },
    });
  });

  it("AIの失敗は日本語のエラーとして返す", async () => {
    const res = await handleAiSearch(fakeAdapter(new Error("boom")), { query: "x", candidates });
    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({ ok: false });
  });

  it("不正なリクエストを拒否する", async () => {
    const res = await handleAiSearch(fakeAdapter([]), { query: "", candidates });
    expect(res.status).toBe(400);
  });

  it("AIへ送る情報は名前・カテゴリ・詳しい位置・メモだけで、写真や場所は含まない", () => {
    const item: Item = {
      id: "a",
      name: "保証書",
      category: "書類",
      storageId: "s1",
      detail: "上段",
      memo: "メモ",
      photoId: "p1",
      status: "normal",
      lastCheckedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(toCandidates([item])).toEqual([{ id: "a", name: "保証書", category: "書類", detail: "上段", memo: "メモ" }]);
  });
});

describe("写真の検証", () => {
  it("画像以外・未対応形式・大きすぎるファイルを拒否する", () => {
    expect(() => validateImageFile({ type: "application/pdf", size: 10 })).toThrow(/画像ファイルを選んで/);
    expect(() => validateImageFile({ type: "image/heic", size: 10 })).toThrow(/対応していません/);
    expect(() => validateImageFile({ type: "image/jpeg", size: 30 * 1024 * 1024 })).toThrow(/大きすぎ/);
    expect(() => validateImageFile({ type: "image/jpeg", size: 1000 })).not.toThrow();
  });

  it("長辺1600pxに収まるよう縦横比を保って縮小する", () => {
    expect(fitSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
