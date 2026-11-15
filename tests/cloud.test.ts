import { describe, expect, it } from "vitest";
import { toAppError } from "@/lib/cloud/errors";
import { formatInviteCode, inviteLink, normalizeInviteCode, validateDisplayName } from "@/lib/cloud/household";
import { iso, toItem, toRoom } from "@/lib/cloud/mappers";
import { buildReplacePayload } from "@/lib/cloud/restore";
import { addDemoData } from "@/lib/demo";
import { AppError } from "@/lib/types";
import { freshRepo, pngBlob } from "./helpers";

describe("データの変換", () => {
  it("データベースの行をアプリの形に変換し、日時をそろえる", () => {
    const room = toRoom({
      id: "r", household_id: "h", floor_id: "f", name: "書斎", name_key: "書斎", sort_order: 2, demo_key: null,
      created_at: "2026-11-15T09:00:00+09:00", updated_at: "2026-11-15T00:00:00.5+00:00",
    });
    expect(room).toEqual({
      id: "r", floorId: "f", name: "書斎", order: 2,
      createdAt: "2026-11-15T00:00:00.000Z", updatedAt: "2026-11-15T00:00:00.500Z",
    });
    const item = toItem({
      id: "i", household_id: "h", storage_id: "s", name: "保証書", category: "書類", detail: "", memo: "",
      photo_path: "h/p.jpg", status: "missing", last_checked_at: null, demo_key: "demo-x",
      created_at: "2026-11-15T00:00:00Z", updated_at: "2026-11-15T00:00:00Z",
    });
    expect(item.photoId).toBe("h/p.jpg");
    expect(item.lastCheckedAt).toBeNull();
    expect(item.demoKey).toBe("demo-x");
    expect(iso(null)).toBeNull();
  });
});

describe("エラーの表示", () => {
  it("データベースのエラーを日本語の案内に変える", () => {
    expect(toAppError({ code: "23505", message: "dup" }, { duplicate: "重複です" }).message).toBe("重複です");
    expect(toAppError({ code: "23503", message: "fk" }).code).toBe("has_children");
    expect(toAppError({ message: "invite_expired" }).message).toMatch(/期限切れ/);
    expect(toAppError({ message: "target_not_found" }).message).toMatch(/移動先/);
    expect(toAppError({ message: "invite_not_found" }).message).toMatch(/招待コードが正しくありません/);
    expect(toAppError(new TypeError("Failed to fetch")).message).toMatch(/通信できません/);
    const original = new AppError("そのまま");
    expect(toAppError(original)).toBe(original);
  });
});

describe("招待", () => {
  it("招待コードの入力ゆれを吸収し、見やすく表示する", () => {
    expect(normalizeInviteCode(" ab12-cd34 ef56 ")).toBe("AB12CD34EF56");
    expect(formatInviteCode("AB12CD34EF56")).toBe("AB12-CD34-EF56");
    expect(inviteLink("https://example.test", "ab12-cd34-ef56")).toBe("https://example.test/?invite=AB12CD34EF56");
  });

  it("表示名は必須で30文字まで", () => {
    expect(() => validateDisplayName("  ")).toThrow(/表示名/);
    expect(() => validateDisplayName("あ".repeat(31))).toThrow(/30文字/);
    expect(validateDisplayName(" ママ ")).toBe("ママ");
  });
});

describe("バックアップからの復元（家族共有）", () => {
  it("IDを振り直しても参照関係と写真が保たれる", async () => {
    const repo = freshRepo();
    await addDemoData(repo);
    const data = await repo.loadAll();
    const storage = data.storages[0];
    await repo.updateStorage(storage.id, { roomId: storage.roomId, name: storage.name }, { kind: "set", blob: pngBlob() });
    await repo.addWordGroup(["物置", "倉庫"]);
    const snap = await repo.exportSnapshot();

    let n = 0;
    const paths = new Map(snap.photos.map((p) => [p.id, `h/new-${p.id}.jpg`]));
    const payload = buildReplacePayload(snap, paths, () => `id-${++n}`);

    const ids = new Set([...payload.floors, ...payload.rooms, ...payload.storages, ...payload.items].map((r) => r.id));
    expect(ids.size).toBe(snap.floors.length + snap.rooms.length + snap.storages.length + snap.items.length);
    expect([...ids].every((id) => String(id).startsWith("id-"))).toBe(true);
    // 参照先がすべて新しいIDの中にある
    const floorIds = new Set(payload.floors.map((f) => f.id));
    const roomIds = new Set(payload.rooms.map((r) => r.id));
    const storageIds = new Set(payload.storages.map((s) => s.id));
    expect(payload.rooms.every((r) => floorIds.has(r.floor_id))).toBe(true);
    expect(payload.storages.every((s) => roomIds.has(s.room_id))).toBe(true);
    expect(payload.items.every((i) => storageIds.has(i.storage_id))).toBe(true);
    // 写真は新しい保存先に、名前の重複判定用の値も付く
    expect(payload.storages.filter((s) => s.photo_path).map((s) => s.photo_path)).toEqual([`h/new-${snap.photos[0].id}.jpg`]);
    expect(payload.floors.every((f) => typeof f.name_key === "string")).toBe(true);
    expect(payload.words).toHaveLength(1);
  });
});
