// Supabase のエラーを、画面に出せる日本語のエラーに変換する

import { AppError } from "../types";

interface ErrorLike {
  code?: string;
  message?: string;
}

const RPC_MESSAGES: Record<string, string> = {
  not_signed_in: "接続が切れました。ページを再読み込みしてください。",
  already_member: "この端末はすでに家族に参加しています。",
  household_creation_closed: "このアプリには、すでに家族が登録されています。家族から招待リンクをもらって参加してください。",
  invite_not_found: "招待コードが正しくありません。もう一度確認してください。",
  invite_expired: "この招待は期限切れか、取り消されています。家族に新しい招待リンクを作ってもらってください。",
  forbidden: "この操作はできません。",
  cannot_remove_self: "自分自身は外せません。",
  owner_cannot_leave: "家族を作った人（管理者）は抜けられません。",
  // 部分一致で判定するため、長い名前を先に置く
  target_not_found: "移動先の収納場所が見つかりません。",
  not_found: "対象が見つかりません。ほかの家族が削除した可能性があります。",
};

/**
 * データベースの値の制約（check 制約）に違反したときのメッセージ。制約名で引く。
 * 画面側でも同じ検証をしているため、ここに来るのは主にデータベースの設定が古い場合。
 */
const CHECK_MESSAGES: Record<string, string> = {
  items_category_check:
    "新しいカテゴリ名を受け付けられませんでした。カテゴリ名は1〜20文字にしてください。" +
    "文字数に問題がない場合は、データベースの設定が古い可能性があります。" +
    "管理者に、設定手順の SQL（0002_custom_categories.sql）を実行済みか確認してもらってください。",
  items_name_check: "名前は1〜60文字で入力してください。",
  floors_name_check: "階の名前は1〜60文字で入力してください。",
  rooms_name_check: "部屋の名前は1〜60文字で入力してください。",
  storages_name_check: "収納場所の名前は1〜60文字で入力してください。",
  items_detail_check: "詳しい位置は200文字以内で入力してください。",
  items_memo_check: "メモは1000文字以内で入力してください。",
  households_name_check: "家族の名前は1〜40文字で入力してください。",
  members_display_name_check: "表示名は1〜30文字で入力してください。",
  word_groups_words_check: "マイ辞書は、同じ意味の言葉を2〜10個で登録してください。",
};

const CHECK_FALLBACK = "入力内容をデータベースが受け付けませんでした。文字数などを確認してください。";

/** check 制約の違反（23514）を、制約名に応じた日本語のエラーにする */
function checkViolation(message: string): AppError {
  const name = message.match(/check constraint "([^"]+)"/)?.[1] ?? "";
  return new AppError(CHECK_MESSAGES[name] ?? CHECK_FALLBACK, "validation");
}

/**
 * @param duplicate 重複したときのメッセージ
 * @param hasChildren 中身があって削除できないときのメッセージ
 */
export function toAppError(
  error: unknown,
  messages: { duplicate?: string; hasChildren?: string; fallback?: string } = {},
): AppError {
  if (error instanceof AppError) return error;
  const e = (error ?? {}) as ErrorLike;
  const message = e.message ?? "";

  for (const [key, text] of Object.entries(RPC_MESSAGES)) {
    if (message.includes(key)) {
      return new AppError(text, key === "already_member" ? "duplicate" : key === "not_found" ? "not_found" : "validation");
    }
  }
  if (e.code === "23505") return new AppError(messages.duplicate ?? "同じ名前がすでにあります。", "duplicate");
  if (e.code === "23514") return checkViolation(message);
  if (e.code === "23503") {
    return new AppError(
      messages.hasChildren ?? "ほかのデータから使われているため、この操作はできません。",
      "has_children",
    );
  }
  if (e.code === "42501" || /row-level security/i.test(message)) {
    return new AppError("この操作はできません。家族のメンバーから外れた可能性があります。", "storage");
  }
  if (error instanceof TypeError || /fetch|network|Failed to/i.test(message)) {
    return new AppError("通信できませんでした。電波の良い場所でもう一度お試しください。", "storage");
  }
  return new AppError(messages.fallback ?? "保存できませんでした。もう一度お試しください。", "storage");
}
