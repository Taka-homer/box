"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useData } from "@/components/data-provider";
import {
  BoxIcon,
  ChevronRightIcon,
  ClockIcon,
  GridIcon,
  LayersIcon,
  PlusIcon,
  SearchIcon,
} from "@/components/icons";
import { HeroShelf, OpenCarton, SearchBox, SpotArt, StackedBoxes, SteelShelf } from "@/components/illustrations";
import { PhotoView } from "@/components/photo";
import { Button, Card, EmptyState, LinkButton, LoadError, Loading, Notice } from "@/components/ui";
import { addDemoData, fetchDemoPhoto } from "@/lib/demo";
import { buildLookup, resolveItem } from "@/lib/search";
import { errorMessage } from "@/lib/types";

const MENU = [
  { href: "/items/new", label: "ものを登録", sub: "しまった場所を記録", Icon: PlusIcon, Art: OpenCarton, tone: "bg-[#eef6fb]", artClass: "h-[64px] sm:h-[80px]" },
  // 横長の画像なので、ほかより低めに表示する
  { href: "/places", label: "収納場所", sub: "場所ごとに見る", Icon: BoxIcon, Art: SteelShelf, tone: "bg-[#eaf7f3]", artClass: "h-[56px] sm:h-[72px]" },
  { href: "/items?view=recent", label: "最近の登録", sub: "新しい順に見る", Icon: ClockIcon, Art: StackedBoxes, tone: "bg-[#eef3fb]" },
];

