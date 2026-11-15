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
