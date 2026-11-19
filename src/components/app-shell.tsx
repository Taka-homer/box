"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { BoxIcon, GearIcon, HomeIcon, PlusIcon, SearchIcon } from "./icons";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  // 「ものを登録」は専用のボタンがあるため、一覧の選択表示にしない
  if (href === "/items" && pathname === "/items/new") return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const DESKTOP_NAV = [
  { href: "/", label: "ホーム", Icon: HomeIcon },
  { href: "/items", label: "探す・一覧", Icon: SearchIcon },
  { href: "/places", label: "収納場所", Icon: BoxIcon },
  { href: "/settings", label: "設定", Icon: GearIcon },
];

const MOBILE_NAV = [
  { href: "/", label: "ホーム", Icon: HomeIcon },
  { href: "/places", label: "収納場所", Icon: BoxIcon },
];

/** 現在のURLに応じた表示。URLが確定するまでは選択なしで表示する */
function WithPath({ render }: { render: (pathname: string) => ReactNode }) {
  return (
    <Suspense fallback={render("")}>
      <PathReader render={render} />
    </Suspense>
  );
}

function PathReader({ render }: { render: (pathname: string) => ReactNode }) {
  return render(usePathname() ?? "/");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-brand-strong"
      >
        本文へ移動
      </a>
      <header className="sticky top-0 z-30 border-b border-brand-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex min-h-11 items-center gap-2 rounded-lg text-[17px] font-medium text-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand bg-brand-soft text-brand-strong">
              <BoxIcon size={18} />
            </span>
            わが家の収納
          </Link>
          <WithPath
            render={(pathname) => (
              <nav aria-label="メインメニュー" className="hidden items-center gap-1 md:flex">
                {DESKTOP_NAV.map(({ href, label, Icon }) => {
                  const active = isActive(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-[15px] ${
                        active ? "bg-brand-soft text-brand-strong" : "text-body hover:bg-brand-softer"
                      }`}
                    >
                      <Icon size={18} />
                      {label}
                    </Link>
                  );
                })}
                <Link
                  href="/items/new"
                  className="ml-2 flex min-h-11 items-center gap-1.5 rounded-lg bg-gradient-to-b from-[#36a7cc] to-[#22739b] px-3.5 text-[15px] font-medium text-white shadow-sm hover:from-brand-strong hover:to-brand-deep"
                >
                  <PlusIcon size={18} />
                  ものを登録
                </Link>
              </nav>
            )}
          />
          <WithPath
            render={(pathname) => (
              <Link
                href="/settings"
                aria-label="設定"
                aria-current={isActive(pathname, "/settings") ? "page" : undefined}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-brand-strong hover:bg-brand-soft md:hidden"
              >
                <GearIcon size={22} />
              </Link>
            )}
          />
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 md:pb-12 md:pt-8">
        <Suspense
          fallback={
            <div role="status" className="py-12 text-center text-sm text-muted">
              読み込み中…
            </div>
          }
        >
          {children}
        </Suspense>
      </main>

      <WithPath
        render={(pathname) => (
          <nav
            aria-label="下部メニュー"
            className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-brand-line bg-white/95 backdrop-blur md:hidden"
          >
            <ul className="mx-auto grid max-w-md grid-cols-2">
              {MOBILE_NAV.map(({ href, label, Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-[13px] ${
                        active ? "text-brand-strong font-medium" : "text-muted"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-14 items-center justify-center rounded-full ${active ? "bg-brand-soft" : ""}`}
                      >
                        <Icon size={22} />
                      </span>
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      />
    </div>
  );
}
