// 保存処理の窓口。画面はこのインターフェースだけを使い、保存先（IndexedDB／将来のサーバー）を意識しない。

import type {
  AppData,
  Floor,
  Item,
  ItemInput,
  PhotoChange,
  Room,
  Snapshot,
  Storage,
  StorageInput,
  WordGroup,
} from "./types";

export interface CreateOptions {
  /** 見本データとして作成する場合の識別子 */
  demoKey?: string;
}

export interface Repository {
  loadAll(): Promise<AppData>;
  getPhoto(photoId: string): Promise<Blob | null>;

  addFloor(name: string, options?: CreateOptions): Promise<Floor>;
  renameFloor(id: string, name: string): Promise<void>;
  reorderFloors(orderedIds: string[]): Promise<void>;
  deleteFloor(id: string): Promise<void>;

  addRoom(floorId: string, name: string, options?: CreateOptions): Promise<Room>;
  renameRoom(id: string, name: string): Promise<void>;
  reorderRooms(floorId: string, orderedIds: string[]): Promise<void>;
  deleteRoom(id: string): Promise<void>;

  addStorage(input: StorageInput, photo?: PhotoChange, options?: CreateOptions): Promise<Storage>;
  updateStorage(id: string, input: StorageInput, photo: PhotoChange): Promise<void>;
  /** 登録物がある場合は失敗する */
  deleteStorage(id: string): Promise<void>;
  /** 登録物をすべて移動先へ移してから削除する */
  moveItemsAndDeleteStorage(id: string, targetStorageId: string): Promise<number>;

  addItem(input: ItemInput, photo?: PhotoChange, options?: CreateOptions): Promise<Item>;
  updateItem(id: string, input: ItemInput, photo: PhotoChange): Promise<void>;
  deleteItem(id: string): Promise<void>;
  markFound(id: string): Promise<void>;
  markMissing(id: string): Promise<void>;
  moveItem(id: string, storageId: string, detail: string): Promise<void>;
  /**
   * 追加したカテゴリの名前を変更する（そのカテゴリのものすべてを変更）。変更した件数を返す。
   * 削除は「未分類」への変更として行う。最初から用意しているカテゴリは変更できない。
   */
  renameCategory(from: string, to: string): Promise<number>;

  /** マイ辞書。入力された言葉を整えて保存する（2語以上が必要） */
  addWordGroup(words: string[]): Promise<WordGroup>;
  updateWordGroup(id: string, words: string[]): Promise<void>;
  deleteWordGroup(id: string): Promise<void>;

  exportSnapshot(): Promise<Snapshot>;
  /** 現在のデータをすべて置き換える */
  replaceAll(snapshot: Snapshot): Promise<void>;
  /** 見本データだけを削除する（使用中の階・部屋・収納場所は残す） */
  removeDemoData(): Promise<void>;
}
