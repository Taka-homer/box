"use client";

import { useEffect, useRef, useState } from "react";
import { useData } from "@/components/data-provider";
import { ConfirmDialog } from "@/components/dialog";
import { FamilySection } from "@/components/family-section";
import { BookIcon, DocIcon, DownloadIcon, GridIcon, InfoIcon, SparkIcon, TagIcon, UploadIcon } from "@/components/icons";
import { FileBox } from "@/components/illustrations";
import { Button, Card, CardTitle, LinkButton, Notice, PageHeader } from "@/components/ui";
import { fetchAiStatus } from "@/lib/ai-client";
import { addedCategories } from "@/lib/categories";
import { backupFileName, MAX_BACKUP_BYTES, parseBackup, serializeBackup, type BackupSummary } from "@/lib/backup";
import { addDemoData, fetchDemoPhoto } from "@/lib/demo";
import { IMAGE_HELP_TEXT } from "@/lib/image";
import { formatDateTime } from "@/lib/text";
import { errorMessage, type Snapshot } from "@/lib/types";

type Msg = { kind: "success" | "error"; text: string } | null;

export default function SettingsPage() {
  const { data, repo, refresh, status, access } = useData();
  const cloud = access.mode === "cloud" && access.phase === "ready" ? access.membership : null;
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [backupMsg, setBackupMsg] = useState<Msg>(null);
  const [demoMsg, setDemoMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ snapshot: Snapshot; summary: BackupSummary; fileName: string } | null>(null);
  const [removeDemoOpen, setRemoveDemoOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAiStatus().then(setAiAvailable);
  }, []);

  const demoCount = data.items.filter((i) => i.demoKey).length;

  async function guard(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  const exportBackup = () =>
    guard(async () => {
      setBackupMsg(null);
      try {
        const json = serializeBackup(await repo.exportSnapshot());
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = backupFileName();
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        setBackupMsg({
          kind: "success",
          text: "バックアップを書き出しました。ダウンロードしたファイルを大切に保管してください。",
        });
      } catch (e) {
        setBackupMsg({ kind: "error", text: errorMessage(e, "バックアップを書き出せませんでした。") });
      }
    });

  async function readFile(file: File | undefined) {
    if (!file) return;
    setBackupMsg(null);
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("too large");
      const text = await file.text();
      const { snapshot, summary } = parseBackup(text);
      setPending({ snapshot, summary, fileName: file.name });
    } catch (e) {
      setBackupMsg({
        kind: "error",
        text: errorMessage(e, "バックアップファイルを読み込めませんでした。ファイルを確認してください。"),
      });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const restore = () =>
    guard(async () => {
      if (!pending) return;
      try {
        await repo.replaceAll(pending.snapshot);
        await refresh();
        setDemoMsg(null);
        setBackupMsg({
          kind: "success",
          text: `復元しました（もの${pending.summary.items}点、収納場所${pending.summary.storages}件、写真${pending.summary.photos}枚）。`,
        });
      } catch (e) {
        setBackupMsg({
          kind: "error",
          text: errorMessage(e, "復元できませんでした。現在のデータは変更されていません。"),
        });
      } finally {
        setPending(null);
      }
    });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="設定"
        back={{ href: "/", label: "ホーム" }}
        description="データの保存・バックアップ・マイ辞書・見本データなどを設定します。"
        art={<FileBox className="h-[110px] w-auto sm:h-[140px]" />}
      />

      {cloud && <FamilySection membership={cloud} />}

      <section aria-labelledby="storage-title">
        <Card tone="soft" className="flex flex-col gap-2 text-[15px]">
          <CardTitle id="storage-title" icon={<InfoIcon size={18} />}>データの保存について</CardTitle>
          {cloud ? (
            <>
              <p>
                登録したデータと写真は、<strong className="font-medium text-ink">家族だけが見られるクラウド（Supabase）</strong>
                に保存され、招待した家族のスマホと共有されます。
              </p>
              <ul className="list-disc space-y-1 pl-5 text-[14px]">
                <li>家族のだれかが登録・移動すると、ほかの人の画面にもすぐ反映されます。</li>
                <li>使うにはインターネット接続が必要です。</li>
                <li>この端末のブラウザのデータを消しても、家族のデータは消えません（もう一度招待を受ければ見られます）。</li>
                <li>写真は {IMAGE_HELP_TEXT}</li>
              </ul>
            </>
          ) : (
            <>
              <p>
                登録したデータと写真は、<strong className="font-medium text-ink">この端末のこのブラウザの中</strong>
                に保存されます。インターネット上には保存されません。
              </p>
              <ul className="list-disc space-y-1 pl-5 text-[14px]">
                <li>ブラウザの履歴やサイトデータを削除すると、登録内容も消えます。</li>
                <li>別の端末や別のブラウザとは共有されません。</li>
                <li>プライベートブラウズでは、閉じると消える場合があります。</li>
                <li>写真は {IMAGE_HELP_TEXT}</li>
              </ul>
            </>
          )}
          <p className="text-[14px] text-muted">
            大切なデータは、下の「バックアップ」で定期的にファイルに保存してください。
          </p>
          {status === "ready" && (
            <p className="text-[13px] text-muted">
              現在の登録：もの{data.items.length}点／収納場所{data.storages.length}件／部屋{data.rooms.length}件／階
              {data.floors.length}件
            </p>
          )}
        </Card>
      </section>

      <section aria-labelledby="backup-title">
        <Card tone="soft" className="flex flex-col gap-4">
          <CardTitle id="backup-title" icon={<DownloadIcon size={18} />}>バックアップ</CardTitle>
          <p className="text-[15px]">
            写真を含むすべてのデータを1つのファイルに書き出し、あとで読み込んで元に戻せます。
          </p>
          {backupMsg && <Notice kind={backupMsg.kind}>{backupMsg.text}</Notice>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="primary" onClick={exportBackup} disabled={busy || status !== "ready"}>
              <DownloadIcon size={18} />
              バックアップを書き出す
            </Button>
            <input
              ref={fileRef}
              id="backup-file"
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-describedby="backup-help"
              onChange={(e) => readFile(e.target.files?.[0])}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={busy}>
              <UploadIcon size={18} />
              バックアップから復元
            </Button>
          </div>
          <p id="backup-help" className="text-[13px] text-muted">
            {cloud
              ? "復元すると、家族全員が見ているデータがすべて置き換わります。読み込む前に確認画面を表示します。"
              : "復元すると、今このブラウザにあるデータはすべて置き換わります。読み込む前に確認画面を表示します。"}
          </p>
        </Card>
      </section>

      <section aria-labelledby="words-title">
        <Card tone="soft" className="flex flex-col gap-3">
          <CardTitle id="words-title" icon={<BookIcon size={18} />}>マイ辞書</CardTitle>
          <p className="text-[15px]">
            「ボイラー室＝機械室」のように、家族の呼び方や言い換えを登録できます。登録すると、どちらの言葉で検索しても見つかります。
          </p>
          <p className="text-[13px] text-muted">登録数：{data.words.length}組</p>
          <LinkButton href="/settings/words" className="self-start">
            <DocIcon size={18} />
            マイ辞書を開く
          </LinkButton>
        </Card>
      </section>

      <section aria-labelledby="categories-title">
        <Card tone="soft" className="flex flex-col gap-3">
          <CardTitle id="categories-title" icon={<TagIcon size={18} />}>カテゴリ</CardTitle>
          <p className="text-[15px]">
            ものの登録時に追加したカテゴリの名前を変更したり、削除したりできます。
          </p>
          <p className="text-[13px] text-muted">追加したカテゴリ：{addedCategories(data.items).length}件</p>
          <LinkButton href="/settings/categories" className="self-start">
            <TagIcon size={18} />
            カテゴリの管理を開く
          </LinkButton>
        </Card>
      </section>

      <section aria-labelledby="demo-title">
        <Card tone="soft" className="flex flex-col gap-3">
          <CardTitle id="demo-title" icon={<GridIcon size={18} />}>見本データ</CardTitle>
          <p className="text-[15px]">
            使い方を試すための見本（エアコンの保証書など7件）を追加します。見本には「見本」の表示が付き、何度押しても重複しません。
          </p>
          {demoMsg && <Notice kind={demoMsg.kind}>{demoMsg.text}</Notice>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() =>
                guard(async () => {
                  try {
                    const added = await addDemoData(repo, fetchDemoPhoto);
                    await refresh();
                    setDemoMsg({
                      kind: "success",
                      text: added ? `見本データを${added}件追加しました。` : "見本データはすでに追加されています。",
                    });
                  } catch (e) {
                    setDemoMsg({ kind: "error", text: errorMessage(e, "見本データを追加できませんでした。") });
                  }
                })
              }
              disabled={busy || status !== "ready"}
            >
              見本データを追加
            </Button>
            {demoCount > 0 && (
              <Button variant="danger" onClick={() => setRemoveDemoOpen(true)} disabled={busy}>
                見本データを削除（{demoCount}件）
              </Button>
            )}
          </div>
        </Card>
      </section>

      <section aria-labelledby="ai-title">
        <Card tone="soft" className="flex flex-col gap-2 text-[15px]">
          <CardTitle id="ai-title" icon={<SparkIcon size={18} />}>AI検索</CardTitle>
          <p className="flex items-center gap-2">
            <SparkIcon size={20} className="text-brand-strong" />
            {aiAvailable === null
              ? "確認中…"
              : aiAvailable
                ? "AI検索を利用できます。"
                : "AI検索は設定されていません（通常検索のみ）。"}
          </p>
          <p className="text-[14px] text-muted">
            AI検索を使うときだけ、登録物の名前・カテゴリ・詳しい位置・メモを外部のAIに送信します。写真は送信しません。
            {cloud
              ? "AI検索を使わない限り、家族のクラウド以外にデータが送信されることはありません。"
              : "AI検索を使わない限り、データが外部に送信されることはありません。"}
          </p>
        </Card>
      </section>

      <ConfirmDialog
        open={pending !== null}
        title="バックアップから復元"
        danger
        busy={busy}
        confirmLabel="置き換えて復元"
        message={
          pending && (
            <div className="flex flex-col gap-2">
              <p>
                「{pending.fileName}」の内容で、
                <strong className="font-medium text-danger">
                  {cloud ? "家族全員の現在のデータをすべて置き換えます" : "現在のデータをすべて置き換えます"}
                </strong>
                。元に戻せません。
              </p>
              <ul className="rounded-xl bg-brand-softer px-4 py-3 text-[14px]">
                <li>書き出し日時：{formatDateTime(pending.summary.exportedAt)}</li>
                <li>
                  もの{pending.summary.items}点／収納場所{pending.summary.storages}件／部屋{pending.summary.rooms}件／階
                  {pending.summary.floors}件／写真{pending.summary.photos}枚／マイ辞書{pending.summary.words}組
                </li>
              </ul>
              <p className="text-[14px] text-muted">
                現在のデータ：もの{data.items.length}点／収納場所{data.storages.length}件
              </p>
            </div>
          )
        }
        onClose={() => setPending(null)}
        onConfirm={restore}
      />

      <ConfirmDialog
        open={removeDemoOpen}
        title="見本データの削除"
        danger
        busy={busy}
        confirmLabel="削除する"
        message="見本のもの・書類を削除します。見本の階・部屋・収納場所は、あなたが登録したものが入っていなければ一緒に削除します。"
        onClose={() => setRemoveDemoOpen(false)}
        onConfirm={() =>
          guard(async () => {
            try {
              await repo.removeDemoData();
              await refresh();
              setDemoMsg({ kind: "success", text: "見本データを削除しました。" });
            } catch (e) {
              setDemoMsg({ kind: "error", text: errorMessage(e, "見本データを削除できませんでした。") });
            } finally {
              setRemoveDemoOpen(false);
            }
          })
        }
      />
    </div>
  );
}
