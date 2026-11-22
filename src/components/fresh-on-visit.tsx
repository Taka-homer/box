"use client";

// ページを離れたら、入力内容などの状態を捨てて、次に開いたときは最初からにする。
//
// このアプリは Next.js の Cache Components を使っており、移動前のページは
// 破棄されずに React の <Activity> で隠されるだけになる（入力内容がそのまま残る）。
// 隠されるときに effect のクリーンアップが呼ばれるので、そこで key を変えて中身を作り直す。
// 同じページ内の URL の変更（検索条件の更新など）では隠されないので、作り直されない。

import { Fragment, useLayoutEffect, useState, type ReactNode } from "react";

export function FreshOnVisit({ children }: { children: ReactNode }) {
  const [visit, setVisit] = useState(0);
  useLayoutEffect(() => () => setVisit((v) => v + 1), []);
  return <Fragment key={visit}>{children}</Fragment>;
}
