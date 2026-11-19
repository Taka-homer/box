"use client";

import Link from "next/link";
import { ChevronRightIcon, PinIcon } from "./icons";
import { PhotoView } from "./photo";
import { Badge } from "./ui";
import { locationLabel, type ItemView } from "@/lib/search";

/** 検索結果・一覧の1件 */
export function ItemCard({ view, note }: { view: ItemView; note?: string }) {
  const { item } = view;
  return (
    <Link
      href={`/items/${item.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-brand-line/80 bg-white p-3 shadow-sm transition-colors hover:border-brand hover:bg-brand-softer"
    >
      <PhotoView photoId={item.photoId} alt={item.name} className="h-20 w-20 shrink-0 rounded-xl border border-brand-line/60" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="muted">{item.category}</Badge>
          {item.status === "missing" && <Badge tone="warn">見つからない</Badge>}
          {item.demoKey && <Badge>見本</Badge>}
        </div>
        <p className="mt-1 break-words text-[17px] font-bold leading-snug text-ink">{item.name}</p>
        <p className="mt-0.5 flex items-start gap-1 text-[13px] text-body">
          <PinIcon size={15} className="mt-[3px] shrink-0 text-brand-strong" />
          <span className="break-words">{locationLabel(view)}</span>
        </p>
        {item.detail && <p className="mt-0.5 break-words text-[13px] text-muted">{item.detail}</p>}
        {note && <p className="mt-1 break-words text-[13px] text-brand-strong">{note}</p>}
      </div>
      <ChevronRightIcon size={20} className="shrink-0 text-brand" />
    </Link>
  );
}
