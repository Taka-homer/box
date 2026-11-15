import { IndexedDbRepository } from "@/lib/idb-repository";

let counter = 0;

export function freshRepo() {
  counter += 1;
  return new IndexedDbRepository(`test-db-${Date.now()}-${counter}`);
}

export async function seedPlace(repo: IndexedDbRepository) {
  const floor = await repo.addFloor("2階");
  const room = await repo.addRoom(floor.id, "書斎");
  const storage = await repo.addStorage({ roomId: room.id, name: "本棚" });
  return { floor, room, storage };
}

export function pngBlob(bytes = [137, 80, 78, 71, 1, 2, 3]) {
  return new Blob([new Uint8Array(bytes)], { type: "image/png" });
}
