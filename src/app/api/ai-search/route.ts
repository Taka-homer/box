import { getAiSearchAdapter } from "@/server/ai-search";
import { handleAiSearch, MAX_BODY_BYTES } from "@/server/ai-search/handle";
import type { AiStatusResponse } from "@/lib/ai-search-types";
import { connection } from "next/server";

/** AI検索が使えるかどうかだけを返す（キーなどの設定内容は返さない） */
export async function GET() {
  // 環境変数は起動時の設定を見るため、ビルド時に固定しない
  await connection();
  const body: AiStatusResponse = { available: getAiSearchAdapter() !== null };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES) {
    return Response.json({ ok: false, error: "登録数が多すぎるため、AI検索を利用できません。" }, { status: 413 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "検索内容を確認してください。" }, { status: 400 });
  }
  const result = await handleAiSearch(getAiSearchAdapter(), body, request.signal);
  return Response.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
