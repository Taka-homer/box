// 見本データ。demoKey で実データと区別し、繰り返し追加しても重複しない。

import type { Repository } from "./repository";
import type { Category } from "./types";
import { sameName } from "./text";

interface DemoItem {
  key: string;
  name: string;
  category: Category;
  place: [floor: string, room: string, storage: string];
  detail?: string;
  memo?: string;
  /** public/ 以下の写真のパス */
  photo?: string;
}

/** 写真のパスから画像を読み込む。読めないときは null（写真なしで登録する） */
export type DemoPhotoLoader = (path: string) => Promise<Blob | null>;

/** ブラウザで public/ の画像を取得する */
export const fetchDemoPhoto: DemoPhotoLoader = async (path) => {
  try {
    const res = await fetch(path);
    return res.ok ? await res.blob() : null;
  } catch {
    return null;
  }
};

export const DEMO_ITEMS: DemoItem[] = [
  {
    key: "demo-item-aircon-warranty",
    name: "エアコンの保証書",
    category: "書類",
    place: ["2階", "書斎", "机の右側の引き出し"],
    detail: "一番下、青いファイルの中",
    memo: "リビングのエアコン用",
  },
  {
    key: "demo-item-aircon-manual",
    name: "エアコンの取扱説明書",
    category: "書類",
    place: ["2階", "書斎", "本棚"],
    photo: "/images/demo/manual.png",
  },
  {
    key: "demo-item-driver",
    name: "電動ドライバー",
    category: "工具",
    place: ["1階", "納戸", "工具箱"],
  },
  {
    key: "demo-item-xmas",
    name: "クリスマス飾り",
    category: "季節用品",
    place: ["2階", "納戸", "収納ボックス"],
  },
  {
    key: "demo-item-blanket",
    name: "ブランケット",
    category: "季節用品",
    place: ["2階", "納戸", "収納ボックス"],
    detail: "青いチェック柄",
    photo: "/images/demo/blanket.png",
  },
  {
    key: "demo-item-emergency-kit",
    name: "防災セット",
    category: "日用品",
    place: ["1階", "納戸", "棚の下段"],
    photo: "/images/demo/emergency-kit.png",
  },
  {
    key: "demo-item-rice-cooker",
    name: "炊飯器",
    category: "家電・付属品",
    place: ["1階", "キッチン", "食器棚の横"],
    photo: "/images/demo/rice-cooker.png",
  },
];

/**
 * 見本データを追加する。同じ名前の階・部屋・収納場所があればそれを使い、
 * 追加済みの見本のものは追加しない。追加した件数を返す。
 */
export async function addDemoData(repo: Repository, loadPhoto?: DemoPhotoLoader): Promise<number> {
  let added = 0;
  for (const demo of DEMO_ITEMS) {
    const data = await repo.loadAll();
    if (data.items.some((i) => i.demoKey === demo.key)) continue;

    const [floorName, roomName, storageName] = demo.place;
    const floor =
      data.floors.find((f) => sameName(f.name, floorName)) ??
      (await repo.addFloor(floorName, { demoKey: `demo-floor-${floorName}` }));
    const room =
      data.rooms.find((r) => r.floorId === floor.id && sameName(r.name, roomName)) ??
      (await repo.addRoom(floor.id, roomName, { demoKey: `demo-room-${floorName}-${roomName}` }));
    const storage =
      data.storages.find((s) => s.roomId === room.id && sameName(s.name, storageName)) ??
      (await repo.addStorage(
        { roomId: room.id, name: storageName },
        { kind: "keep" },
        { demoKey: `demo-storage-${floorName}-${roomName}-${storageName}` },
      ));

    const blob = demo.photo && loadPhoto ? await loadPhoto(demo.photo) : null;
    await repo.addItem(
      {
        name: demo.name,
        category: demo.category,
        storageId: storage.id,
        detail: demo.detail ?? "",
        memo: demo.memo ?? "",
      },
      blob ? { kind: "set", blob } : { kind: "keep" },
      { demoKey: demo.key },
    );
    added++;
  }
  return added;
}
