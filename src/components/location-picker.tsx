"use client";

import { useState } from "react";
import { useData } from "./data-provider";
import { Modal } from "./dialog";
import { PlusIcon } from "./icons";
import { PhotoInput, PhotoView } from "./photo";
import { Button, Field, Notice, Select, TextInput } from "./ui";
import { errorMessage, type PhotoChange } from "@/lib/types";

export interface LocationValue {
  floorId: string;
  roomId: string;
  storageId: string;
}

export const EMPTY_LOCATION: LocationValue = { floorId: "", roomId: "", storageId: "" };

export interface LocationErrors {
  floorId?: string;
  roomId?: string;
  storageId?: string;
}

type AddKind = "floor" | "room" | "storage";

const ADD_TITLE: Record<AddKind, string> = {
  floor: "階を追加",
  room: "部屋を追加",
  storage: "収納場所を追加",
};

/** 階 → 部屋 → 収納場所 を順に選ぶ。未登録ならその場で追加できる */
export function LocationPicker({
  value,
  onChange,
  errors = {},
  allowAdd = true,
  excludeStorageId,
  showStoragePhoto = true,
  labels = { floor: "階", room: "部屋", storage: "収納場所" },
}: {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  errors?: LocationErrors;
  allowAdd?: boolean;
  excludeStorageId?: string;
  showStoragePhoto?: boolean;
  labels?: { floor: string; room: string; storage: string };
}) {
  const { data } = useData();
  const [adding, setAdding] = useState<AddKind | null>(null);

  const rooms = data.rooms.filter((r) => r.floorId === value.floorId);
  const storages = data.storages.filter((s) => s.roomId === value.roomId && s.id !== excludeStorageId);
  const selectedStorage = data.storages.find((s) => s.id === value.storageId) ?? null;

  function setFloor(floorId: string) {
    // 上位を変えたら、合わなくなった下位の選択を解除する
    const roomStillValid = data.rooms.some((r) => r.id === value.roomId && r.floorId === floorId);
    onChange({
      floorId,
      roomId: roomStillValid ? value.roomId : "",
      storageId: roomStillValid ? value.storageId : "",
    });
  }

  function setRoom(roomId: string) {
    const storageStillValid = data.storages.some((s) => s.id === value.storageId && s.roomId === roomId);
    onChange({ ...value, roomId, storageId: storageStillValid ? value.storageId : "" });
  }

  const addButton = (kind: AddKind, disabled = false) =>
    allowAdd ? (
      <button
        type="button"
        onClick={() => setAdding(kind)}
        disabled={disabled}
        className="inline-flex min-h-11 items-center gap-1 self-start rounded-lg px-1 text-sm text-brand-strong hover:underline disabled:text-muted disabled:no-underline"
      >
        <PlusIcon size={16} />
        {ADD_TITLE[kind]}
      </button>
    ) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Field label={labels.floor} required error={errors.floorId}>
          {(p) => (
            <Select {...p} value={value.floorId} onChange={(e) => setFloor(e.target.value)}>
              <option value="">{data.floors.length ? "選んでください" : "まだ登録がありません"}</option>
              {data.floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {addButton("floor")}
      </div>

      <div className="flex flex-col gap-1">
        <Field label={labels.room} required error={errors.roomId}>
          {(p) => (
            <Select {...p} value={value.roomId} onChange={(e) => setRoom(e.target.value)} disabled={!value.floorId}>
              <option value="">
                {!value.floorId ? "先に階を選んでください" : rooms.length ? "選んでください" : "この階に部屋がありません"}
              </option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {addButton("room", !value.floorId)}
      </div>

      <div className="flex flex-col gap-1">
        <Field label={labels.storage} required error={errors.storageId}>
          {(p) => (
            <Select
              {...p}
              value={value.storageId}
              onChange={(e) => onChange({ ...value, storageId: e.target.value })}
              disabled={!value.roomId}
            >
              <option value="">
                {!value.roomId
                  ? "先に部屋を選んでください"
                  : storages.length
                    ? "選んでください"
                    : "この部屋に収納場所がありません"}
              </option>
              {storages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {addButton("storage", !value.roomId)}
      </div>

      {showStoragePhoto && selectedStorage && (
        <div className="rounded-xl border border-brand-line bg-brand-softer p-3">
          <p className="mb-2 text-[13px] text-muted">「{selectedStorage.name}」の写真</p>
          {selectedStorage.photoId ? (
            <PhotoView
              photoId={selectedStorage.photoId}
              alt={`${selectedStorage.name}の写真`}
              kind="storage"
              className="aspect-[4/3] w-full max-w-sm rounded-lg border border-brand-line"
            />
          ) : (
            <p className="text-[13px] text-muted">収納場所の写真はまだありません。「収納場所」から追加できます。</p>
          )}
        </div>
      )}

      {adding && (
        <AddPlaceModal
          kind={adding}
          parentId={adding === "room" ? value.floorId : adding === "storage" ? value.roomId : ""}
          onClose={() => setAdding(null)}
          onAdded={(id) => {
            if (adding === "floor") onChange({ floorId: id, roomId: "", storageId: "" });
            if (adding === "room") onChange({ ...value, roomId: id, storageId: "" });
            if (adding === "storage") onChange({ ...value, storageId: id });
            setAdding(null);
          }}
        />
      )}
    </div>
  );
}

function AddPlaceModal({
  kind,
  parentId,
  onClose,
  onAdded,
}: {
  kind: AddKind;
  parentId: string;
  onClose: () => void;
  onAdded: (id: string) => void;
}) {
  const { repo, refresh, data } = useData();
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<PhotoChange>({ kind: "keep" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parentName =
    kind === "room"
      ? data.floors.find((f) => f.id === parentId)?.name
      : kind === "storage"
        ? data.rooms.find((r) => r.id === parentId)?.name
        : undefined;

  const placeholder = { floor: "例：1階、2階、地下", room: "例：リビング、書斎、納戸", storage: "例：本棚、押し入れ上段" }[kind];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // ポータル越しに親のフォームへ送信が伝わらないようにする
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      let id: string;
      if (kind === "floor") id = (await repo.addFloor(name)).id;
      else if (kind === "room") id = (await repo.addRoom(parentId, name)).id;
      else id = (await repo.addStorage({ roomId: parentId, name }, photo)).id;
      await refresh();
      onAdded(id);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  const formId = `add-${kind}-form`;
  return (
    <Modal
      open
      onClose={onClose}
      title={ADD_TITLE[kind]}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            やめる
          </Button>
          <Button variant="primary" type="submit" form={formId} disabled={busy}>
            {busy ? "追加中…" : "追加する"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {parentName && <p className="text-sm text-muted">追加先：{parentName}</p>}
        <Field label="名前" required error={error}>
          {(p) => (
            <TextInput
              {...p}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={placeholder}
              autoFocus
              maxLength={60}
            />
          )}
        </Field>
        {kind === "storage" && (
          <PhotoInput label="収納場所の写真" currentPhotoId={null} change={photo} onChange={setPhoto} kind="storage" />
        )}
        <Notice kind="info">入力中の内容はそのまま残ります。</Notice>
      </form>
    </Modal>
  );
}
