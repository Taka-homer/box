// ブラウザ側のAI検索呼び出し。写真は送らず、名前・カテゴリ・詳しい位置・メモだけを送る。

import {
  keepKnownMatches,
  type AiCandidate,
  type AiSearchMatch,
  type AiSearchResponse,
  type AiStatusResponse,
} from "./ai-search-types";
import type { Item } from "./types";
import { AppError } from "./types";
import { getAccessToken } from "./cloud/client";

export async function fetchAiStatus(): Promise<boolean> {
  try {
    const res = await fetch("/api/ai-search", { cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as AiStatusResponse;
    return data.available === true;
  } catch {
    return false;
  }
}

export function toCandidates(items: Item[]): AiCandidate[] {
  return items.map((i) => ({
    id: i.id,
    name: i.name.slice(0, 200),
    category: i.category,
    detail: i.detail.slice(0, 400),
    memo: i.memo.slice(0, 2000),
  }));
}

export async function aiSearch(query: string, items: Item[], signal?: AbortSignal): Promise<AiSearchMatch[]> {
  let res: Response;
  const token = await getAccessToken().catch(() => null);
  try {
    res = await fetch("/api/ai-search", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ query, candidates: toCandidates(items) }),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new AppError("通信できませんでした。通常検索をご利用ください。");
  }
  let data: AiSearchResponse;
  try {
    data = (await res.json()) as AiSearchResponse;
  } catch {
    throw new AppError("AI検索に失敗しました。通常検索をご利用ください。");
  }
  if (!data.ok) throw new AppError(data.error);
  // 画面に出す前にも、端末内に実在する登録物かを確認する
  return keepKnownMatches(data.matches, items.map((i) => i.id));
}
