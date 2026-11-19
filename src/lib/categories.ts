// カテゴリ。最初から用意している CATEGORIES に加えて、ものの登録時に家族が新しいカテゴリを追加できる。
// 追加したカテゴリは、そのカテゴリのものに名前として保存し、使われている間は選択肢に出す。

import { AppError, CATEGORIES, CATEGORY_MAX, type Category } from "./types";
import { cleanName, sameName } from "./text";

/** 選べるカテゴリ：最初から用意しているもの ＋ ものに使われている追加分（名前順） */
export function categoryOptions(
  items: readonly { category: Category }[],
  ...extra: (Category | null | undefined)[]
): Category[] {
  const builtIn: Category[] = [...CATEGORIES];
  const added: Category[] = [];
  for (const c of [...items.map((i) => i.category), ...extra]) {
    if (!c) continue;
    if (builtIn.some((x) => sameName(x, c)) || added.some((x) => sameName(x, c))) continue;
    added.push(c);
  }
  added.sort((a, b) => a.localeCompare(b, "ja"));
  return [...builtIn, ...added];
}

/** カテゴリ名を整えて検証する */
export function requireCategory(value: string): Category {
  const name = cleanName(value);
  if (!name) throw new AppError("カテゴリを選ぶか、カテゴリ名を入力してください。");
  if (name.length > CATEGORY_MAX) throw new AppError(`カテゴリ名は${CATEGORY_MAX}文字以内で入力してください。`);
  return name;
}

/** 入力されたカテゴリ名を整える。すでにある名前と同じなら、そちらの表記にそろえる */
export function resolveCategory(value: string, existing: readonly Category[]): Category {
  const name = requireCategory(value);
  return existing.find((c) => sameName(c, name)) ?? name;
}
