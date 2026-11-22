"use client";

import { FreshOnVisit } from "@/components/fresh-on-visit";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useData } from "@/components/data-provider";
import { ItemForm } from "@/components/item-form";
import { OpenCarton } from "@/components/illustrations";
import { LoadError, Loading, PageHeader } from "@/components/ui";

function NewItem() {
  const { status } = useData();
  const params = useSearchParams();
  if (status === "loading") return <Loading />;
  if (status === "error") return <LoadError />;
  const storage = params.get("storage");
  return <ItemForm key={storage ?? ""} initialStorageId={storage} />;
}

function NewItemPageContent() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="ものを登録"
        back={{ href: "/", label: "ホーム" }}
        description="名前と、しまった場所を登録します。写真はなくても大丈夫です。"
        art={<OpenCarton className="h-[100px] w-auto sm:h-[140px]" />}
      />
      <Suspense fallback={<Loading />}>
        <NewItem />
      </Suspense>
    </div>
  );
}

/** ページを離れたら入力内容を捨て、次に開いたときは空欄から始める */
export default function NewItemPage() {
  return (
    <FreshOnVisit>
      <NewItemPageContent />
    </FreshOnVisit>
  );
}
