"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useData } from "@/components/data-provider";
import { ItemForm } from "@/components/item-form";
import { LoadError, Loading, PageHeader } from "@/components/ui";

function NewItem() {
  const { status } = useData();
  const params = useSearchParams();
  if (status === "loading") return <Loading />;
  if (status === "error") return <LoadError />;
  return <ItemForm initialStorageId={params.get("storage")} />;
}

export default function NewItemPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="ものを登録"
        back={{ href: "/", label: "ホーム" }}
        description="名前と、しまった場所を登録します。写真はなくても大丈夫です。"
      />
      <Suspense fallback={<Loading />}>
        <NewItem />
      </Suspense>
    </div>
  );
}
