"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useData } from "@/components/data-provider";
import { ConfirmDialog, Modal } from "@/components/dialog";
import { BoxIcon, EditIcon, PinIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { ItemCard } from "@/components/item-card";
import { EMPTY_LOCATION, LocationPicker } from "@/components/location-picker";
import { PhotoView } from "@/components/photo";
import {
  Button,
  Card,
  EmptyState,
  LinkButton,
  LoadError,
  Loading,
  Notice,
  PageHeader,
  SectionTitle,
} from "@/components/ui";
import { buildLookup, resolveItem } from "@/lib/search";
import { errorMessage } from "@/lib/types";

export default function StorageDetailPage() {
  return (
    <Suspense fallback={<Loading />}>
      <StorageDetail />
    </Suspense>
  );
}

function StorageDetail() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { status, data, repo, refresh } = useData();
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(
    params.get("saved") ? { kind: "success", text: "保存しました。" } : null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const storage = data.storages.find((s) => s.id === id);
  const room = storage ? data.rooms.find((r) => r.id === storage.roomId) : undefined;
  const floor = room ? data.floors.find((f) => f.id === room.floorId) : undefined;
  const views = useMemo(() => {
    const lookup = buildLookup(data);
    return data.items.filter((i) => i.storageId === id).map((i) => resolveItem(i, lookup));
  }, [data, id]);

  if (status === "loading") return <Loading />;
  if (status === "error") return <LoadError />;
  if (!storage) {
    return (
      <EmptyState title="収納場所が見つかりません" action={<LinkButton href="/places">収納場所へ</LinkButton>}>
        削除された可能性があります。
      </EmptyState>
    );
  }

  async function handleDelete() {
    if (busy || !storage) return;
    setBusy(true);
    try {
      await repo.deleteStorage(storage.id);
      await refresh();
      router.push("/places");
    } catch (e) {
      setMessage({ kind: "error", text: errorMessage(e) });
      setDeleteOpen(false);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={storage.name}
        back={{ href: "/places", label: "収納場所" }}
        description={
          <span className="inline-flex items-center gap-1">
            <PinIcon size={16} className="text-brand-strong" />
            {[floor?.name, room?.name, storage.name].filter(Boolean).join(" → ")}
          </span>
        }
      />

      {message && <Notice kind={message.kind}>{message.text}</Notice>}

      <div className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="flex flex-col gap-3 self-start">
          <h2 className="text-base text-muted">収納場所の写真</h2>
          <PhotoView
            photoId={storage.photoId}
            alt={`${storage.name}の写真`}
            kind="storage"
            className="aspect-[4/3] w-full rounded-xl border border-line"
          />
          {!storage.photoId && (
            <p className="text-[13px] text-muted">写真を登録すると、実際の場所を見つけやすくなります。</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <LinkButton href={`/places/${storage.id}/edit`}>
              <EditIcon size={18} />
              編集
            </LinkButton>
            <Button
              variant="danger"
              onClick={() => (views.length > 0 ? setMoveOpen(true) : setDeleteOpen(true))}
            >
              <TrashIcon size={18} />
              削除
            </Button>
          </div>
        </Card>

        <section aria-labelledby="storage-items">
          <SectionTitle
            aside={
              <LinkButton href={`/items/new?storage=${storage.id}`} variant="primary" className="min-h-11">
                <PlusIcon size={18} />
                ここに登録
              </LinkButton>
            }
          >
            <span id="storage-items">ここにあるもの（{views.length}点）</span>
          </SectionTitle>
          {views.length === 0 ? (
            <EmptyState icon={<BoxIcon size={32} />} title="まだ何も登録されていません" />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {views.map((v) => (
                <li key={v.item.id}>
                  <ItemCard view={v} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="収納場所の削除"
        danger
        busy={busy}
        confirmLabel="削除する"
        message={
          <>
            「<strong className="font-medium text-ink">{storage.name}</strong>」を削除します。写真も削除され、元に戻せません。
          </>
        }
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />

      {moveOpen && (
        <MoveAndDeleteDialog
          storageId={storage.id}
          storageName={storage.name}
          count={views.length}
          onClose={() => setMoveOpen(false)}
          onDone={async () => {
            await refresh();
            router.push("/places");
          }}
        />
      )}
    </div>
  );
}

/** 登録物がある収納場所は、別の場所へ移動してから削除する */
function MoveAndDeleteDialog({
  storageId,
  storageName,
  count,
  onClose,
  onDone,
}: {
  storageId: string;
  storageName: string;
  count: number;
  onClose: () => void;
  onDone: (moved: number) => Promise<void>;
}) {
  const { repo } = useData();
  const [location, setLocation] = useState(EMPTY_LOCATION);
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
    setError(null);
    try {
      const moved = await repo.moveItemsAndDeleteStorage(storageId, location.storageId);
      await onDone(moved);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="移動してから削除"
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            やめる
          </Button>
          <Button variant="danger" type="submit" form="move-delete-form" disabled={busy}>
            {busy ? "処理中…" : `${count}点を移動して削除`}
          </Button>
        </>
      }
    >
      <form id="move-delete-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Notice kind="warn">
          「{storageName}」には{count}点のものが登録されているため、そのままでは削除できません。移動先を選ぶと、すべて移動してから削除します。
        </Notice>
        {error && <Notice kind="error">{error}</Notice>}
        <LocationPicker
          value={location}
          onChange={setLocation}
          excludeStorageId={storageId}
          labels={{ floor: "移動先の階", room: "移動先の部屋", storage: "移動先の収納場所" }}
        />
      </form>
    </Modal>
  );
}