export default function HomePage() {
  const { status, data, repo, refresh } = useData();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoMessage, setDemoMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const recent = useMemo(() => {
    const lookup = buildLookup(data);
    return data.items.slice(0, 8).map((i) => resolveItem(i, lookup));
  }, [data]);

  const ready = status === "ready";
  const stats = [
    { label: "登録したもの", value: data.items.length, unit: "件", Icon: BoxIcon },
    { label: "収納場所", value: data.storages.length, unit: "か所", Icon: LayersIcon },
  ];
  const missingCount = data.items.filter((i) => i.status === "missing").length;
  const isFirstRun = ready && data.floors.length === 0 && data.items.length === 0;

  async function handleDemo() {
    if (demoBusy) return;
    setDemoBusy(true);
    setDemoMessage(null);
    try {
      const added = await addDemoData(repo, fetchDemoPhoto);
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
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">わが家の収納 ホーム</h1>

      <section
        aria-label="登録の状況"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#3fa3c8] via-[#56b7d6] to-[#a9def0] p-4 sm:p-6"
      >
        <HeroShelf className="pointer-events-none absolute bottom-0 right-0 h-[118px] w-auto opacity-90 sm:h-[210px] sm:opacity-100" />
        <p className="relative max-w-[15rem] text-[15px] font-medium leading-relaxed text-white [text-shadow:0_1px_2px_rgb(0_60_90/0.25)] sm:max-w-none sm:text-lg">
          家の収納を見える化して
          <br />
          探す・しまう・管理するをもっと簡単に
        </p>
        <dl className="relative mt-3 inline-grid max-w-full grid-cols-2 divide-x divide-brand-line rounded-2xl bg-white/90 py-2 shadow-sm backdrop-blur">
          {stats.map(({ label, value, unit, Icon }) => (
            <div key={label} className="flex min-w-0 items-center gap-1.5 px-2.5 sm:px-4">
              <Icon size={18} className="shrink-0 text-brand-strong" />
              <div className="min-w-0">
                <dt className="truncate text-[10px] leading-tight text-muted sm:text-xs">{label}</dt>
                <dd className="leading-tight text-ink">
                  <span className="text-lg font-semibold sm:text-xl">{ready ? value : "–"}</span>
                  <span className="ml-0.5 text-[11px] text-muted">{unit}</span>
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

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
          <SearchIcon size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-strong" />
          <input
            id="home-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="名前や特徴で検索"
            enterKeyHint="search"
            className="min-h-13 w-full rounded-full border border-brand bg-white py-3 pl-12 pr-4 text-base text-ink shadow-sm placeholder:text-[#8796a2] focus:outline-none focus-visible:outline-2"
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          className="min-h-13 rounded-full border-0 bg-gradient-to-b from-[#2f88b3] to-brand-deep px-6 shadow-sm"
        >
          検索
        </Button>
      </form>

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
        className="relative flex items-center gap-3 overflow-hidden rounded-3xl bg-gradient-to-r from-[#5fbedc] to-[#2a86b3] py-3 pl-2 pr-4 text-white shadow-sm transition-opacity hover:opacity-95"
      >
        <SearchBox className="h-20 w-24 shrink-0 sm:h-24 sm:w-28" />
        <span className="h-12 w-px shrink-0 bg-white/60" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-xl font-semibold">ものを探す</span>
          <span className="block text-[13px] text-white">名前・場所・カテゴリで探せます</span>
        </span>
        <ChevronRightIcon size={24} className="shrink-0" />
      </Link>

      <section aria-labelledby="menu-title" className="flex flex-col gap-3">
        <h2 id="menu-title" className="flex items-center gap-2 text-lg">
          <GridIcon size={20} className="text-brand-strong" />
          よく使う機能
        </h2>
        <nav aria-labelledby="menu-title" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MENU.map(({ href, label, sub, Icon, Art, tone, artClass }) => (
            <Link
              key={href}
              href={href}
              className={`relative flex min-h-28 flex-col overflow-hidden rounded-2xl border border-white p-3.5 shadow-sm transition-shadow last:col-span-2 hover:shadow-md sm:last:col-span-1 ${tone}`}
            >
              <span className="relative flex items-center gap-1.5 font-semibold text-ink">
                <Icon size={20} className="shrink-0 text-brand-strong" />
                {label}
              </span>
              <span className="relative mt-1 max-w-[60%] text-[12px] leading-snug text-body sm:text-[13px]">{sub}</span>
              <Art className={`pointer-events-none absolute bottom-0 right-0 w-auto ${artClass ?? "h-[76px] sm:h-24"}`} />
            </Link>
          ))}
        </nav>
      </section>

      {missingCount > 0 && (
        <Link href="/items?status=missing" className="block">
          <Notice kind="warn">
            「見つからない」状態のものが{missingCount}点あります。<span className="underline">確認する</span>
          </Notice>
        </Link>
      )}

      {ready && (
        <section aria-labelledby="recent-title" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="recent-title" className="flex items-center gap-2 text-lg">
              <ClockIcon size={20} className="text-brand-strong" />
              最近登録したもの
            </h2>
            {data.items.length > 0 && (
              <Link
                href="/items?view=recent"
                className="inline-flex min-h-11 items-center gap-0.5 text-sm font-medium text-brand-strong hover:underline"
              >
                すべて見る
                <ChevronRightIcon size={16} />
              </Link>
            )}
          </div>
          {recent.length === 0 ? (
            <EmptyState
              art={<SpotArt name="carton" className="h-24 sm:h-28" />}
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
            <ul className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-2">
              {recent.map(({ item, storage }) => (
                <li key={item.id} className="w-32 shrink-0 snap-start sm:w-36">
                  <Link
                    href={`/items/${item.id}`}
                    className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <PhotoView photoId={item.photoId} alt={item.name} className="aspect-[4/3] w-full rounded-xl" />
                    <span className="mt-1.5 truncate px-1 text-sm font-semibold text-ink">{item.name}</span>
                    <span className="flex items-center gap-1 px-1 pb-1 text-[12px] text-muted">
                      <BoxIcon size={13} className="shrink-0" />
                      <span className="truncate">{storage?.name ?? "場所が不明"}</span>
                    </span>
                    {item.status === "missing" && (
                      <span className="mx-1 mb-1 self-start rounded-full bg-warn-soft px-2 text-[11px] text-warn">
                        見つからない
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
