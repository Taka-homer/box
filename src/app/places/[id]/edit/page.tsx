"use client";

import { useParams } from "next/navigation";
import { useData } from "@/components/data-provider";
import { StorageForm } from "@/components/storage-form";
import { EmptyState, LinkButton, LoadError, Loading, PageHeader } from "@/components/ui";

export default function EditStoragePage() {
  const { id } = useParams<{ id: string }>();
  const { status, data } = useData();
  const storage = data.storages.find((s) => s.id === id);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="収納場所を編集" back={{ href: `/places/${id}`, label: "収納場所へ戻る" }} />
      {status === "loading" && <Loading />}
      {status === "error" && <LoadError />}
      {status === "ready" &&
        (storage ? (
          <StorageForm key={storage.id} storage={storage} />
        ) : (
          <EmptyState title="収納場所が見つかりません" action={<LinkButton href="/places">収納場所へ</LinkButton>}>
            削除された可能性があります。
          </EmptyState>
        ))}
    </div>
  );
}
