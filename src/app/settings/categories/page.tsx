"use client";

import Link from "next/link";
import { useState } from "react";
import { useData } from "@/components/data-provider";
import { ConfirmDialog, Modal } from "@/components/dialog";
import { ChevronRightIcon, EditIcon, TagIcon, TrashIcon } from "@/components/icons";
import { SpotArt, StackedBoxes } from "@/components/illustrations";
import {
  Button,
  Card,
  CardTitle,
  EmptyState,
  Field,
  LoadError,
  Loading,
  Notice,
  PageHeader,
  SectionTitle,
  TextInput,
} from "@/components/ui";
import { addedCategories, categoryOptions, resolveCategory } from "@/lib/categories";
import { cleanName, sameName } from "@/lib/text";
import { CATEGORIES, CATEGORY_MAX, DEFAULT_CATEGORY, errorMessage } from "@/lib/types";

type Target = { name: string; count: number };

export default function CategoriesPage() {
  const { status, data, repo, refresh } = useData();
  const [editing, setEditing] = useState<Target | null>(null);
  const [deleting, setDeleting] = useState<Target | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const added = addedCategories(data.items);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="カテゴリの管理"
        back={{ href: "/settings", label: "設定" }}
        description="ものの登録時に追加したカテゴリの名前を変更したり、削除したりできます。"
        art={<StackedBoxes className="h-[110px] w-auto sm:h-[140px]" />}
      />

      {status === "loading" && <Loading />}
      {status === "error" && <LoadError />}
      {message && <Notice kind={message.kind}>{message.text}</Notice>}

      {status === "ready" && (
        <>
          <section aria-labelledby="added-title">
            <SectionTitle>
              <span id="added-title" className="flex items-center gap-2 font-bold">
                <TagIcon size={20} className="shrink-0 text-brand-strong" />
                追加したカテゴリ（{added.length}件）
              </span>
            </SectionTitle>
            {added.length === 0 ? (
              <EmptyState art={<SpotArt name="boxes" className="h-24 sm:h-28" />} title="追加したカテゴリはまだありません">
                ものを登録するときに、カテゴリの一覧から「＋ カテゴリを追加」を選ぶと追加できます。
              </EmptyState>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {added.map((c) => (
                  <li key={c.name}>
                    <Card className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-base font-bold text-ink">{c.name}</p>
                        <Link
                          href={`/items?category=${encodeURIComponent(c.name)}`}
                          className="inline-flex min-h-9 items-center gap-0.5 text-[13px] text-brand-strong hover:underline"
                        >
                          このカテゴリのもの {c.count}点
                          <ChevronRightIcon size={14} />
                        </Link>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditing(c)}
                          disabled={busy}
                          aria-label={`「${c.name}」の名前を変更`}
                          className="flex h-11 w-11 items-center justify-center rounded-lg border border-brand-line bg-white text-brand-strong hover:bg-brand-soft"
                        >
                          <EditIcon size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(c)}
                          disabled={busy}
                          aria-label={`「${c.name}」を削除`}
                          className="flex h-11 w-11 items-center justify-center rounded-lg border border-danger-line bg-white text-danger hover:bg-danger-soft"
                        >
                          <TrashIcon size={18} />
                        </button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Card tone="soft" className="flex flex-col gap-3">
            <CardTitle icon={<TagIcon size={18} />}>最初から用意しているカテゴリ</CardTitle>
            <ul className="flex flex-wrap gap-1.5" aria-label="最初から用意しているカテゴリ">
              {CATEGORIES.map((c) => (
                <li key={c} className="rounded-lg border border-brand-line bg-white px-2.5 py-1 text-[15px] text-ink">
                  {c}
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-muted">これらのカテゴリは変更・削除できません。</p>
          </Card>
        </>
      )}

      {editing && (
        <RenameDialog
          target={editing}
          existing={categoryOptions(data.items)}
          onClose={() => setEditing(null)}
          onSave={async (to) => {
            const count = await repo.renameCategory(editing.name, to);
            await refresh();
            setMessage({ kind: "success", text: `「${editing.name}」を「${to}」に変更しました（${count}点）。` });
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="カテゴリを削除"
        danger
        busy={busy}
        confirmLabel="削除する"
        message={
          <>
            「<strong className="font-medium text-ink">{deleting?.name}</strong>」を削除します。このカテゴリのもの
            {deleting?.count}点は「{DEFAULT_CATEGORY}」になります。もの自体は削除されません。
          </>
        }
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          setBusy(true);
          try {
            const count = await repo.renameCategory(deleting.name, DEFAULT_CATEGORY);
            await refresh();
            setMessage({
              kind: "success",
              text: `「${deleting.name}」を削除しました。${count}点を「${DEFAULT_CATEGORY}」にしました。`,
            });
          } catch (err) {
            setMessage({ kind: "error", text: errorMessage(err, "削除できませんでした。") });
          } finally {
            setBusy(false);
            setDeleting(null);
          }
        }}
      />
    </div>
  );
}

function RenameDialog({
  target,
  existing,
  onClose,
  onSave,
}: {
  target: Target;
  existing: string[];
  onClose: () => void;
  onSave: (to: string) => Promise<void>;
}) {
  const [text, setText] = useState(target.name);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // ほかのカテゴリと同じ名前にすると、そのカテゴリにまとめる
  const others = existing.filter((c) => c !== target.name);
  const mergeInto = others.find((c) => sameName(c, cleanName(text)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await onSave(resolveCategory(text, others));
    } catch (err) {
      setError(errorMessage(err, "変更できませんでした。もう一度お試しください。"));
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="カテゴリの名前を変更"
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            やめる
          </Button>
          <Button variant="primary" type="submit" form="rename-category-form" disabled={busy}>
            {busy ? "変更中…" : "変更する"}
          </Button>
        </>
      }
    >
      <form id="rename-category-form" onSubmit={submit} noValidate className="flex flex-col gap-3">
        <Field
          label="新しいカテゴリ名"
          required
          error={error}
          help={`${CATEGORY_MAX}文字まで。このカテゴリのもの${target.count}点すべてが変わります。`}
        >
          {(p) => (
            <TextInput
              {...p}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              maxLength={CATEGORY_MAX}
              autoComplete="off"
              autoFocus
            />
          )}
        </Field>
        {mergeInto && (
          <Notice kind="info">すでにあるカテゴリ「{mergeInto}」と同じ名前です。変更すると「{mergeInto}」にまとめます。</Notice>
        )}
      </form>
    </Modal>
  );
}
