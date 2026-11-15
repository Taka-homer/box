"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "@/components/data-provider";
import { BoxIcon, CloseIcon, PlusIcon, SearchIcon, SparkIcon } from "@/components/icons";
import { ItemCard } from "@/components/item-card";
import {
  Button,
  EmptyState,
  LinkButton,
  LoadError,
  Loading,
  Notice,
  PageHeader,
  Select,
  inputClass,
} from "@/components/ui";
import { aiSearch, fetchAiStatus } from "@/lib/ai-client";
import type { AiSearchMatch } from "@/lib/ai-search-types";
import {
  buildLookup,
  hasActiveFilters,
  resolveItem,
  searchItems,
  searchRelated,
  type SearchFilters,
} from "@/lib/search";
import { CATEGORIES, errorMessage, type Category, type ItemStatus } from "@/lib/types";

type Mode = "keyword" | "ai";

function readFilters(params: URLSearchParams): SearchFilters {
  const category = params.get("category") ?? "";
  const status = params.get("status") ?? "";
  return {
    q: params.get("q") ?? "",
    category: (CATEGORIES as readonly string[]).includes(category) ? (category as Category) : "",
    floorId: params.get("floor") ?? "",
    roomId: params.get("room") ?? "",
    storageId: params.get("storage") ?? "",
    status: status === "missing" ? "missing" : "",
  };
}

