// マイ辞書の入力の整理と検証

import { AppError } from "./types";
import { normalizeText } from "./text";

export const WORD_LIMITS = {
  minWords: 2,
  maxWords: 10,
  maxLength: 30,
} as const;

/** 「、」「,」「/」やスペース、改行で区切られた入力を言葉の配列にする */
export function splitWordInput(text: string): string[] {
  return text
    .split(/[、，,／/・\s]+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

/** 重複を除き、件数・長さを確かめる。問題があれば AppError を投げる */
export function cleanWordGroup(words: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of words) {
    const word = raw.normalize("NFC").replace(/\s+/g, " ").trim();
    if (!word) continue;
    if (word.length > WORD_LIMITS.maxLength) {
      throw new AppError(`「${word.slice(0, 10)}…」が長すぎます。1つの言葉は${WORD_LIMITS.maxLength}文字以内にしてください。`);
    }
    const key = normalizeText(word);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(word);
  }
  if (result.length < WORD_LIMITS.minWords) {
    throw new AppError("同じ意味の言葉を2つ以上入力してください（例：ボイラー室、機械室）。");
  }
  if (result.length > WORD_LIMITS.maxWords) {
    throw new AppError(`1つの組に登録できる言葉は${WORD_LIMITS.maxWords}個までです。`);
  }
  return result;
}

/** 言葉の組が同じ内容か（順番・表記ゆれは問わない） */
export function sameWordSet(a: string[], b: string[]): boolean {
  const ka = new Set(a.map(normalizeText));
  const kb = new Set(b.map(normalizeText));
  return ka.size === kb.size && [...ka].every((k) => kb.has(k));
}
