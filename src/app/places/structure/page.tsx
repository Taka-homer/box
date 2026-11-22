"use client";

import { FreshOnVisit } from "@/components/fresh-on-visit";
import { useRef, useState } from "react";
import { useData } from "@/components/data-provider";
import { ConfirmDialog, Modal } from "@/components/dialog";
import { EditIcon, PlusIcon, RoomIcon, TrashIcon } from "@/components/icons";
import { SteelShelf } from "@/components/illustrations";
import { Button, Card, Field, LoadError, Loading, Notice, PageHeader, TextInput } from "@/components/ui";
import { errorMessage } from "@/lib/types";

type Target = { kind: "floor" | "room"; id: string; name: string };

function StructurePageContent() {
  const { status, data, repo, refresh } = useData();
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [renaming, setRenaming] = useState<Target | null>(null);
  const [deleting, setDeleting] = useState<Target | null>(null);
  const [adding, setAdding] = useState<{ kind: "floor" } | { kind: "room"; floorId: string; floorName: string } | null>(
    null,
  );
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);

  async function act(fn: () => Promise<unknown>, success?: string) {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    try {
      await fn();
      await refresh();
      setMessage(success ? { kind: "success", text: success } : null);
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
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <PageHeader
        title="階と部屋の管理"
        back={{ href: "/places", label: "収納場所" }}
        description="階と部屋の追加・名前の変更・削除ができます。"
        art={<SteelShelf className="h-[100px] w-auto sm:h-[140px]" />}
        actions={
          <Button variant="primary" onClick={() => setAdding({ kind: "floor" })} className="min-h-11">
            <PlusIcon size={18} />
            階を追加
          </Button>
        }
      />

      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      {status === "loading" && <Loading />}
      {status === "error" && <LoadError />}

      {status === "ready" && data.floors.length === 0 && (
        <Notice kind="info">
          まず「1階」「2階」などの階を追加してください。そのあと、階の中に部屋を追加します。
        </Notice>
      )}

      {status === "ready" &&
        data.floors.map((floor) => {
          const rooms = data.rooms.filter((r) => r.floorId === floor.id);
          return (
            <Card key={floor.id} className="flex flex-col gap-3 border-white bg-[#eaf7f3] shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="min-w-0 flex-1 break-words text-xl font-bold">{floor.name}</h2>
                <RowActions
                  label={floor.name}
                  busy={busy}
                  onRename={() => setRenaming({ kind: "floor", id: floor.id, name: floor.name })}
                  onDelete={() => setDeleting({ kind: "floor", id: floor.id, name: floor.name })}
                />
              </div>
              {rooms.length === 0 ? (
                <p className="text-sm text-muted">部屋がまだありません。</p>
              ) : (
                <ul className="flex flex-col divide-y divide-line rounded-xl border border-brand-line bg-white">
                  {rooms.map((room) => {
                    const storageCount = data.storages.filter((s) => s.roomId === room.id).length;
                    return (
                      <li key={room.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-line bg-brand-softer text-brand-strong">
                          <RoomIcon name={room.name} size={22} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words font-medium text-ink">{room.name}</p>
                          <p className="text-[13px] text-muted">収納場所 {storageCount}件</p>
                        </div>
                        <RowActions
                          label={room.name}
                          busy={busy}
                          onRename={() => setRenaming({ kind: "room", id: room.id, name: room.name })}
                          onDelete={() => setDeleting({ kind: "room", id: room.id, name: room.name })}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
              <Button
                variant="ghost"
                className="self-start"
                onClick={() => setAdding({ kind: "room", floorId: floor.id, floorName: floor.name })}
              >
                <PlusIcon size={18} />
                {floor.name}に部屋を追加
              </Button>
            </Card>
          );
        })}

      {adding && (
        <NameDialog
          title={adding.kind === "floor" ? "階を追加" : `${adding.floorName}に部屋を追加`}
          initial=""
          placeholder={adding.kind === "floor" ? "例：1階、2階、地下" : "例：リビング、書斎、納戸"}
          submitLabel="追加する"
          onClose={() => setAdding(null)}
          onSubmit={async (name) => {
            if (adding.kind === "floor") await repo.addFloor(name);
            else await repo.addRoom(adding.floorId, name);
            await refresh();
            setMessage({ kind: "success", text: `「${name.trim()}」を追加しました。` });
            setAdding(null);
          }}
        />
      )}

      {renaming && (
        <NameDialog
          title="名前を変更"
          initial={renaming.name}
          submitLabel="変更する"
          onClose={() => setRenaming(null)}
          onSubmit={async (name) => {
            if (renaming.kind === "floor") await repo.renameFloor(renaming.id, name);
            else await repo.renameRoom(renaming.id, name);
            await refresh();
            setMessage({ kind: "success", text: "名前を変更しました。関連するすべてのものに反映されます。" });
            setRenaming(null);
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="削除の確認"
        danger
        busy={busy}
        confirmLabel="削除する"
        message={
          <>
            「<strong className="font-medium text-ink">{deleting?.name}</strong>」を削除します。
            {deleting?.kind === "floor" ? "部屋がある階は削除できません。" : "収納場所がある部屋は削除できません。"}
          </>
        }
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const target = deleting;
          await act(
            () => (target.kind === "floor" ? repo.deleteFloor(target.id) : repo.deleteRoom(target.id)),
            `「${target.name}」を削除しました。`,
          );
          setDeleting(null);
        }}
      />
    </div>
  );
}

function RowActions({
  label,
  busy,
  onRename,
  onDelete,
}: {
  label: string;
  busy: boolean;
  onRename: () => void;
  onDelete: () => void;
}) {
  const iconBtn =
    "flex h-11 w-11 items-center justify-center rounded-lg border border-brand-line text-brand-strong hover:bg-brand-soft disabled:border-line disabled:text-[#b7c2ca]";
  return (
    <div className="flex shrink-0 gap-1.5">
      <button type="button" className={iconBtn} onClick={onRename} disabled={busy} aria-label={`${label}の名前を変更`}>
        <EditIcon size={18} />
      </button>
      <button
        type="button"
        className={`${iconBtn} text-danger! border-danger-line! hover:bg-danger-soft!`}
        onClick={onDelete}
        disabled={busy}
        aria-label={`${label}を削除`}
      >
        <TrashIcon size={18} />
      </button>
    </div>
  );
}

function NameDialog({
  title,
  initial,
  placeholder,
  submitLabel,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: string;
  placeholder?: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(name);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            やめる
          </Button>
          <Button variant="primary" type="submit" form="name-form" disabled={busy}>
            {busy ? "保存中…" : submitLabel}
          </Button>
        </>
      }
    >
      <form id="name-form" onSubmit={submit} noValidate>
        <Field label="名前" required error={error}>
          {(p) => (
            <TextInput
              {...p}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={placeholder}
              maxLength={60}
              autoFocus
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}

/** ページを離れたら入力内容を捨て、次に開いたときは空欄から始める */
export default function StructurePage() {
  return (
    <FreshOnVisit>
      <StructurePageContent />
    </FreshOnVisit>
  );
}
