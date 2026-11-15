// データベースの行（snake_case）とアプリの型（camelCase）の変換

import type { Category, Floor, Item, ItemStatus, Room, Storage, WordGroup } from "../types";

export interface FloorRow {
  id: string;
  household_id: string;
  name: string;
  name_key: string;
  sort_order: number;
  demo_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoomRow extends FloorRow {
  floor_id: string;
}

export interface StorageRow {
  id: string;
  household_id: string;
  room_id: string;
  name: string;
  name_key: string;
  photo_path: string | null;
  demo_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemRow {
  id: string;
  household_id: string;
  storage_id: string;
  name: string;
  category: Category;
  detail: string;
  memo: string;
  photo_path: string | null;
  status: ItemStatus;
  last_checked_at: string | null;
  demo_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface WordGroupRow {
  id: string;
  household_id: string;
  words: string[];
  created_at: string;
  updated_at: string;
}

/** 日時をアプリ内の形式（ISO・UTC）にそろえ、並べ替えの比較を正しくする */
export function iso(value: string): string;
export function iso(value: string | null): string | null;
export function iso(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

const demo = (key: string | null) => (key ? { demoKey: key } : {});

export const toFloor = (r: FloorRow): Floor => ({
  id: r.id,
  name: r.name,
  order: r.sort_order,
  ...demo(r.demo_key),
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});

export const toRoom = (r: RoomRow): Room => ({ ...toFloor(r), floorId: r.floor_id });

export const toStorage = (r: StorageRow): Storage => ({
  id: r.id,
  roomId: r.room_id,
  name: r.name,
  photoId: r.photo_path,
  ...demo(r.demo_key),
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});

export const toItem = (r: ItemRow): Item => ({
  id: r.id,
  name: r.name,
  category: r.category,
  storageId: r.storage_id,
  detail: r.detail,
  memo: r.memo,
  photoId: r.photo_path,
  status: r.status,
  lastCheckedAt: iso(r.last_checked_at),
  ...demo(r.demo_key),
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});

export const toWordGroup = (r: WordGroupRow): WordGroup => ({
  id: r.id,
  words: r.words,
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});
