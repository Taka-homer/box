import {
  aiSearchRequestSchema,
  keepKnownMatches,
  type AiSearchResponse,
} from "@/lib/ai-search-types";
import type { AiSearchAdapter } from "./adapter";

export const MAX_BODY_BYTES = 2 * 1024 * 1024;

/** AI検索リクエストを処理する。外部AIの失敗はここで日本語のエラーに変換する */
export async function handleAiSearch(
  adapter: AiSearchAdapter | null,
  body: unknown,
  signal?: AbortSignal,
): Promise<{ status: number; body: AiSearchResponse }> {
  if (!adapter) {
    return { status: 503, body: { ok: false, error: "AI検索は設定されていません。通常検索をご利用ください。" } };
  }
  const parsed = aiSearchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: { ok: false, error: "検索内容を確認してください。" } };
  }
  const { query, candidates } = parsed.data;
  try {
    const raw = await adapter.search(query, candidates, signal);
    const matches = keepKnownMatches(raw, candidates.map((c) => c.id));
    return { status: 200, body: { ok: true, matches } };
  } catch (e) {
    console.error("[ai-search] failed:", e instanceof Error ? e.message : e);
    return {
      status: 502,
      body: { ok: false, error: "AI検索に失敗しました。時間をおいて試すか、通常検索をご利用ください。" },
    };
  }
}
