// データ型の定義。階・部屋は収納場所の参照からたどり、ものには収納場所IDだけを持たせる。

export const CATEGORIES = [
  "未分類",
  "書類",
  "工具",
  "季節用品",
  "家電・付属品",
  "日用品",
  "その他",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const DEFAULT_CATEGORY: Category = "未分類";

export type ItemStatus = "normal" | "missing";

export interface Floor {
  id: string;
  name: string;
  order: number;
  /** 見本データの場合のみ設定される識別子 */
  demoKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  floorId: string;
  name: string;
  order: number;
  demoKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Storage {
  id: string;
  roomId: string;
  name: string;
  /** 収納場所の写真。その場所にあるすべてのもので共用する */
  photoId: string | null;
  demoKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  name: string;
  category: Category;
  storageId: string;
  /** 詳しい位置（任意） */
  detail: string;
  memo: string;
  /** ものの写真 */
  photoId: string | null;
  status: ItemStatus;
  /** 最終確認日時。未確認の場合は null */
  lastCheckedAt: string | null;
  demoKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoRecord {
  id: string;
  type: string;
  data: ArrayBuffer;
  createdAt: string;
}

/** マイ辞書：同じ意味として扱う言葉の組（例：ボイラー室・機械室） */
export interface WordGroup {
  id: string;
  words: string[];
  createdAt: string;
  updatedAt: string;
}

/** 写真以外の全データ */
export interface AppData {
  floors: Floor[];
  rooms: Room[];
  storages: Storage[];
  items: Item[];
  words: WordGroup[];
}

/** 写真を含む全データ（バックアップ・復元用） */
export interface Snapshot extends AppData {
  photos: PhotoRecord[];
}

export type PhotoChange =
  | { kind: "keep" }
  | { kind: "remove" }
  | { kind: "set"; blob: Blob };

export interface ItemInput {
  name: string;
  category: Category;
  storageId: string;
  detail: string;
  memo: string;
}

export interface StorageInput {
  roomId: string;
  name: string;
}

/** 画面にそのまま表示できる日本語メッセージを持つエラー */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "validation"
      | "duplicate"
      | "not_found"
      | "has_children"
      | "storage"
      | "backup" = "validation",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorMessage(e: unknown, fallback = "処理に失敗しました。もう一度お試しください。"): string {
  if (e instanceof AppError) return e.message;
  return fallback;
}
