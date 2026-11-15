import "server-only";
import type { AiSearchAdapter } from "./adapter";
import { AnthropicSearchAdapter } from "./anthropic";

/**
 * 環境変数から使用するAI検索アダプターを選ぶ。
 * 未設定なら null を返し、アプリは通常検索だけで動作する。
 *
 *   AI_SEARCH_PROVIDER=anthropic
 *   ANTHROPIC_API_KEY=...
 *   AI_SEARCH_MODEL=claude-opus-5-5   （任意）
 */
export function getAiSearchAdapter(env: Record<string, string | undefined> = process.env): AiSearchAdapter | null {
  const provider = env.AI_SEARCH_PROVIDER?.trim().toLowerCase();
  if (provider === "anthropic" && env.ANTHROPIC_API_KEY) {
    return new AnthropicSearchAdapter(env.AI_SEARCH_MODEL?.trim() || "claude-opus-5-5");
  }
  return null;
}
