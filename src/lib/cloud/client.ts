import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isCloudMode } from "./config";

let client: SupabaseClient | null = null;

/** ブラウザで使う Supabase クライアント（ログイン状態はこの端末に保持される） */
export function getSupabase(): SupabaseClient {
  if (!isCloudMode) throw new Error("Supabase is not configured");
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "wagaya-shuno-auth" },
    });
  }
  return client;
}

/** サーバーへ本人確認のために渡すアクセストークン */
export async function getAccessToken(): Promise<string | null> {
  if (!isCloudMode) return null;
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}
