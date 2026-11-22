import { FreshOnVisit } from "@/components/fresh-on-visit";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { ItemSearch } from "./item-search";

export const metadata = { title: "探す・一覧 | わが家の収納" };

function ItemsPageContent() {
  return (
    <Suspense fallback={<Loading />}>
      <ItemSearch />
    </Suspense>
  );
}

/** ページを離れたら入力内容を捨て、次に開いたときは空欄から始める */
export default function ItemsPage() {
  return (
    <FreshOnVisit>
      <ItemsPageContent />
    </FreshOnVisit>
  );
}