function toQuery(f: SearchFilters, view: string | null): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.category) p.set("category", f.category);
  if (f.floorId) p.set("floor", f.floorId);
  if (f.roomId) p.set("room", f.roomId);
  if (f.storageId) p.set("storage", f.storageId);
  if (f.status) p.set("status", f.status);
  if (view) p.set("view", view);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function ItemSearch() {
  const { status, data } = useData();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const view = params.get("view");
  const filters = useMemo(() => readFilters(new URLSearchParams(params.toString())), [params]);

  const [text, setText] = useState(filters.q ?? "");
  const [mode, setMode] = useState<Mode>("keyword");
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [aiState, setAiState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "done"; query: string; matches: AiSearchMatch[] }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [filtersOpen, setFiltersOpen] = useState(hasActiveFilters(filters));
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchAiStatus().then(setAiAvailable);
    return () => abortRef.current?.abort();
  }, []);

  function apply(next: SearchFilters) {
    router.replace(`${pathname}${toQuery(next, view)}`, { scroll: false });
  }

  function setFilter(patch: Partial<SearchFilters>) {
    const next = { ...filters, ...patch };
    // 上位の絞り込みを変えたら、合わなくなった下位を解除する
    if ("floorId" in patch && !data.rooms.some((r) => r.id === next.roomId && r.floorId === next.floorId)) {
      next.roomId = "";
      next.storageId = "";
    }
    if ("roomId" in patch && !data.storages.some((s) => s.id === next.storageId && s.roomId === next.roomId)) {
      next.storageId = "";
    }
    apply(next);
  }

  function clearFilters() {
    apply({ q: filters.q });
  }

  async function runAi() {
    const query = text.trim();
    if (!query) {
      setAiState({ kind: "error", message: "探したいものの用途や特徴を入力してください。" });
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAiState({ kind: "loading" });
    try {
      const matches = await aiSearch(query, data.items, controller.signal);
      setAiState({ kind: "done", query, matches });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setAiState({ kind: "error", message: errorMessage(e, "AI検索に失敗しました。通常検索をご利用ください。") });
    }
  }

  const results = useMemo(() => searchItems(data, filters), [data, filters]);
  // 関連語辞書による検索（AIではない）。通常検索で見つかったものは除く
  const related = useMemo(
    () => (filters.q ? searchRelated(data, filters, new Set(results.map((v) => v.item.id))) : null),
    [data, filters, results],
  );
  const relatedCount = related?.views.length ?? 0;

  const aiResults = useMemo(() => {
    if (aiState.kind !== "done") return [];
    const lookup = buildLookup(data);
    const byId = new Map(data.items.map((i) => [i.id, i]));
    // 実在する登録物だけを表示し、場所は保存済みデータから組み立てる
    return aiState.matches.flatMap((m) => {
      const item = byId.get(m.id);
      return item ? [{ view: resolveItem(item, lookup), reason: m.reason }] : [];
    });
  }, [aiState, data]);

  const rooms = data.rooms.filter((r) => r.floorId === filters.floorId);
  const storages = data.storages.filter((s) => s.roomId === filters.roomId);
  const activeCount = [filters.category, filters.floorId, filters.roomId, filters.storageId, filters.status].filter(
    Boolean,
  ).length;

  const title = view === "recent" ? "最近の登録" : filters.category === "書類" && !filters.q ? "書類" : "探す・一覧";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={title}
        back={{ href: "/", label: "ホーム" }}
        description={view === "recent" ? "新しく登録した順に表示しています。" : "名前・詳しい位置・メモから探せます。"}
      />

      {aiAvailable && (
        <div
          role="group"
          aria-label="検索の方法"
          className="grid grid-cols-2 rounded-xl border border-brand-line bg-brand-softer p-1"
        >
          {(
            [
              ["keyword", "通常検索"],
              ["ai", "AI検索"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-[15px] ${
                mode === value ? "border border-brand bg-white font-medium text-brand-strong" : "text-body"
              }`}
            >
              {value === "ai" && <SparkIcon size={18} />}
              {label}
            </button>
          ))}
        </div>
      )}

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (mode === "ai") void runAi();
          else apply({ ...filters, q: text.trim() });
        }}
        className="flex flex-col gap-2"
      >
        <label htmlFor="item-search" className="text-[15px] font-medium text-ink">
          {mode === "ai" ? "用途や特徴を入力" : "名前や特徴で検索"}
          <span className="ml-2 rounded-md bg-brand-soft px-1.5 py-0.5 text-xs font-normal text-brand-strong">
            {mode === "ai" ? "AI検索" : "通常検索"}
          </span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon
              size={20}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-strong"
            />
            <input
              id="item-search"
              type="search"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (mode === "keyword" && e.target.value === "") apply({ ...filters, q: "" });
              }}
              placeholder={mode === "ai" ? "例：冷房の修理に必要な書類" : "例：保証書、ドライバー"}
              enterKeyHint="search"
              className={`${inputClass} pl-11`}
              aria-describedby="search-mode-help"
            />
          </div>
          <Button type="submit" variant="primary" disabled={aiState.kind === "loading"}>
            {mode === "ai" && aiState.kind === "loading" ? "検索中…" : "検索"}
          </Button>
        </div>
        <p id="search-mode-help" className="text-[13px] text-muted">
          {mode === "ai"
            ? "AIが名前・カテゴリ・詳しい位置・メモから候補を選びます。写真は送信しません。"
            : aiAvailable === false
              ? "通常検索：入力した言葉と、関連する言葉（冷房→エアコンなど）で探します。AI検索は設定されていません。"
              : "通常検索：入力した言葉と、関連する言葉（冷房→エアコンなど）で探します。"}
        </p>
      </form>

      {mode === "keyword" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              aria-controls="filter-panel"
              className="min-h-11"
            >
              絞り込み{activeCount > 0 ? `（${activeCount}）` : ""}
            </Button>
            {activeCount > 0 && (
              <Button variant="ghost" onClick={clearFilters} className="min-h-11">
                <CloseIcon size={18} />
                絞り込みを解除
              </Button>
            )}
          </div>
          {filtersOpen && (
            <div
              id="filter-panel"
              className="grid grid-cols-1 gap-3 rounded-2xl border border-brand-line bg-brand-softer p-4 sm:grid-cols-2 lg:grid-cols-5"
            >
              <FilterSelect
                label="カテゴリ"
                value={filters.category ?? ""}
                onChange={(v) => setFilter({ category: v as Category | "" })}
              >
                <option value="">すべて</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect label="階" value={filters.floorId ?? ""} onChange={(v) => setFilter({ floorId: v })}>
                <option value="">すべて</option>
                {data.floors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="部屋"
                value={filters.roomId ?? ""}
                onChange={(v) => setFilter({ roomId: v })}
                disabled={!filters.floorId}
              >
                <option value="">{filters.floorId ? "すべて" : "先に階を選択"}</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="収納場所"
                value={filters.storageId ?? ""}
                onChange={(v) => setFilter({ storageId: v })}
                disabled={!filters.roomId}
              >
                <option value="">{filters.roomId ? "すべて" : "先に部屋を選択"}</option>
                {storages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="状態"
                value={filters.status ?? ""}
                onChange={(v) => setFilter({ status: v as ItemStatus | "" })}
              >
                <option value="">すべて</option>
                <option value="missing">見つからないもの</option>
              </FilterSelect>
            </div>
          )}
        </div>
      )}

      {status === "loading" && <Loading />}
      {status === "error" && <LoadError />}

      {status === "ready" && mode === "keyword" && (
        <section aria-label="検索結果" aria-live="polite">
          {data.items.length === 0 ? (
            <EmptyState
              icon={<BoxIcon size={32} />}
              title="まだ何も登録されていません"
              action={
                <LinkButton href="/items/new" variant="primary">
                  <PlusIcon size={18} />
                  ものを登録
                </LinkButton>
              }
            >
              ものや書類と、しまった場所を登録しましょう。
            </EmptyState>
          ) : results.length === 0 && relatedCount === 0 ? (
            <EmptyState
              icon={<SearchIcon size={32} />}
              title="見つかりませんでした"
              action={
                <>
                  {(filters.q || activeCount > 0) && (
                    <Button
                      onClick={() => {
                        setText("");
                        apply({});
                      }}
                    >
                      条件をすべて解除
                    </Button>
                  )}
                  {aiAvailable && filters.q && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        setMode("ai");
                        void runAi();
                      }}
                    >
                      <SparkIcon size={18} />
                      AI検索で探す
                    </Button>
                  )}
                </>
              }
            >
              別の言葉や、短い言葉で試してください。
              {filters.q && (
                <span className="mt-2 block">
                  家族独自の呼び方なら、
                  <Link
                    href={`/settings/words?add=${encodeURIComponent(`${filters.q}、`)}`}
                    className="text-brand-strong underline"
                  >
                    マイ辞書に登録
                  </Link>
                  すると次から見つかります。
                </span>
              )}
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-6">
              {results.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm text-muted">
                    {filters.q ? `「${filters.q}」を含むもの：` : ""}
                    {results.length}点（新しい登録順）
                  </p>
                  <ul className="flex flex-col gap-2.5">
                    {results.map((v) => (
                      <li key={v.item.id}>
                        <ItemCard view={v} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted">「{filters.q}」を含むものはありませんでした。</p>
              )}
              {related && relatedCount > 0 && (
                <div>
                  <h2 className="text-base">関連する言葉で見つかったもの（{relatedCount}点）</h2>
                  <p className="mb-2 mt-0.5 text-[13px] text-muted">
                    「{related.concepts.join("」「")}」に関連する言葉で探しました。関係が深い順に表示しています。
                    言い換えは
                    <Link href="/settings/words" className="text-brand-strong underline">
                      マイ辞書
                    </Link>
                    に追加できます。
                  </p>
                  <ul className="flex flex-col gap-2.5">
                    {related.views.map((v) => (
                      <li key={v.item.id}>
                        <ItemCard view={v} note={`関連語：${v.matchedWords.join("・")}`} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {status === "ready" && mode === "ai" && (
        <section aria-label="AI検索の結果" aria-live="polite">
          {aiState.kind === "idle" && (
            <Notice kind="info">
              名前を忘れていても、「冷房の修理に必要な書類」のように用途や特徴で探せます。結果の場所は登録済みのデータから表示します。
            </Notice>
          )}
          {aiState.kind === "loading" && <Loading label="AIが探しています…" />}
          {aiState.kind === "error" && (
            <div className="flex flex-col gap-3">
              <Notice kind="error">{aiState.message}</Notice>
              <Button
                onClick={() => {
                  setMode("keyword");
                  apply({ ...filters, q: text.trim() });
                }}
              >
                通常検索で探す
              </Button>
            </div>
          )}
          {aiState.kind === "done" &&
            (aiResults.length === 0 ? (
              <EmptyState icon={<SearchIcon size={32} />} title="関係するものが見つかりませんでした">
                言い方を変えるか、通常検索もお試しください。
              </EmptyState>
            ) : (
              <>
                <p className="mb-2 text-sm text-muted">
                  「{aiState.query}」に関係しそうなもの：{aiResults.length}点
                </p>
                <ul className="flex flex-col gap-2.5">
                  {aiResults.map(({ view: v, reason }) => (
                    <li key={v.item.id}>
                      <ItemCard view={v} note={reason ? `理由：${reason}` : undefined} />
                    </li>
                  ))}
                </ul>
              </>
            ))}
        </section>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const id = `filter-${label}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {children}
      </Select>
    </div>
  );
}
