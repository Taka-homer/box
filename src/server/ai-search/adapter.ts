import type { AiCandidate, AiSearchMatch } from "@/lib/ai-search-types";

/**
 * AI検索アダプター。外部AIの種類を差し替えられるよう、この形だけに依存する。
 * 返すIDは候補内のものでなければならない（呼び出し側でも検証する）。
 * 収納場所はAIに生成させず、保存済みデータから表示する。
 */
export interface AiSearchAdapter {
  readonly name: string;
  search(query: string, candidates: AiCandidate[], signal?: AbortSignal): Promise<AiSearchMatch[]>;
}
