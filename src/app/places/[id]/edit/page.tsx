"use client";

import { useParams } from "next/navigation";
import { useData } from "@/components/data-provider";
import { StorageForm } from "@/components/storage-form";
import { SpotArt, SteelShelf } from "@/components/illustrations";
import { EmptyState, LinkButton, LoadError, Loading, PageHeader } from "@/components/ui";

export default function EditStoragePage() {
  const { id } = useParams<{ id: string }>();
  const { status, data } = useData();
  const storage = data.storages.find((s) => s.id === id);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="収納場所を編集"
        back={{ href: `/places/${id}`, label: "収納場所へ戻る" }}
        description={storage ? `「${storage.name}」の名前・場所・写真を変更します。` : undefined}
        art={<SteelShelf className="h-[100px] w-auto sm:h-[140px]" />}
      />
      {status === "loading" && <Loading />}
      {status === "error" && <LoadError />}
      {status === "ready" &&
        (storage ? (
          <StorageForm key={storage.id} storage={storage} />
        ) : (
          <EmptyState
            art={<SpotArt name="boxes" className="h-24 sm:h-28" />}
            title="収納場所が見つかりません" action={<LinkButton href="/places">収納場所へ</LinkButton>}>
            削除された可能性があります。
          </EmptyState>
        ))}
    </div>
  );
}
