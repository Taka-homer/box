// 写真の検証・縮小・圧縮（ブラウザ内で処理し、外部には送信しない）

import { AppError } from "./types";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_INPUT_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_EDGE = 1600;
export const IMAGE_HELP_TEXT = "JPEG・PNG・WebP形式、20MBまで。保存時に自動で縮小します。";

export function validateImageFile(file: { type: string; size: number }): void {
  if (!file.type.startsWith("image/")) {
    throw new AppError("画像ファイルを選んでください。");
  }
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new AppError("この形式の画像には対応していません。JPEG・PNG・WebPの画像を選んでください。");
  }
  if (file.size > MAX_IMAGE_INPUT_BYTES) {
    throw new AppError("画像が大きすぎます。20MB以下の画像を選んでください。");
  }
  if (file.size === 0) {
    throw new AppError("画像ファイルが空です。別の画像を選んでください。");
  }
}

export function fitSize(width: number, height: number, maxEdge = MAX_IMAGE_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
    } catch {
      // 下の方法で再試行する
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new AppError("画像を読み込めませんでした。ファイルが壊れている可能性があります。");
  }
}

/** 長辺 1600px 以内に縮小し、JPEG に圧縮する */
export async function compressImage(file: File): Promise<Blob> {
  validateImageFile(file);
  const { source, width, height, release } = await decode(file);
  try {
    if (!width || !height) throw new AppError("画像を読み込めませんでした。ファイルが壊れている可能性があります。");
    const size = fitSize(width, height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new AppError("画像を処理できませんでした。");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(source, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) throw new AppError("画像を処理できませんでした。");
    return blob;
  } finally {
    release();
  }
}
