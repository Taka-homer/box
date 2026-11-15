import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isCloudMode } from "@/lib/cloud/config";

/**
 * 家族共有モードでは、ログイン済みの家族メンバーからのリクエストだけを受け付ける。
 * 端末保存モード（Supabase 未設定）では確認しない。
 */
export async function isAuthorized(request: Request): Promise<boolean> {
  if (!isCloudMode) return true;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return false;
  const { data: member } = await sb.from("members").select("household_id").eq("user_id", data.user.id).maybeSingle();
  return Boolean(member);
}
