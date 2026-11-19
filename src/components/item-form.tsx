"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useData } from "./data-provider";
import { BoxIcon, InfoIcon, PinIcon } from "./icons";
import { EMPTY_LOCATION, LocationPicker, type LocationErrors, type LocationValue } from "./location-picker";
import { PhotoInput } from "./photo";
import { Button, Card, CardTitle, Field, Notice, Select, TextArea, TextInput } from "./ui";
import { categoryOptions, resolveCategory } from "@/lib/categories";
import { LIMITS } from "@/lib/idb-repository";
import { CATEGORY_MAX, DEFAULT_CATEGORY, errorMessage, type Category, type Item, type PhotoChange } from "@/lib/types";

interface FormState {
  name: string;
  category: Category;
  location: LocationValue;
  detail: string;
  memo: string;
}

interface FormErrors extends LocationErrors {
  name?: string;
  category?: string;
}

/** カテゴリの選択肢のうち「カテゴリを追加」を表す値 */
const ADD_CATEGORY = "__add_category__";

export function locationOfStorage(
  data: { rooms: { id: string; floorId: string }[]; storages: { id: string; roomId: string }[] },
  storageId: string | null | undefined,
): LocationValue {
  const storage = data.storages.find((s) => s.id === storageId);
  const room = storage ? data.rooms.find((r) => r.id === storage.roomId) : undefined;
  if (!storage || !room) return EMPTY_LOCATION;
  return { floorId: room.floorId, roomId: room.id, storageId: storage.id };
}

