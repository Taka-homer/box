// 家族（household）の作成・参加・招待・メンバー管理

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../types";
import { cleanName } from "../text";
import { toAppError } from "./errors";

export interface Membership {
  householdId: string;
  householdName: string;
  userId: string;
  displayName: string;
  role: "owner" | "member";
}

export interface Member {
  userId: string;
  displayName: string;
  role: "owner" | "member";
  joinedAt: string;
}

export interface Invite {
  id: string;
  code: string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
}

export const DISPLAY_NAME_MAX = 30;
export const HOUSEHOLD_NAME_MAX = 40;

export function validateDisplayName(value: string): string {
  const name = cleanName(value);
  if (!name) throw new AppError("表示名を入力してください（例：ママ、たろう）。");
  if (name.length > DISPLAY_NAME_MAX) throw new AppError(`表示名は${DISPLAY_NAME_MAX}文字以内にしてください。`);
  return name;
}

export function validateHouseholdName(value: string): string {
  const name = cleanName(value);
  if (!name) throw new AppError("家族の名前を入力してください（例：山田家）。");
  if (name.length > HOUSEHOLD_NAME_MAX) throw new AppError(`家族の名前は${HOUSEHOLD_NAME_MAX}文字以内にしてください。`);
  return name;
}

/** 招待コードを入力・表示用に整える（区切りや小文字を許容） */
export function normalizeInviteCode(value: string): string {
  return value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

export function formatInviteCode(code: string): string {
  return normalizeInviteCode(code).replace(/(.{4})(?=.)/g, "$1-");
}

export function inviteLink(origin: string, code: string): string {
  return `${origin}/?invite=${encodeURIComponent(normalizeInviteCode(code))}`;
}

/** パスワードなしでこの端末をログイン状態にする（参加・作成のときだけ使う） */
async function ensureSignedIn(sb: SupabaseClient): Promise<string> {
  const { data } = await sb.auth.getSession();
  if (data.session?.user) return data.session.user.id;
  const { data: signed, error } = await sb.auth.signInAnonymously();
  if (error || !signed.user) {
    throw new AppError(
      "接続できませんでした。通信状況を確認してください。続く場合は、管理者に設定（匿名ログインの有効化）を確認してもらってください。",
      "storage",
    );
  }
  return signed.user.id;
}

/** この端末が参加している家族。未参加なら null */
export async function getMembership(sb: SupabaseClient): Promise<Membership | null> {
  const { data: session } = await sb.auth.getSession();
  const user = session.session?.user;
  if (!user) return null;
  const { data, error } = await sb
    .from("members")
    .select("household_id, display_name, role, households(name)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw toAppError(error, { fallback: "家族の情報を読み込めませんでした。" });
  if (!data) return null;
  const household = data.households as unknown as { name: string } | { name: string }[] | null;
  const name = Array.isArray(household) ? household[0]?.name : household?.name;
  return {
    householdId: data.household_id,
    householdName: name ?? "",
    userId: user.id,
    displayName: data.display_name,
    role: data.role,
  };
}

export async function canCreateHousehold(sb: SupabaseClient): Promise<boolean> {
  const { data, error } = await sb.rpc("can_create_household");
  if (error) return false;
  return data === true;
}

export async function createHousehold(sb: SupabaseClient, householdName: string, displayName: string) {
  const h = validateHouseholdName(householdName);
  const d = validateDisplayName(displayName);
  await ensureSignedIn(sb);
  const { error } = await sb.rpc("create_household", { p_household_name: h, p_display_name: d });
  if (error) throw toAppError(error, { fallback: "家族を作成できませんでした。" });
}

export async function joinHousehold(sb: SupabaseClient, code: string, displayName: string) {
  const c = normalizeInviteCode(code);
  if (c.length < 8) throw new AppError("招待コードを入力してください。");
  const d = validateDisplayName(displayName);
  await ensureSignedIn(sb);
  const { error } = await sb.rpc("join_household", { p_code: c, p_display_name: d });
  if (error) throw toAppError(error, { fallback: "参加できませんでした。" });
}

export async function listMembers(sb: SupabaseClient, householdId: string): Promise<Member[]> {
  const { data, error } = await sb
    .from("members")
    .select("user_id, display_name, role, joined_at")
    .eq("household_id", householdId)
    .order("joined_at");
  if (error) throw toAppError(error, { fallback: "メンバーを読み込めませんでした。" });
  return (data ?? []).map((m) => ({
    userId: m.user_id,
    displayName: m.display_name,
    role: m.role,
    joinedAt: m.joined_at,
  }));
}

export async function listActiveInvites(sb: SupabaseClient, householdId: string): Promise<Invite[]> {
  const { data, error } = await sb
    .from("invites")
    .select("id, code, expires_at, max_uses, used_count, revoked")
    .eq("household_id", householdId)
    .eq("revoked", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw toAppError(error, { fallback: "招待を読み込めませんでした。" });
  return (data ?? [])
    .filter((i) => i.used_count < i.max_uses)
    .map((i) => ({ id: i.id, code: i.code, expiresAt: i.expires_at, maxUses: i.max_uses, usedCount: i.used_count }));
}

export async function createInvite(sb: SupabaseClient, householdId: string): Promise<{ code: string; expiresAt: string }> {
  const { data, error } = await sb.rpc("create_invite", { p_household: householdId });
  if (error) throw toAppError(error, { fallback: "招待を作れませんでした。" });
  const row = (Array.isArray(data) ? data[0] : data) as { code: string; expires_at: string };
  return { code: row.code, expiresAt: row.expires_at };
}

export async function revokeInvite(sb: SupabaseClient, inviteId: string) {
  const { error } = await sb.rpc("revoke_invite", { p_invite: inviteId });
  if (error) throw toAppError(error, { fallback: "招待を取り消せませんでした。" });
}

export async function removeMember(sb: SupabaseClient, householdId: string, userId: string) {
  const { error } = await sb.rpc("remove_member", { p_household: householdId, p_user: userId });
  if (error) throw toAppError(error, { fallback: "メンバーを外せませんでした。" });
}

export async function leaveHousehold(sb: SupabaseClient, householdId: string) {
  const { error } = await sb.rpc("leave_household", { p_household: householdId });
  if (error) throw toAppError(error, { fallback: "家族から抜けられませんでした。" });
  await sb.auth.signOut().catch(() => undefined);
}

export async function renameSelf(sb: SupabaseClient, householdId: string, userId: string, displayName: string) {
  const d = validateDisplayName(displayName);
  const { error } = await sb
    .from("members")
    .update({ display_name: d })
    .eq("household_id", householdId)
    .eq("user_id", userId);
  if (error) throw toAppError(error, { fallback: "表示名を変更できませんでした。" });
}

export async function renameHousehold(sb: SupabaseClient, householdId: string, name: string) {
  const h = validateHouseholdName(name);
  const { error } = await sb.from("households").update({ name: h }).eq("id", householdId);
  if (error) throw toAppError(error, { fallback: "家族の名前を変更できませんでした。" });
}
