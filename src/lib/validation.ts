// 入力の検証（端末保存・クラウド保存で共通）

import { AppError, CATEGORIES, type ItemInput } from "./types";
import { cleanName } from "./text";

export const LIMITS = {
  name: 60,
  detail: 200,
  memo: 1000,
} as const;

export function requireName(value: string, label: string): string {
  const name = cleanName(value);
  if (!name) throw new AppError(`${label}を入力してください。`);
  if (name.length > LIMITS.name) throw new AppError(`${label}は${LIMITS.name}文字以内で入力してください。`);
  return name;
}

export function optionalText(value: string, label: string, max: number): string {
  const text = value.trim();
  if (text.length > max) throw new AppError(`${label}は${max}文字以内で入力してください。`);
  return text;
}

export function validateItem(input: ItemInput): ItemInput {
  const name = requireName(input.name, "名前");
  if (!CATEGORIES.includes(input.category)) throw new AppError("カテゴリを選んでください。");
  if (!input.storageId) throw new AppError("収納場所を選んでください。");
  return {
    name,
    category: input.category,
    storageId: input.storageId,
    detail: optionalText(input.detail, "詳しい位置", LIMITS.detail),
    memo: optionalText(input.memo, "メモ", LIMITS.memo),
  };
}