export function ItemForm({ item, initialStorageId }: { item?: Item; initialStorageId?: string | null }) {
  const { data, repo, refresh } = useData();
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const newCategoryRef = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);

  const [form, setForm] = useState<FormState>(() => ({
    name: item?.name ?? "",
    category: item?.category ?? DEFAULT_CATEGORY,
    location: locationOfStorage(data, item?.storageId ?? initialStorageId),
    detail: item?.detail ?? "",
    memo: item?.memo ?? "",
  }));
  const [photo, setPhoto] = useState<PhotoChange>({ kind: "keep" });
  const [photoKey, setPhotoKey] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  // 新しいカテゴリを入力中なら、その入力値（選択肢から選んでいるときは null）
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const addingCategory = newCategory !== null;
  const categories = categoryOptions(data.items, item?.category, form.category);

  // 「カテゴリを追加」を選んだら、名前の入力欄に移る
  useEffect(() => {
    if (addingCategory) newCategoryRef.current?.focus();
  }, [addingCategory]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = "名前を入力してください。";
    if (addingCategory && !newCategory.trim()) e.category = "新しいカテゴリ名を入力してください。";
    if (!form.location.floorId) e.floorId = "階を選んでください。";
    if (!form.location.roomId) e.roomId = "部屋を選んでください。";
    if (!form.location.storageId) e.storageId = "収納場所を選んでください。";
    return e;
  }

  async function save(continueNext: boolean) {
    // 二重送信を防止する
    if (submitting.current) return;
    setResult(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setResult({ kind: "error", message: "入力内容を確認してください。赤字の項目に不足があります。" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (e.name) nameRef.current?.focus({ preventScroll: true });
      else if (e.category) newCategoryRef.current?.focus({ preventScroll: true });
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const input = {
        name: form.name,
        category: addingCategory ? resolveCategory(newCategory, categories) : form.category,
        storageId: form.location.storageId,
        detail: form.detail,
        memo: form.memo,
      };
      if (item) {
        await repo.updateItem(item.id, input, photo);
        await refresh();
        router.push(`/items/${item.id}?saved=1`);
        return;
      }
      const created = await repo.addItem(input, photo);
      await refresh();
      if (continueNext) {
        // 収納場所の選択は引き継ぎ、もの固有の入力欄をクリアする
        setForm((f) => ({ ...f, name: "", category: DEFAULT_CATEGORY, detail: "", memo: "" }));
        setNewCategory(null);
        setPhoto({ kind: "keep" });
        setPhotoKey((k) => k + 1);
        setResult({ kind: "success", message: `「${created.name}」を保存しました。続けて同じ収納場所に登録できます。` });
        window.scrollTo({ top: 0, behavior: "smooth" });
        nameRef.current?.focus({ preventScroll: true });
      } else {
        router.push(`/items/${created.id}?saved=1`);
        return;
      }
    } catch (err) {
      setResult({ kind: "error", message: `保存できませんでした。${errorMessage(err, "もう一度お試しください。")}` });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save(false);
      }}
      className="flex flex-col gap-5"
    >
      {result && <Notice kind={result.kind}>{result.message}</Notice>}

      <Card tone="soft" className="flex flex-col gap-5">
        <CardTitle icon={<BoxIcon size={18} />}>もの・書類</CardTitle>
        <Field label="名前" required error={errors.name} help="例：エアコンの保証書、電動ドライバー">
          {(p) => (
            <TextInput
              {...p}
              ref={nameRef}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              maxLength={LIMITS.name}
              autoComplete="off"
            />
          )}
        </Field>
        <Field label="カテゴリ" required>
          {(p) => (
            <Select
              {...p}
              value={addingCategory ? ADD_CATEGORY : form.category}
              onChange={(e) => {
                const v = e.target.value;
                if (v === ADD_CATEGORY) {
                  setNewCategory("");
                  return;
                }
                setNewCategory(null);
                setErrors((er) => ({ ...er, category: undefined }));
                update("category", v as Category);
              }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value={ADD_CATEGORY}>＋ カテゴリを追加</option>
            </Select>
          )}
        </Field>
        {addingCategory && (
          <div className="flex flex-col gap-2 rounded-xl border border-brand-line bg-white/70 p-3">
            <Field
              label="新しいカテゴリ名"
              required
              error={errors.category}
              help={`${CATEGORY_MAX}文字まで。保存すると、次からはカテゴリの一覧から選べます。`}
            >
              {(p) => (
                <TextInput
                  {...p}
                  ref={newCategoryRef}
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  maxLength={CATEGORY_MAX}
                  autoComplete="off"
                  placeholder="例：アウトドア用品、子どもの作品"
                />
              )}
            </Field>
            <Button
              variant="ghost"
              className="min-h-11 self-start"
              onClick={() => {
                setNewCategory(null);
                setErrors((er) => ({ ...er, category: undefined }));
              }}
            >
              一覧から選ぶ
            </Button>
          </div>
        )}
      </Card>

      <Card tone="soft" className="flex flex-col gap-5">
        <CardTitle icon={<PinIcon size={18} />}>しまった場所</CardTitle>
        <LocationPicker
          value={form.location}
          onChange={(location) => {
            update("location", location);
            setErrors((e) => ({
              ...e,
              floorId: location.floorId ? undefined : e.floorId,
              roomId: location.roomId ? undefined : e.roomId,
              storageId: location.storageId ? undefined : e.storageId,
            }));
          }}
          errors={errors}
        />
        <Field label="詳しい位置" help="例：一番下の段、青いファイルの中">
          {(p) => (
            <TextInput
              {...p}
              value={form.detail}
              onChange={(e) => update("detail", e.target.value)}
              maxLength={LIMITS.detail}
              autoComplete="off"
            />
          )}
        </Field>
      </Card>

      <Card tone="soft" className="flex flex-col gap-5">
        <CardTitle icon={<InfoIcon size={18} />}>補足</CardTitle>
        <Field label="メモ" help="用途や特徴を書いておくと、名前を忘れても探しやすくなります。">
          {(p) => (
            <TextArea {...p} value={form.memo} onChange={(e) => update("memo", e.target.value)} maxLength={LIMITS.memo} />
          )}
        </Field>
        <PhotoInput
          key={photoKey}
          label="ものの写真"
          currentPhotoId={item?.photoId ?? null}
          change={photo}
          onChange={setPhoto}
        />
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={() => router.back()} disabled={busy}>
          やめる
        </Button>
        {!item && (
          <Button onClick={() => void save(true)} disabled={busy}>
            保存して続けて登録
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "保存中…" : "保存する"}
        </Button>
      </div>
    </form>
  );
}
