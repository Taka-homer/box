"use client";

import { FreshOnVisit } from "@/components/fresh-on-visit";
import { useParams } from "next/navigation";
import { useData } from "@/components/data-provider";
import { ItemForm } from "@/components/item-form";
import { OpenCarton, SpotArt } from "@/components/illustrations";
import { EmptyState, LinkButton, LoadError, Loading, PageHeader } from "@/components/ui";

function EditItemPageContent() {
  const { id } = useParams<{ id: string }>();
  const { status, data } = useData();
  const item = data.items.find((i) => i.id === id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="登録内容を編集"
        back={{ href: `/items/${id}`, label: "詳細へ戻る" }}
        description={item ? `「${item.name}」の名前・場所・写真などを変更します。` : undefined}
        art={<OpenCarton className="h-[100px] w-auto sm:h-[140px]" />}
      />
      {status === "loading" && <Loading />}
      {status === "error" && <LoadError />}
      {status === "ready" &&
        (item ? (
          <ItemForm key={item.id} item={item} />
        ) : (
          <EmptyState
            art={<SpotArt name="boxes" className="h-24 sm:h-28" />}
            title="登録が見つかりません"
            action={<LinkButton href="/items">一覧へ</LinkButton>}
          >
            削除された可能性があります。
          </EmptyState>
        ))}
    </div>
  );
}

/** ページを離れたら入力内容を捨て、次に開いたときは空欄から始める */
export default function EditItemPage() {
  return (
    <FreshOnVisit>
      <EditItemPageContent />
    </FreshOnVisit>
  );
}
