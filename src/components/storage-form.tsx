"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useData } from "./data-provider";
import { BoxIcon } from "./icons";
import { PhotoInput } from "./photo";
import { Button, Card, CardTitle, Field, LinkButton, Notice, Select, TextInput } from "./ui";
import { errorMessage, type PhotoChange, type Storage } from "@/lib/types";

/** 収納場所の追加・編集フォーム */
export function StorageForm({ storage, initialRoomId }: { storage?: Storage; initialRoomId?: string | null }) {
  const { data, repo, refresh } = useData();
  const router = useRouter();
  const startRoom = data.rooms.find((r) => r.id === (storage?.roomId ?? initialRoomId));
  const [floorId, setFloorId] = useState(startRoom?.floorId ?? "");
  const [roomId, setRoomId] = useState(startRoom?.id ?? "");
  const [name, setName] = useState(storage?.name ?? "");
  const [photo, setPhoto] = useState<PhotoChange>({ kind: "keep" });
  const [errors, setErrors] = useState<{ floor?: string; room?: string; name?: string }>({});
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  const rooms = data.rooms.filter((r) => r.floorId === floorId);

  if (data.floors.length === 0) {
    return (
      <Notice kind="info">
        先に階と部屋を登録してください。
        <div className="mt-3">
          <LinkButton href="/places/structure" variant="primary">
            階と部屋を登録する
          </LinkButton>
        </div>
      </Notice>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    const next: typeof errors = {};
    if (!floorId) next.floor = "階を選んでください。";
    if (!roomId) next.room = "部屋を選んでください。";
    if (!name.trim()) next.name = "名前を入力してください。";
    setErrors(next);
    setResult(null);
    if (Object.keys(next).length) {
      setResult("入力内容を確認してください。");
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      let id = storage?.id;
      if (storage) await repo.updateStorage(storage.id, { roomId, name }, photo);
      else id = (await repo.addStorage({ roomId, name }, photo)).id;
      await refresh();
      router.push(`/places/${id}?saved=1`);
    } catch (err) {
      setResult(`保存できませんでした。${errorMessage(err, "もう一度お試しください。")}`);
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {result && <Notice kind="error">{result}</Notice>}
      <Card tone="soft" className="flex flex-col gap-5">
        <CardTitle icon={<BoxIcon size={18} />}>収納場所</CardTitle>
        <Field label="階" required error={errors.floor}>
          {(p) => (
            <Select
              {...p}
              value={floorId}
              onChange={(e) => {
                setFloorId(e.target.value);
                if (!data.rooms.some((r) => r.id === roomId && r.floorId === e.target.value)) setRoomId("");
              }}
            >
              <option value="">選んでください</option>
              {data.floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label="部屋"
          required
          error={errors.room}
          help={floorId && rooms.length === 0 ? "この階に部屋がありません。「階と部屋の管理」で追加してください。" : undefined}
        >
          {(p) => (
            <Select {...p} value={roomId} onChange={(e) => setRoomId(e.target.value)} disabled={!floorId}>
              <option value="">{floorId ? "選んでください" : "先に階を選んでください"}</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="収納場所の名前" required error={errors.name} help="例：机の右側の引き出し、押し入れ上段">
          {(p) => <TextInput {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />}
        </Field>
        <PhotoInput
          label="収納場所の写真"
          kind="storage"
          currentPhotoId={storage?.photoId ?? null}
          change={photo}
          onChange={setPhoto}
        />
        <p className="text-[13px] text-muted">収納場所の写真は、この場所にあるすべてのもので共用されます。</p>
      </Card>
      {storage && (
        <p className="text-[13px] text-muted">
          名前や部屋を変更すると、この場所にあるすべてのものに反映されます。
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={() => router.back()} disabled={busy}>
          やめる
        </Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "保存中…" : "保存する"}
        </Button>
      </div>
    </form>
  );
}
