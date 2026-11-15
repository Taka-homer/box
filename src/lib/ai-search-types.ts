// AI検索でブラウザとサーバーがやり取りするデータの形（写真は含めない）

import { z } from "zod";
import { CATEGORIES } from "./types";

export const AI_MAX_CANDIDATES = 1000;
export const AI_MAX_QUERY = 200;

export const aiCandidateSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().max(200),
  category: z.enum(CATEGORIES),
  detail: z.string().max(400),
  memo: z.string().max(2000),
});

export type AiCandidate = z.infer<typeof aiCandidateSchema>;

export const aiSearchRequestSchema = z.object({
  query: z.string().trim().min(1).max(AI_MAX_QUERY),
  candidates: z.array(aiCandidateSchema).max(AI_MAX_CANDIDATES),
});

export type AiSearchRequest = z.infer<typeof aiSearchRequestSchema>;

export interface AiSearchMatch {
  id: string;
  reason: string;
}

export type AiSearchResponse =
  | { ok: true; matches: AiSearchMatch[] }
  | { ok: false; error: string };

export interface AiStatusResponse {
  available: boolean;
}

/** AIが返したIDのうち、送った候補に実在するものだけを重複なく残す */
export function keepKnownMatches(matches: AiSearchMatch[], knownIds: Iterable<string>): AiSearchMatch[] {
  const known = new Set(knownIds);
  const seen = new Set<string>();
  const result: AiSearchMatch[] = [];
  for (const m of matches) {
    if (!known.has(m.id) || seen.has(m.id)) continue;
    seen.add(m.id);
    result.push({ id: m.id, reason: m.reason.slice(0, 120) });
  }
  return result;
}
