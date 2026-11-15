// 家族共有（Supabase）の設定。未設定ならこの端末に保存するモードで動く。
// NEXT_PUBLIC_ の値はブラウザに渡る公開用の値（Supabase の URL と公開キー）だけにする。

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export const isCloudMode = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const PHOTO_BUCKET = "photos";
