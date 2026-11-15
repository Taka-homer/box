"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePhotoUrl } from "./data-provider";
import { BoxIcon, ImageIcon } from "./icons";
import { Button } from "./ui";
import { compressImage, IMAGE_HELP_TEXT } from "@/lib/image";
import { errorMessage, type PhotoChange } from "@/lib/types";

/** 写真またはプレースホルダーを表示する */
export function PhotoView({
  photoId,
  alt,
  kind = "item",
  className = "",
}: {
  photoId: string | null | undefined;
  alt: string;
  kind?: "item" | "storage";
  className?: string;
}) {
  const url = usePhotoUrl(photoId);
  return <PhotoFrame url={url} alt={alt} kind={kind} className={className} />;
}

function PhotoFrame({
  url,
  alt,
  kind,
  className,
}: {
  url: string | null;
  alt: string;
  kind: "item" | "storage";
  className: string;
}) {
  if (url) {
    // 端末内の写真（blob:）を表示するため next/image は使わない
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} className={`bg-brand-softer object-cover ${className}`} />;
  }
  const Icon = kind === "storage" ? BoxIcon : ImageIcon;
  return (
    <div
      role="img"
      aria-label={`${alt}（写真なし）`}
      className={`flex items-center justify-center bg-brand-softer text-brand ${className}`}
    >
      <Icon size={28} />
    </div>
  );
}

/** 写真の追加・変更・削除とプレビュー */
export function PhotoInput({
  label,
  currentPhotoId,
  change,
  onChange,
  kind = "item",
}: {
  label: string;
  currentPhotoId: string | null;
  change: PhotoChange;
  onChange: (change: PhotoChange) => void;
  kind?: "item" | "storage";
}) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const savedUrl = usePhotoUrl(change.kind === "keep" ? currentPhotoId : null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const pendingBlob = change.kind === "set" ? change.blob : null;
  useEffect(() => {
    if (!pendingBlob) return;
    const url = URL.createObjectURL(pendingBlob);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingBlob]);

  const shownUrl = change.kind === "set" ? previewUrl : change.kind === "keep" ? savedUrl : null;
  const hasPhoto = change.kind === "set" || (change.kind === "keep" && Boolean(currentPhotoId));

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const blob = await compressImage(file);
      onChange({ kind: "set", blob });
    } catch (e) {
      setError(errorMessage(e, "画像を読み込めませんでした。別の画像を選んでください。"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[15px] font-medium text-ink" id={`${inputId}-label`}>
        {label}
        <span className="ml-2 text-xs font-normal text-muted">任意</span>
      </span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <PhotoFrame
          url={shownUrl}
          alt={label}
          kind={kind}
          className="aspect-[4/3] w-full rounded-xl border border-brand-line sm:w-48"
        />
        <div className="flex flex-col gap-2">
          {change.kind === "set" && <p className="text-[13px] text-brand-strong">保存すると、この写真に変わります。</p>}
          {change.kind === "remove" && <p className="text-[13px] text-warn">保存すると、写真を削除します。</p>}
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-labelledby={`${inputId}-label`}
              aria-describedby={`${inputId}-help`}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={busy}>
              <ImageIcon size={18} />
              {busy ? "読み込み中…" : hasPhoto ? "写真を変更" : "写真を追加"}
            </Button>
            {hasPhoto && (
              <Button variant="ghost" onClick={() => onChange({ kind: currentPhotoId ? "remove" : "keep" })} disabled={busy}>
                写真を削除
              </Button>
            )}
            {change.kind !== "keep" && currentPhotoId && (
              <Button variant="ghost" onClick={() => onChange({ kind: "keep" })} disabled={busy}>
                元に戻す
              </Button>
            )}
          </div>
          <p id={`${inputId}-help`} className="text-[13px] text-muted">
            {IMAGE_HELP_TEXT}
          </p>
          {error && (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
