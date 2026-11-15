"use client";

import Link from "next/link";
import { useState } from "react";
import { useData } from "@/components/data-provider";
import { BoxIcon, ChevronRightIcon, LayersIcon, PlusIcon } from "@/components/icons";
import { PhotoView } from "@/components/photo";
import { Badge, EmptyState, LinkButton, LoadError, Loading, PageHeader } from "@/components/ui";

export default function PlacesPage() {
  const { status, data } = useData();
  const [floorFilter, setFloorFilter] = useState<string>("");

  const counts = new Map<string, number>();
  for (const item of data.items) counts.set(item.storageId, (counts.get(item.storageId) ?? 0) + 1);

  const floors = data.floors.filter((f) => !floorFilter || f.id === floorFilter);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="収納場所"
        description="部屋ごとに収納場所をまとめています。押すと、その場所にあるものを確認できます。"
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
          icon={<LayersIcon size={32} />}
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
                  className={`min-h-11 shrink-0 rounded-full border px-4 text-[15px] ${
                    active ? "border-brand-strong bg-brand-strong text-white" : "border-brand-line bg-white text-body hover:bg-brand-softer"
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
                <h2 id={`floor-${floor.id}`} className="border-b border-brand-line pb-1.5 text-lg">
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
                    <div key={room.id} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base">{room.name}</h3>
                        <Link
                          href={`/places/new?room=${room.id}`}
                          className="inline-flex min-h-11 items-center gap-1 text-sm text-brand-strong hover:underline"
                        >
                          <PlusIcon size={16} />
                          追加
                        </Link>
                      </div>
                      {storages.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-brand-line px-4 py-3 text-sm text-muted">
                          収納場所がまだありません。
                        </p>
                      ) : (
                        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                          {storages.map((s) => (
                            <li key={s.id}>
                              <Link
                                href={`/places/${s.id}`}
                                className="flex items-center gap-3 rounded-2xl border border-brand-line bg-white p-3 transition-colors hover:border-brand hover:bg-brand-softer"
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
            <EmptyState icon={<BoxIcon size={32} />} title="収納場所を登録しましょう">
              「本棚」「押し入れ上段」など、ものをしまう場所を登録します。
            </EmptyState>
          )}
        </>
      )}
    </div>
  );
}
