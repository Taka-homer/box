"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { IndexedDbRepository } from "@/lib/idb-repository";
import type { Repository } from "@/lib/repository";
import type { AppData } from "@/lib/types";

type Status = "loading" | "ready" | "error";

interface DataContextValue {
  status: Status;
  data: AppData;
  repo: Repository;
  /** 保存後に呼び出して画面のデータを最新にする */
  refresh: () => Promise<void>;
}

const EMPTY: AppData = { floors: [], rooms: [], storages: [], items: [], words: [] };

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [repo] = useState<Repository>(() => new IndexedDbRepository());

  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<AppData>(EMPTY);

  const refresh = useCallback(async () => {
    try {
      setData(await repo.loadAll());
      setStatus("ready");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }, [repo]);

  useEffect(() => {
    // 初回読み込み（IndexedDB はブラウザでのみ使えるため effect 内で行う）
    let cancelled = false;
    repo
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
  }, [repo]);

  const value = useMemo(() => ({ status, data, repo, refresh }), [status, data, repo, refresh]);
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
