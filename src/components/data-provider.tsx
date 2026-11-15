"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { IndexedDbRepository } from "@/lib/idb-repository";
import type { Repository } from "@/lib/repository";
import { AppError, type AppData } from "@/lib/types";
import { isCloudMode } from "@/lib/cloud/config";
import { getSupabase } from "@/lib/cloud/client";
import { getMembership, type Membership } from "@/lib/cloud/household";
import { SupabaseRepository } from "@/lib/cloud/supabase-repository";

type Status = "loading" | "ready" | "error";

/**
 * 保存先と利用状態。
 * - local：この端末のブラウザに保存（Supabase 未設定時）
 * - cloud：家族で共有。家族に参加するまでは onboarding
 */
export type Access =
  | { mode: "local" }
  | { mode: "cloud"; phase: "checking" | "onboarding" | "error" }
  | { mode: "cloud"; phase: "ready"; membership: Membership };

interface DataContextValue {
  status: Status;
  data: AppData;
  repo: Repository;
  /** 保存後に呼び出して画面のデータを最新にする */
  refresh: () => Promise<void>;
  access: Access;
  /** 家族への参加・作成のあとに呼び出す */
  reloadAccess: () => Promise<void>;
}

const EMPTY: AppData = { floors: [], rooms: [], storages: [], items: [], words: [] };

/** 家族に参加する前に呼ばれても安全に失敗する仮の保存先 */
const UNAVAILABLE = new Proxy({} as Repository, {
  get: () => () => Promise.reject(new AppError("家族に参加すると使えるようになります。", "storage")),
});

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [repo, setRepo] = useState<Repository>(() => (isCloudMode ? UNAVAILABLE : new IndexedDbRepository()));
  const [access, setAccess] = useState<Access>(isCloudMode ? { mode: "cloud", phase: "checking" } : { mode: "local" });
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<AppData>(EMPTY);
  const repoRef = useRef(repo);
  useEffect(() => {
    repoRef.current = repo;
  }, [repo]);

  const load = useCallback(async (target: Repository) => {
    try {
      setData(await target.loadAll());
      setStatus("ready");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }, []);

  const refresh = useCallback(() => load(repoRef.current), [load]);

  /** 参加している家族を確かめ、保存先を切り替える */
  const reloadAccess = useCallback(async () => {
    if (!isCloudMode) return;
    try {
      const sb = getSupabase();
      const membership = await getMembership(sb);
      if (!membership) {
        setAccess({ mode: "cloud", phase: "onboarding" });
        setRepo(UNAVAILABLE);
        setData(EMPTY);
        return;
      }
      setAccess((prev) =>
        prev.mode === "cloud" &&
        prev.phase === "ready" &&
        prev.membership.householdId === membership.householdId &&
        prev.membership.displayName === membership.displayName &&
        prev.membership.householdName === membership.householdName
          ? prev
          : { mode: "cloud", phase: "ready", membership },
      );
      const current = repoRef.current;
      const next =
        current instanceof SupabaseRepository && current.householdId === membership.householdId
          ? current
          : new SupabaseRepository(sb, membership.householdId);
      setRepo(next);
      repoRef.current = next;
      await load(next);
    } catch (e) {
      console.error(e);
      setAccess({ mode: "cloud", phase: "error" });
    }
  }, [load]);

  // 初回読み込み（IndexedDB・ログイン状態はブラウザでのみ使えるため effect 内で行う）
  useEffect(() => {
    if (isCloudMode) {
      // ログイン状態（外部）を確かめる。状態の更新は通信のあとに行われる
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void reloadAccess();
      return;
    }
    let cancelled = false;
    const local = repoRef.current;
    local
      .loadAll()
      .then((loaded) => {
        if (cancelled) return;
        setData(loaded);
        setStatus("ready");
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadAccess]);

  // 家族の変更をすぐ反映する（他の人の登録・移動、画面に戻ったとき）
  const householdId = access.mode === "cloud" && access.phase === "ready" ? access.membership.householdId : null;
  useEffect(() => {
    if (!householdId) return;
    const sb = getSupabase();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 400);
    };
    const channel = sb.channel(`household-${householdId}`);
    for (const table of ["floors", "rooms", "storages", "items", "word_groups"]) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `household_id=eq.${householdId}` },
        schedule,
      );
    }
    channel.subscribe();
    const onVisible = () => {
      // メンバーから外された場合も、ここで気づける
      if (document.visibilityState === "visible") void reloadAccess();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void sb.removeChannel(channel);
    };
  }, [householdId, refresh, reloadAccess]);

  const value = useMemo(
    () => ({ status, data, repo, refresh, access, reloadAccess }),
    [status, data, repo, refresh, access, reloadAccess],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}

/** 保存済みの写真を表示用URLに変換する */
export function usePhotoUrl(photoId: string | null | undefined): string | null {
  const { repo } = useData();
  const [entry, setEntry] = useState<{ id: string; url: string } | null>(null);

  useEffect(() => {
    if (!photoId) return;
    let url: string | null = null;
    let cancelled = false;
    repo
      .getPhoto(photoId)
      .then((blob) => {
        if (cancelled || !blob) return;
        url = URL.createObjectURL(blob);
        setEntry({ id: photoId, url });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [photoId, repo]);

  return photoId && entry?.id === photoId ? entry.url : null;
}
