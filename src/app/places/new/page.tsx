"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useData } from "@/components/data-provider";
import { StorageForm } from "@/components/storage-form";
import { StackedBoxes } from "@/components/illustrations";
import { LoadError, Loading, PageHeader } from "@/components/ui";

function NewStorage() {
  const { status } = useData();
  const params = useSearchParams();
  if (status === "loading") return <Loading />;
  if (status === "error") return <LoadError />;
  return <StorageForm initialRoomId={params.get("room")} />;
}

export default function NewStoragePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="収納場所を追加"
        back={{ href: "/places", label: "収納場所" }}
        description="「本棚」「押し入れ上段」など、ものをしまう場所を登録します。"
        art={<StackedBoxes className="h-[110px] w-auto sm:h-[140px]" />}
      />
      <Suspense fallback={<Loading />}>
        <NewStorage />
      </Suspense>
    </div>
  );
}
