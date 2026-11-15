import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { ItemSearch } from "./item-search";

export const metadata = { title: "探す・一覧 | わが家の収納" };

export default function ItemsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ItemSearch />
    </Suspense>
  );
}
