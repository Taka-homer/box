"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useRef, useState } from "react";
import { useData } from "@/components/data-provider";
import { ConfirmDialog, Modal } from "@/components/dialog";
import { CheckIcon, ChevronRightIcon, EditIcon, MoveIcon, PinIcon, QuestionIcon, TrashIcon } from "@/components/icons";
import { locationOfStorage } from "@/components/item-form";
import { LocationPicker, type LocationValue } from "@/components/location-picker";
import { PhotoView } from "@/components/photo";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  LinkButton,
  LoadError,
  Loading,
  Notice,
  PageHeader,
  TextInput,
} from "@/components/ui";
import { LIMITS } from "@/lib/idb-repository";
import { buildLookup, resolveItem } from "@/lib/search";
import { formatDateTime } from "@/lib/text";
import { errorMessage } from "@/lib/types";

export default function ItemDetailPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ItemDetail />
    </Suspense>
  );
}

function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { status, data, repo, refresh } = useData();
  const [savedNotice, setSavedNotice] = useState(Boolean(params.get("saved")));
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const busyRef = useRef(false);

  const view = useMemo(() => {
    const item = data.items.find((i) => i.id === id);
    return item ? resolveItem(item, buildLookup(data)) : null;
  }, [data, id]);

  if (status === "loading") return <Loading />;
  if (status === "error") return <LoadError />;
  if (!view) {
    return (
      <EmptyState title="登録が見つかりません" action={<LinkButton href="/items">一覧へ</LinkButton>}>
        削除された可能性があります。
      </EmptyState>
    );
  }
  const { item, storage, room, floor } = view;

  async function act(fn: () => Promise<unknown>, success: string) {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setMessage(null);
    setSavedNotice(false);
    try {
      await fn();
      await refresh();
      setMessage({ kind: "success", text: success });
      return true;
    } catch (e) {
      setMessage({ kind: "error", text: errorMessage(e) });
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <PageHeader title={item.name} back={{ href: "/items", label: "一覧へ" }} />

      {savedNotice && <Notice kind="success">保存しました。</Notice>}

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="muted">{item.category}</Badge>
        {item.status === "missing" ? <Badge tone="warn">見つからない</Badge> : <Badge>通常</Badge>}
        {item.demoKey && <Badge>見本</Badge>}
      </div>

      {item.status === "missing" && (
        <Notice kind="warn">
          「見つからない」状態です。下に表示しているのは、最後に記録された場所です。見つかったら「見つかった」を押してください。
        </Notice>
      )}

      <div className="grid gap-5 md:grid-cols-2">

        <Card className="flex flex-col gap-3">
          <h2 className="text-base text-muted">しまった場所</h2>
          <p className="flex items-start gap-1.5 text-[17px] font-medium text-ink">
            <PinIcon size={20} className="mt-1 shrink-0 text-brand-strong" />
            <span className="break-words">
              {[floor?.name, room?.name, storage?.name].filter(Boolean).join(" → ") || "場所が不明"}
            </span>
          </p>
          <dl className="text-[15px]">
            <dt className="text-[13px] text-muted">詳しい位置</dt>
            <dd className="break-words">{item.detail || "記録なし"}</dd>
          </dl>
          <PhotoView
            photoId={storage?.photoId}
            alt={`${storage?.name ?? "収納場所"}の写真`}
            kind="storage"
            className="aspect-[4/3] w-full rounded-xl border border-line"
          />
          {storage && (
            <Link
              href={`/places/${storage.id}`}
              className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-brand-strong hover:underline"
            >
              「{storage.name}」にあるものを見る
              <ChevronRightIcon size={16} />
            </Link>
          )}
        </Card>

        <Card className="flex flex-col gap-3 self-start md:order-first">
          <h2 className="text-base text-muted">ものの写真</h2>
          <PhotoView
            photoId={item.photoId}
            alt={`${item.name}の写真`}
            className={`w-full rounded-xl border border-line ${item.photoId ? "aspect-[4/3]" : "h-28"}`}
          />
        </Card>
      </div>

      <Card>
        <dl className="grid gap-4 text-[15px] sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-[13px] text-muted">メモ</dt>
            <dd className="whitespace-pre-wrap break-words">{item.memo || "記録なし"}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted">状態</dt>
            <dd>{item.status === "missing" ? "見つからない" : "通常"}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted">最終確認日時</dt>
            <dd>{formatDateTime(item.lastCheckedAt)}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted">登録日時</dt>
            <dd>{formatDateTime(item.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted">更新日時</dt>
            <dd>{formatDateTime(item.updatedAt)}</dd>
          </div>
        </dl>
      </Card>

      {message && <Notice kind={message.kind}>{message.text}</Notice>}

      <section aria-label="操作" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => act(() => repo.markFound(item.id), "「見つかった」を記録しました。最終確認日時を更新しました。")}
        >
          <CheckIcon size={18} />
          見つかった
        </Button>
        <Button disabled={busy} onClick={() => setMoveOpen(true)}>
          <MoveIcon size={18} />
          置き場所を変更
        </Button>
        <Button
          disabled={busy || item.status === "missing"}
          onClick={() => act(() => repo.markMissing(item.id), "「見つからない」にしました。最後の場所は残しています。")}
        >
          <QuestionIcon size={18} />
          見つからない
        </Button>
        <LinkButton href={`/items/${item.id}/edit`}>
          <EditIcon size={18} />
          編集
        </LinkButton>
        <Button variant="danger" disabled={busy} onClick={() => setDeleteOpen(true)}>
          <TrashIcon size={18} />
          削除
        </Button>
      </section>

      {moveOpen && (
        <MoveDialog
          initial={locationOfStorage(data, item.storageId)}
          initialDetail={item.detail}
          onClose={() => setMoveOpen(false)}
          onMove={async (storageId, detail) => {
            const ok = await act(
              () => repo.moveItem(item.id, storageId, detail),
              "置き場所を変更しました。最終確認日時を更新しました。",
            );
            if (ok) setMoveOpen(false);
            return ok;
          }}
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="削除の確認"
        danger
        busy={busy}
        confirmLabel="削除する"
        message={
          <>
            「<strong className="font-medium text-ink">{item.name}</strong>」を削除します。写真も削除され、元に戻せません。
          </>
        }
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          const ok = await act(() => repo.deleteItem(item.id), "削除しました。");
          if (ok) router.push("/items");
        }}
      />
    </div>
  );
}

function MoveDialog({
  initial,
  initialDetail,
  onClose,
  onMove,
}: {
  initial: LocationValue;
  initialDetail: string;
  onClose: () => void;
  onMove: (storageId: string, detail: string) => Promise<boolean>;
}) {
  const [location, setLocation] = useState(initial);
  const [detail, setDetail] = useState(initialDetail);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!location.storageId) {
      setError("移動先の収納場所を選んでください。");
      return;
    }
    setBusy(true);
    const ok = await onMove(location.storageId, detail);
    if (!ok) {
      setError("変更できませんでした。もう一度お試しください。");
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="置き場所を変更"
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            やめる
          </Button>
          <Button variant="primary" type="submit" form="move-form" disabled={busy}>
            {busy ? "変更中…" : "この場所に変更"}
          </Button>
        </>
      }
    >
      <form id="move-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {error && <Notice kind="error">{error}</Notice>}
        <LocationPicker
          value={location}
          onChange={setLocation}
          labels={{ floor: "移動先の階", room: "移動先の部屋", storage: "移動先の収納場所" }}
        />
        <Field label="詳しい位置">
          {(p) => (
            <TextInput {...p} value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={LIMITS.detail} />
          )}
        </Field>
        <p className="text-[13px] text-muted">変更すると、状態は「通常」に戻り、最終確認日時が今の時刻になります。</p>
      </form>
    </Modal>
  );
}
