"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useData } from "./data-provider";
import { BoxIcon } from "./icons";
import { Button, Card, Field, Loading, Notice, TextInput } from "./ui";
import { getSupabase } from "@/lib/cloud/client";
import {
  DISPLAY_NAME_MAX,
  HOUSEHOLD_NAME_MAX,
  canCreateHousehold,
  createHousehold,
  formatInviteCode,
  joinHousehold,
} from "@/lib/cloud/household";
import { errorMessage } from "@/lib/types";

/** 家族共有モードで、家族に参加するまでアプリの中身を表示しない */
export function AccessGate({ children }: { children: React.ReactNode }) {
  const { access, reloadAccess } = useData();
  if (access.mode === "local" || access.phase === "ready") return <>{children}</>;
  if (access.phase === "checking") return <Loading label="接続しています…" />;
  if (access.phase === "error") {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 py-6">
        <Notice kind="error">接続できませんでした。電波の良い場所で、もう一度お試しください。</Notice>
        <Button variant="primary" onClick={() => void reloadAccess()}>
          もう一度試す
        </Button>
      </div>
    );
  }
  return <Onboarding />;
}

function Onboarding() {
  const { reloadAccess } = useData();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const inviteParam = params.get("invite") ?? "";

  const [canCreate, setCanCreate] = useState<boolean | null>(null);
  const [view, setView] = useState<"join" | "create" | null>(inviteParam ? "join" : null);
  const [code, setCode] = useState(inviteParam ? formatInviteCode(inviteParam) : "");
  const [householdName, setHouseholdName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    let cancelled = false;
    canCreateHousehold(getSupabase()).then((ok) => {
      if (!cancelled) setCanCreate(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const mode = view ?? (canCreate ? "create" : "join");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const sb = getSupabase();
      if (mode === "create") await createHousehold(sb, householdName, displayName);
      else await joinHousehold(sb, code, displayName);
      // 招待コードをURLに残さない
      if (inviteParam) router.replace(pathname);
      await reloadAccess();
    } catch (err) {
      setError(errorMessage(err));
      submitting.current = false;
      setBusy(false);
    }
  }

  if (canCreate === null && !inviteParam) return <Loading label="接続しています…" />;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 py-2">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand bg-brand-soft text-brand-strong">
          <BoxIcon size={30} />
        </span>
        <h1 className="text-[22px]">{mode === "create" ? "はじめに家族を作りましょう" : "家族に参加する"}</h1>
        <p className="text-[14px] text-muted">
          {mode === "create"
            ? "家族を作ったあと、招待リンクを送ると家族のスマホでも同じ内容を見られます。"
            : "家族から届いた招待リンクを開くか、招待コードを入力してください。"}
        </p>
      </div>

      <Card>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {error && <Notice kind="error">{error}</Notice>}
          {mode === "join" ? (
            <Field label="招待コード" required help="例：AB12-CD34-EF56（区切りはなくても大丈夫です）">
              {(p) => (
                <TextInput
                  {...p}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  inputMode="text"
                  className="font-mono tracking-wider"
                />
              )}
            </Field>
          ) : (
            <Field label="家族の名前" required help="例：山田家、わが家">
              {(p) => (
                <TextInput
                  {...p}
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  maxLength={HOUSEHOLD_NAME_MAX}
                  autoComplete="off"
                />
              )}
            </Field>
          )}
          <Field label="あなたの表示名" required help="家族に表示される名前です。例：ママ、たろう">
            {(p) => (
              <TextInput
                {...p}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={DISPLAY_NAME_MAX}
                autoComplete="nickname"
              />
            )}
          </Field>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "処理中…" : mode === "create" ? "家族を作る" : "参加する"}
          </Button>
        </form>
      </Card>

      {canCreate && (
        <button
          type="button"
          onClick={() => {
            setView(mode === "create" ? "join" : "create");
            setError(null);
          }}
          className="min-h-11 text-sm text-brand-strong underline"
        >
          {mode === "create" ? "招待コードをお持ちの方はこちら" : "新しく家族を作る"}
        </button>
      )}

      <Notice kind="info">
        登録した内容と写真は、家族だけが見られるクラウドに保存されます。パスワードは不要で、この端末が家族のメンバーとして記録されます。ブラウザのデータを消した場合は、もう一度招待を受けてください。
      </Notice>
    </div>
  );
}
