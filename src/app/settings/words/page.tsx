"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { useData } from "@/components/data-provider";
import { ConfirmDialog, Modal } from "@/components/dialog";
import { EditIcon, PlusIcon, TrashIcon } from "@/components/icons";
import {
  Button,
  Card,
  EmptyState,
  Field,
  LoadError,
  Loading,
  Notice,
  PageHeader,
  SectionTitle,
  TextInput,
} from "@/components/ui";
import { splitWordInput, WORD_LIMITS } from "@/lib/my-words";
import { errorMessage, type WordGroup } from "@/lib/types";

const HELP = `同じ意味として扱う言葉を「、」で区切って${WORD_LIMITS.minWords}つ以上入力します。例：ボイラー室、機械室`;

export default function MyWordsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="マイ辞書"
        back={{ href: "/settings", label: "設定" }}
        description="家族の呼び方や言い換えを登録すると、どちらの言葉で検索しても見つかるようになります。"
      />
      <Suspense fallback={<Loading />}>
        <MyWords />
      </Suspense>
    </div>
  );
}

function WordChips({ words }: { words: string[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="言葉">
      {words.map((w, i) => (
        <li key={`${w}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && (
            <span aria-hidden="true" className="text-muted">
              ＝
            </span>
          )}
          <span className="rounded-lg border border-brand-line bg-brand-softer px-2.5 py-1 text-[15px] text-ink">
            {w}
          </span>
        </li>
      ))}
    </ul>
  );
}

function MyWords() {
  const { status, data, repo, refresh } = useData();
  const params = useSearchParams();
  const [text, setText] = useState(() => params.get("add") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<WordGroup | null>(null);
  const [deleting, setDeleting] = useState<WordGroup | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);

  const preview = splitWordInput(text);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const g = await repo.addWordGroup(preview);
      await refresh();
      setText("");
      setMessage(`「${g.words.join("」＝「")}」を登録しました。`);
      inputRef.current?.focus();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (status === "loading") return <Loading />;
  if (status === "error") return <LoadError />;

  return (
    <>
      <Card>
        <form onSubmit={add} noValidate className="flex flex-col gap-4">
          <h2 className="text-base text-muted">言葉を登録</h2>
          <Field label="同じ意味の言葉" required error={error} help={HELP}>
            {(p) => (
              <TextInput
                {...p}
                ref={inputRef}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setError(null);
                }}
                placeholder="例：ボイラー室、機械室"
                autoComplete="off"
              />
            )}
          </Field>
          {preview.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[13px] text-muted">登録される内容</p>
              <WordChips words={preview} />
            </div>
          )}
          <Button type="submit" variant="primary" disabled={busy} className="self-start">
            <PlusIcon size={18} />
            {busy ? "登録中…" : "登録する"}
          </Button>
        </form>
      </Card>

      {message && <Notice kind="success">{message}</Notice>}

      <section aria-labelledby="words-list">
        <SectionTitle>
          <span id="words-list">登録した言葉（{data.words.length}組）</span>
        </SectionTitle>
        {data.words.length === 0 ? (
          <EmptyState title="まだ登録がありません">
            例：「ボイラー室、機械室」「じいじの部屋、和室」「パパの書斎、仕事部屋」など、家族の呼び方を登録すると便利です。
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {data.words.map((g) => (
              <li key={g.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
                  <div className="min-w-0 flex-1">
                    <WordChips words={g.words} />
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditing(g)}
                      aria-label={`「${g.words.join("・")}」を編集`}
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-brand-line text-brand-strong hover:bg-brand-soft"
                    >
                      <EditIcon size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(g)}
                      aria-label={`「${g.words.join("・")}」を削除`}
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-danger-line text-danger hover:bg-danger-soft"
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

      <Notice kind="info">
        マイ辞書はこの端末のブラウザに保存され、バックアップにも含まれます。外部には送信しません。
      </Notice>

      {editing && (
        <EditDialog
          group={editing}
          onClose={() => setEditing(null)}
          onSave={async (words) => {
            await repo.updateWordGroup(editing.id, words);
            await refresh();
            setMessage("変更しました。");
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="マイ辞書から削除"
        danger
        busy={busy}
        confirmLabel="削除する"
        message={<>「{deleting?.words.join("」＝「")}」を削除します。登録したもの・書類は削除されません。</>}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          setBusy(true);
          try {
            await repo.deleteWordGroup(deleting.id);
            await refresh();
            setMessage("削除しました。");
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
            setDeleting(null);
          }
        }}
      />
    </>
  );
}

function EditDialog({
  group,
  onClose,
  onSave,
}: {
  group: WordGroup;
  onClose: () => void;
  onSave: (words: string[]) => Promise<void>;
}) {
  const [text, setText] = useState(group.words.join("、"));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const preview = splitWordInput(text);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(preview);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="言葉を編集"
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            やめる
          </Button>
          <Button variant="primary" type="submit" form="edit-words-form" disabled={busy}>
            {busy ? "保存中…" : "保存する"}
          </Button>
        </>
      }
    >
      <form id="edit-words-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label="同じ意味の言葉" required error={error} help={HELP}>
          {(p) => <TextInput {...p} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />}
        </Field>
        {preview.length > 0 && <WordChips words={preview} />}
      </form>
    </Modal>
  );
}
