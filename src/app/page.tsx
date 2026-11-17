"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useData } from "@/components/data-provider";
import { BoxIcon, ChevronRightIcon, ClockIcon, DocIcon, LayersIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { ItemCard } from "@/components/item-card";
import { Button, Card, EmptyState, LinkButton, LoadError, Loading, Notice, SectionTitle } from "@/components/ui";
import { addDemoData } from "@/lib/demo";
import { buildLookup, resolveItem } from "@/lib/search";
import { errorMessage } from "@/lib/types";

const MENU = [
  { href: "/items/new", label: "ものを登録", sub: "しまった場所を記録", Icon: PlusIcon },
  { href: "/places", label: "収納場所", sub: "場所ごとに見る", Icon: BoxIcon },
  { href: "/items?category=書類", label: "書類", sub: "保証書・説明書など", Icon: DocIcon },
  { href: "/items?view=recent", label: "最近の登録", sub: "新しい順に見る", Icon: ClockIcon },
];

export default function HomePage() {
  const { status, data, repo, refresh } = useData();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoMessage, setDemoMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const recent = useMemo(() => {
    const lookup = buildLookup(data);
    return data.items.slice(0, 5).map((i) => resolveItem(i, lookup));
  }, [data]);

  const missingCount = data.items.filter((i) => i.status === "missing").length;
  const isFirstRun = status === "ready" && data.floors.length === 0 && data.items.length === 0;

  async function handleDemo() {
    if (demoBusy) return;
    setDemoBusy(true);
    setDemoMessage(null);
    try {
      const added = await addDemoData(repo);
      await refresh();
      setDemoMessage({
        kind: "success",
        text: added > 0 ? `見本データを${added}件追加しました。` : "見本データはすでに追加されています。",
      });
    } catch (e) {
      setDemoMessage({ kind: "error", text: errorMessage(e, "見本データを追加できませんでした。") });
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <section aria-labelledby="home-title" className="flex flex-col gap-4">
        <h1 id="home-title" className="text-sm font-normal text-muted">
          わが家の収納
        </h1>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(q.trim() ? `/items?q=${encodeURIComponent(q.trim())}` : "/items");
          }}
          className="flex gap-2"
        >
          <label htmlFor="home-search" className="sr-only">
            名前や特徴で検索
          </label>
          <div className="relative flex-1">
            <SearchIcon size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-strong" />
            <input
              id="home-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="名前や特徴で検索"
              enterKeyHint="search"
              className="min-h-13 w-full rounded-2xl border border-brand bg-white py-3 pl-11 pr-3 text-base text-ink placeholder:text-[#8796a2] focus:outline-none focus-visible:outline-2"
            />
          </div>
          <Button type="submit" variant="primary" className="min-h-13 rounded-2xl px-5">
            検索
          </Button>
        </form>
      </section>

      {status === "loading" && <Loading />}
      {status === "error" && <LoadError />}

      {isFirstRun && (
        <Card className="border-brand bg-brand-softer">
          <h2 className="text-lg">はじめに、家の場所を登録しましょう</h2>
          <ol className="mt-3 flex list-decimal flex-col gap-1 pl-5 text-[15px]">
            <li>階と部屋を登録する（例：2階 → 書斎）</li>
            <li>収納場所を登録する（例：机の右側の引き出し）</li>
            <li>しまったもの・書類を登録する</li>
          </ol>
          <p className="mt-2 text-[13px] text-muted">ものの登録画面からも、その場で場所を追加できます。</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <LinkButton href="/places/structure" variant="primary">
              <LayersIcon size={18} />
              階と部屋を登録する
            </LinkButton>
            <Button onClick={handleDemo} disabled={demoBusy}>
              {demoBusy ? "追加中…" : "見本データで試す"}
            </Button>
          </div>
        </Card>
      )}
      {demoMessage && <Notice kind={demoMessage.kind}>{demoMessage.text}</Notice>}

      <Link
        href="/items"
        className="flex items-center gap-4 rounded-2xl border border-brand bg-brand-soft p-5 transition-colors hover:bg-[#e3f0f8]"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-brand bg-white text-brand-strong">
          <SearchIcon size={28} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-medium text-ink">ものを探す</span>
          <span className="block text-sm text-body">名前・場所・カテゴリで探せます</span>
        </span>
        <ChevronRightIcon size={22} className="shrink-0 text-brand-strong" />
      </Link>

      <nav aria-label="メニュー" className="grid grid-cols-2 gap-3">
        {MENU.map(({ href, label, sub, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-28 flex-col justify-between gap-3 rounded-2xl border border-brand-line bg-white p-4 transition-colors hover:border-brand hover:bg-brand-softer"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
              <Icon size={22} />
            </span>
            <span>
              <span className="block font-medium text-ink">{label}</span>
              <span className="block text-[13px] text-muted">{sub}</span>
            </span>
          </Link>
        ))}
      </nav>

      {missingCount > 0 && (
        <Link href="/items?status=missing" className="block">
          <Notice kind="warn">
            「見つからない」状態のものが{missingCount}点あります。<span className="underline">確認する</span>
          </Notice>
        </Link>
      )}

      {status === "ready" && (
        <section aria-labelledby="recent-title">
          <SectionTitle
            aside={
              data.items.length > 0 && (
                <Link href="/items" className="inline-flex min-h-11 items-center text-sm text-brand-strong hover:underline">
                  すべて見る（{data.items.length}点）
                </Link>
              )
            }
          >
            <span id="recent-title">最近登録したもの</span>
          </SectionTitle>
          {recent.length === 0 ? (
            <EmptyState
              icon={<BoxIcon size={32} />}
              title="まだ登録がありません"
              action={
                <LinkButton href="/items/new" variant="primary">
                  <PlusIcon size={18} />
                  ものを登録
                </LinkButton>
              }
            >
              登録すると、ここに新しい順に表示されます。
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {recent.map((v) => (
                <li key={v.item.id}>
                  <ItemCard view={v} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
