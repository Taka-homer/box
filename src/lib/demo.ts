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
}

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
];

/**
 * 見本データを追加する。同じ名前の階・部屋・収納場所があればそれを使い、
 * 追加済みの見本のものは追加しない。追加した件数を返す。
 */
export async function addDemoData(repo: Repository): Promise<number> {
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

    await repo.addItem(
      {
        name: demo.name,
        category: demo.category,
        storageId: storage.id,
        detail: demo.detail ?? "",
        memo: demo.memo ?? "",
      },
      { kind: "keep" },
      { demoKey: demo.key },
    );
    added++;
  }
  return added;
}
