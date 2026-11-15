import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { AiCandidate, AiSearchMatch } from "@/lib/ai-search-types";
import type { AiSearchAdapter } from "./adapter";

const resultSchema = z.object({
  matches: z.array(
    z.object({
      id: z.string(),
      reason: z.string(),
    }),
  ),
});

const SYSTEM_PROMPT = `あなたは家庭の収納管理アプリの検索係です。
利用者は、ものの名前を忘れていても、用途・特徴・あいまいな言葉で探します。
渡された「登録済みのもの」一覧から、質問に役立つものを関連が強い順に選んでください。

- 一覧にあるIDだけを返してください。一覧にないものを作らないでください。
- 収納場所や位置を推測して書かないでください。
- 関連するものがなければ、空の一覧を返してください。
- reason には、選んだ理由を日本語20文字程度で書いてください。
- 最大20件までにしてください。`;

export class AnthropicSearchAdapter implements AiSearchAdapter {
  readonly name = "anthropic";
  private readonly client: Anthropic;

  constructor(private readonly model: string) {
    // 認証情報はサーバーの環境変数（ANTHROPIC_API_KEY）から読み込まれ、ブラウザには渡らない
    this.client = new Anthropic({ timeout: 60_000, maxRetries: 1 });
  }

  async search(query: string, candidates: AiCandidate[], signal?: AbortSignal): Promise<AiSearchMatch[]> {
    if (candidates.length === 0) return [];
    const list = candidates.map((c) => ({
      id: c.id,
      名前: c.name,
      カテゴリ: c.category,
      ...(c.detail ? { 詳しい位置: c.detail } : {}),
      ...(c.memo ? { メモ: c.memo } : {}),
    }));

    const response = await this.client.beta.messages.parse(
      {
        model: this.model,
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: SYSTEM_PROMPT,
        output_config: { effort: "low", format: betaZodOutputFormat(resultSchema) },
        messages: [
          {
            role: "user",
            content: `登録済みのもの:\n${JSON.stringify(list)}\n\n質問: ${query}`,
          },
        ],
      },
      { signal },
    );

    if (response.stop_reason === "refusal") throw new Error("AI search was declined");
    if (!response.parsed_output) throw new Error("AI search returned no result");
    return response.parsed_output.matches;
  }
}
