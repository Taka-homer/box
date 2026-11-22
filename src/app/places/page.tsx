"use client";

import { FreshOnVisit } from "@/components/fresh-on-visit";
import Link from "next/link";
import { useState } from "react";
import { useData } from "@/components/data-provider";
import { ChevronRightIcon, LayersIcon, PlusIcon, RoomIcon } from "@/components/icons";
import { ClosetArt, SpotArt } from "@/components/illustrations";
import { PhotoView } from "@/components/photo";
import { Badge, EmptyState, LinkButton, LoadError, Loading, PageHeader } from "@/components/ui";

function PlacesPageContent() {
  const { status, data } = useData();
  const [floorFilter, setFloorFilter] = useState<string>("");

  const counts = new Map<string, number>();
  for (const item of data.items) counts.set(item.storageId, (counts.get(item.storageId) ?? 0) + 1);

  const floors = data.floors.filter((f) => !floorFilter || f.id === floorFilter);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="収納場所"
        back={{ href: "/", label: "ホーム" }}
        description="部屋ごとに収納場所をまとめています。押すと、その場所にあるものを確認できます。"
        tone="hero"
        art={<ClosetArt className="h-[100px] w-auto sm:h-[150px]" />}
        actions={
          <>
            <LinkButton href="/places/structure" className="min-h-11">
              <LayersIcon size={18} />
              階と部屋の管理
            </LinkButton>
            <LinkButton href="/places/new" variant="primary" className="min-h-11">
              <PlusIcon size={18} />
              収納場所を追加
            </LinkButton>
          </>
        }
      />

      {status === "loading" && <Loading />}
      {status === "error" && <LoadError />}

      {status === "ready" && data.floors.length === 0 && (
        <EmptyState
          art={<SpotArt name="shelf" />}
          title="まだ家の場所が登録されていません"
          action={
            <LinkButton href="/places/structure" variant="primary">
              階と部屋を登録する
            </LinkButton>
          }
        >
          まず「1階」「2階」などの階と、「リビング」「書斎」などの部屋を登録しましょう。
        </EmptyState>
      )}

      {status === "ready" && data.floors.length > 0 && (
        <>
          <div role="group" aria-label="階で絞り込み" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {[{ id: "", name: "すべての階" }, ...data.floors].map((f) => {
              const active = floorFilter === f.id;
              return (
                <button
                  key={f.id || "all"}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFloorFilter(f.id)}
                  className={`min-h-11 shrink-0 rounded-full border px-5 text-[15px] transition-colors ${
                    active
                      ? "border-transparent bg-gradient-to-b from-[#36a7cc] to-[#22739b] font-medium text-white shadow-sm"
                      : "border-brand-line bg-white text-body hover:bg-brand-softer"
                  }`}
                >
                  {f.name}
                </button>
              );
            })}
          </div>

          {floors.map((floor) => {
            const rooms = data.rooms.filter((r) => r.floorId === floor.id);
            return (
              <section key={floor.id} aria-labelledby={`floor-${floor.id}`} className="flex flex-col gap-4">
                <h2 id={`floor-${floor.id}`} className="border-b border-brand-line pb-2 text-xl font-bold">
                  {floor.name}
                </h2>
                {rooms.length === 0 && (
                  <p className="text-sm text-muted">
                    この階には部屋がありません。
                    <Link href="/places/structure" className="text-brand-strong underline">
                      部屋を追加する
                    </Link>
                  </p>
                )}
                {rooms.map((room) => {
                  const storages = data.storages.filter((s) => s.roomId === room.id);
                  return (
                    <div
                      key={room.id}
                      className="flex flex-col gap-2.5 rounded-2xl border border-white bg-[#eaf7f3] p-3 shadow-sm sm:p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="flex min-w-0 items-center gap-2.5 text-base font-bold">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-line bg-white text-brand-strong shadow-sm">
                            <RoomIcon name={room.name} size={24} />
                          </span>
                          <span className="break-words">{room.name}</span>
                        </h3>
                        <Link
                          href={`/places/new?room=${room.id}`}
                          aria-label={`${room.name}に収納場所を追加`}
                          className="inline-flex min-h-11 shrink-0 items-center gap-1 border-l border-brand-line pl-3 text-sm font-medium text-brand-strong hover:underline"
                        >
                          <PlusIcon size={16} />
                          追加
                        </Link>
                      </div>
                      {storages.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-brand-line bg-white/60 px-4 py-3 text-center text-sm text-muted">
                          収納場所がまだありません。
                        </p>
                      ) : (
                        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                          {storages.map((s) => (
                            <li key={s.id}>
                              <Link
                                href={`/places/${s.id}`}
                                className="flex items-center gap-3 rounded-2xl border border-brand-line bg-white p-3 shadow-sm transition-colors hover:border-brand hover:bg-brand-softer"
                              >
                                <PhotoView
                                  photoId={s.photoId}
                                  alt={s.name}
                                  kind="storage"
                                  className="h-16 w-16 shrink-0 rounded-xl border border-line"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block break-words font-medium text-ink">{s.name}</span>
                                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
                                    {counts.get(s.id) ?? 0}点
                                    {s.demoKey && <Badge>見本</Badge>}
                                  </span>
                                </span>
                                <ChevronRightIcon size={20} className="shrink-0 text-brand" />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </section>
            );
          })}
          {data.storages.length === 0 && (
            <EmptyState art={<SpotArt name="boxes" />} title="収納場所を登録しましょう">
              「本棚」「押し入れ上段」など、ものをしまう場所を登録します。
            </EmptyState>
          )}
        </>
      )}
    </div>
  );
}

/** ページを離れたら入力内容を捨て、次に開いたときは空欄から始める */
export default function PlacesPage() {
  return (
    <FreshOnVisit>
      <PlacesPageContent />
    </FreshOnVisit>
  );
}
