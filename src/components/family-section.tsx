"use client";

import { useCallback, useEffect, useState } from "react";
import { useData } from "./data-provider";
import { ConfirmDialog, Modal } from "./dialog";
import { CheckIcon, EditIcon, PlusIcon, TrashIcon } from "./icons";
import { Badge, Button, Card, Field, Notice, SectionTitle, TextInput } from "./ui";
import { getSupabase } from "@/lib/cloud/client";
import {
  DISPLAY_NAME_MAX,
  createInvite,
  formatInviteCode,
  inviteLink,
  leaveHousehold,
  listActiveInvites,
  listMembers,
  removeMember,
  renameSelf,
  revokeInvite,
  type Invite,
  type Member,
  type Membership,
} from "@/lib/cloud/household";
import { formatDateTime } from "@/lib/text";
import { errorMessage } from "@/lib/types";

type Msg = { kind: "success" | "error"; text: string } | null;

/** 家族共有モードの「家族とメンバー」設定 */
export function FamilySection({ membership }: { membership: Membership }) {
  const { reloadAccess } = useData();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [message, setMessage] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const [newInvite, setNewInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const isOwner = membership.role === "owner";
  const { householdId } = membership;

  const load = useCallback(async () => {
    const sb = getSupabase();
    const [m, i] = await Promise.all([listMembers(sb, householdId), listActiveInvites(sb, householdId)]);
    return { m, i };
  }, [householdId]);

  const reload = useCallback(async () => {
    try {
      const { m, i } = await load();
      setMembers(m);
      setInvites(i);
    } catch (e) {
      setMessage({ kind: "error", text: errorMessage(e) });
    }
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    load()
      .then(({ m, i }) => {
        if (cancelled) return;
        setMembers(m);
        setInvites(i);
      })
      .catch((e) => {
        if (!cancelled) setMessage({ kind: "error", text: errorMessage(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function run(fn: () => Promise<unknown>, success?: string) {
    if (busy) return false;
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      if (success) setMessage({ kind: "success", text: success });
      await reload();
      return true;
    } catch (e) {
      setMessage({ kind: "error", text: errorMessage(e) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const link = newInvite ? inviteLink(window.location.origin, newInvite.code) : "";

  async function share() {
    if (!newInvite) return;
    const text = `「わが家の収納」に招待します。このリンクを開いて参加してください（${formatDateTime(newInvite.expiresAt)}まで有効）。`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "わが家の収納への招待", text, url: link });
        return;
      }
    } catch {
      // 共有をやめた場合などはコピーにする
    }
    await copy();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMessage({ kind: "error", text: "コピーできませんでした。リンクを長押ししてコピーしてください。" });
    }
  }

  return (
    <section aria-labelledby="family-title">
      <SectionTitle>
        <span id="family-title">家族とメンバー</span>
      </SectionTitle>
      <Card className="flex flex-col gap-5">
        {message && <Notice kind={message.kind}>{message.text}</Notice>}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[13px] text-muted">家族</p>
            <p className="text-lg font-medium text-ink">{membership.householdName}</p>
          </div>
          <Button onClick={() => setRenaming(true)} className="min-h-11">
            <EditIcon size={18} />
            自分の表示名を変更
          </Button>
        </div>

        <div>
          <h3 className="mb-2 text-base">メンバー（{members.length}人）</h3>
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
            {members.map((m) => (
              <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-ink">{m.displayName}</span>
                  {m.role === "owner" && <Badge>管理者</Badge>}
                  {m.userId === membership.userId && <Badge tone="muted">あなた</Badge>}
                </span>
                {isOwner && m.userId !== membership.userId && (
                  <Button variant="ghost" className="min-h-11 text-danger" onClick={() => setRemoving(m)} disabled={busy}>
                    <TrashIcon size={16} />
                    外す
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-base">家族を招待</h3>
          <p className="text-[14px] text-muted">
            招待リンクをLINEなどで送ってください。リンクは7日間・10人まで有効です。リンクを知っている人は誰でも参加できるため、家族以外には送らないでください。
          </p>
          <Button
            variant="primary"
            className="self-start"
            disabled={busy}
            onClick={() =>
              run(async () => {
                setNewInvite(await createInvite(getSupabase(), householdId));
              })
            }
          >
            <PlusIcon size={18} />
            招待リンクを作る
          </Button>

          {newInvite && (
            <div className="flex flex-col gap-3 rounded-xl border border-brand bg-brand-softer p-4">
              <div>
                <p className="text-[13px] text-muted">招待リンク</p>
                <p className="break-all text-[15px] text-ink">{link}</p>
              </div>
              <div>
                <p className="text-[13px] text-muted">招待コード（リンクが開けないとき）</p>
                <p className="font-mono text-xl tracking-wider text-ink">{formatInviteCode(newInvite.code)}</p>
              </div>
              <p className="text-[13px] text-muted">{formatDateTime(newInvite.expiresAt)}まで有効</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={share}>
                  送る
                </Button>
                <Button onClick={copy}>
                  {copied ? <CheckIcon size={18} /> : null}
                  {copied ? "コピーしました" : "リンクをコピー"}
                </Button>
              </div>
            </div>
          )}

          {invites.length > 0 && (
            <div>
              <p className="mb-1.5 text-[13px] text-muted">有効な招待</p>
              <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
                {invites.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span className="text-[14px]">
                      <span className="font-mono tracking-wider text-ink">{formatInviteCode(i.code)}</span>
                      <span className="ml-2 text-muted">
                        {formatDateTime(i.expiresAt)}まで・{i.usedCount}/{i.maxUses}人
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      className="min-h-11"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await revokeInvite(getSupabase(), i.id);
                          if (newInvite?.code === i.code) setNewInvite(null);
                        }, "招待を取り消しました。")
                      }
                    >
                      取り消す
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <p className="text-[13px] text-muted">
          この端末は、パスワードなしで家族のメンバーとして記録されています。ブラウザのデータを消すと、もう一度招待を受ける必要があります。
        </p>

        {!isOwner && (
          <Button variant="danger" className="self-start" onClick={() => setLeaving(true)} disabled={busy}>
            この家族から抜ける
          </Button>
        )}
      </Card>

      {renaming && (
        <RenameDialog
          initial={membership.displayName}
          onClose={() => setRenaming(false)}
          onSave={async (name) => {
            await renameSelf(getSupabase(), householdId, membership.userId, name);
            await reloadAccess();
            await reload();
            setMessage({ kind: "success", text: "表示名を変更しました。" });
            setRenaming(false);
          }}
        />
      )}

      <ConfirmDialog
        open={removing !== null}
        title="メンバーを外す"
        danger
        busy={busy}
        confirmLabel="外す"
        message={
          <>
            「{removing?.displayName}」を家族から外します。外した人は、この家族のデータを見られなくなります。登録したもの・書類は残ります。
          </>
        }
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          const target = removing;
          await run(() => removeMember(getSupabase(), householdId, target.userId), `「${target.displayName}」を外しました。`);
          setRemoving(null);
        }}
      />

      <ConfirmDialog
        open={leaving}
        title="家族から抜ける"
        danger
        busy={busy}
        confirmLabel="抜ける"
        message="この端末では家族のデータを見られなくなります。もう一度使うには、家族から新しい招待を受けてください。登録したもの・書類は家族のデータとして残ります。"
        onClose={() => setLeaving(false)}
        onConfirm={async () => {
          const ok = await run(() => leaveHousehold(getSupabase(), householdId));
          setLeaving(false);
          if (ok) await reloadAccess();
        }}
      />
    </section>
  );
}

function RenameDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open
      onClose={onClose}
      title="表示名を変更"
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            やめる
          </Button>
          <Button variant="primary" type="submit" form="rename-self-form" disabled={busy}>
            {busy ? "保存中…" : "保存する"}
          </Button>
        </>
      }
    >
      <form
        id="rename-self-form"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError(null);
          try {
            await onSave(name);
          } catch (err) {
            setError(errorMessage(err));
            setBusy(false);
          }
        }}
      >
        <Field label="表示名" required error={error}>
          {(p) => (
            <TextInput {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={DISPLAY_NAME_MAX} />
          )}
        </Field>
      </form>
    </Modal>
  );
}
