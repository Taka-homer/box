// 写真を含むバックアップの書き出し・読み込み。形式と参照関係を検証する。

import { z } from "zod";
import { AppError, CATEGORIES, type Snapshot } from "./types";

export const BACKUP_FORMAT = "wagaya-shuno-backup";
/** 2: マイ辞書を追加。1 の形式も読み込める */
export const BACKUP_VERSION = 2;
export const MAX_BACKUP_BYTES = 300 * 1024 * 1024;

const iso = z.string().min(1);
const demoKey = z.string().optional();

const floorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number(),
  demoKey,
  createdAt: iso,
  updatedAt: iso,
});
const roomSchema = floorSchema.extend({ floorId: z.string().min(1) });
const storageSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1),
  name: z.string().min(1),
  photoId: z.string().nullable(),
  demoKey,
  createdAt: iso,
  updatedAt: iso,
});
const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(CATEGORIES),
  storageId: z.string().min(1),
  detail: z.string(),
  memo: z.string(),
  photoId: z.string().nullable(),
  status: z.enum(["normal", "missing"]),
  lastCheckedAt: z.string().nullable(),
  demoKey,
  createdAt: iso,
  updatedAt: iso,
});
const photoSchema = z.object({
  id: z.string().min(1),
  type: z.string().regex(/^image\//),
  data: z.string(),
  createdAt: iso,
});

const wordGroupSchema = z.object({
  id: z.string().min(1),
  words: z.array(z.string().min(1)).min(2),
  createdAt: iso,
  updatedAt: iso,
});

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int(),
  exportedAt: z.string(),
  data: z.object({
    floors: z.array(floorSchema),
    rooms: z.array(roomSchema),
    storages: z.array(storageSchema),
    items: z.array(itemSchema),
    photos: z.array(photoSchema),
    words: z.array(wordGroupSchema).optional(),
  }),
});

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function fromBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function serializeBackup(snapshot: Snapshot, exportedAt = new Date()): string {
  return JSON.stringify({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    data: {
      floors: snapshot.floors,
      rooms: snapshot.rooms,
      storages: snapshot.storages,
      items: snapshot.items,
      photos: snapshot.photos.map((p) => ({ id: p.id, type: p.type, createdAt: p.createdAt, data: toBase64(p.data) })),
      words: snapshot.words,
    },
  });
}

export interface BackupSummary {
  exportedAt: string;
  floors: number;
  rooms: number;
  storages: number;
  items: number;
  photos: number;
  words: number;
}

function assertUniqueIds(list: { id: string }[], label: string) {
  const seen = new Set<string>();
  for (const { id } of list) {
    if (seen.has(id)) throw new AppError(`バックアップ内の${label}に重複があります。`, "backup");
    seen.add(id);
  }
}

/** JSON文字列を検証してスナップショットに変換する。問題があれば AppError を投げる */
export function parseBackup(text: string): { snapshot: Snapshot; summary: BackupSummary } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new AppError("バックアップファイルを読み込めませんでした。ファイルが壊れているか、形式が違います。", "backup");
  }
  if (typeof raw !== "object" || raw === null || (raw as { format?: unknown }).format !== BACKUP_FORMAT) {
    throw new AppError("「わが家の収納」のバックアップファイルではありません。", "backup");
  }
  const version = (raw as { version?: unknown }).version;
  if (typeof version === "number" && version > BACKUP_VERSION) {
    throw new AppError("新しい版のアプリで作成されたバックアップのため、読み込めません。", "backup");
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success || parsed.data.version < 1) {
    throw new AppError("バックアップの内容に不足や誤りがあるため、読み込めません。", "backup");
  }
  const d = parsed.data.data;

  assertUniqueIds(d.floors, "階");
  assertUniqueIds(d.rooms, "部屋");
  assertUniqueIds(d.storages, "収納場所");
  assertUniqueIds(d.items, "もの");
  assertUniqueIds(d.photos, "写真");
  const words = d.words ?? [];
  assertUniqueIds(words, "マイ辞書");

  const floorIds = new Set(d.floors.map((f) => f.id));
  const roomIds = new Set(d.rooms.map((r) => r.id));
  const storageIds = new Set(d.storages.map((s) => s.id));
  const photoIds = new Set(d.photos.map((p) => p.id));
  const broken = () => new AppError("バックアップ内の場所のつながりに誤りがあるため、読み込めません。", "backup");

  if (d.rooms.some((r) => !floorIds.has(r.floorId))) throw broken();
  if (d.storages.some((s) => !roomIds.has(s.roomId))) throw broken();
  if (d.items.some((i) => !storageIds.has(i.storageId))) throw broken();
  const usedPhotos = [...d.storages, ...d.items].map((x) => x.photoId).filter((x): x is string => Boolean(x));
  if (usedPhotos.some((id) => !photoIds.has(id))) {
    throw new AppError("バックアップ内の写真が不足しているため、読み込めません。", "backup");
  }

  let photos;
  try {
    photos = d.photos.map((p) => ({ id: p.id, type: p.type, createdAt: p.createdAt, data: fromBase64(p.data) }));
  } catch {
    throw new AppError("バックアップ内の写真データが壊れているため、読み込めません。", "backup");
  }

  const snapshot: Snapshot = {
    floors: d.floors,
    rooms: d.rooms,
    storages: d.storages,
    items: d.items,
    photos,
    words,
  };
  return {
    snapshot,
    summary: {
      exportedAt: parsed.data.exportedAt,
      floors: d.floors.length,
      rooms: d.rooms.length,
      storages: d.storages.length,
      items: d.items.length,
      photos: d.photos.length,
      words: words.length,
    },
  };
}

export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `wagaya-shuno-backup-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}.json`;
}
