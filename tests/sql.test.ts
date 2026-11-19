// Supabase 用 SQL（supabase/migrations/0001_init.sql）を、組み込みの Postgres（PGlite）で検証する。
// Supabase の auth / storage は最小限の代用品を用意する。

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const migration = ["0001_init.sql", "0002_custom_categories.sql"]
  .map((f) => readFileSync(fileURLToPath(new URL(`../supabase/migrations/${f}`, import.meta.url)), "utf8"))
  .join("\n");

const STUBS = `
  create role authenticated nologin;
  create role anon nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated;
  grant execute on function auth.uid() to authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id serial primary key, bucket_id text, name text);
  create function storage.foldername(name text) returns text[] language sql immutable
    as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  alter table storage.objects enable row level security;
  grant usage on schema storage to authenticated;
  grant select, insert, delete on storage.objects to authenticated;
  grant usage, select on sequence storage.objects_id_seq to authenticated;
`;

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const C = "00000000-0000-4000-8000-00000000000c";

let db: PGlite;

/** 指定した人としてSQLを実行する（null は管理者権限） */
async function as<T = Record<string, unknown>>(user: string | null, sql: string, params: unknown[] = []) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ""]);
  if (user) await db.exec("set role authenticated");
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role");
  }
}

async function expectError(promise: Promise<unknown>, pattern: RegExp) {
  await expect(promise).rejects.toThrow(pattern);
}

let householdA: string;
let householdC: string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(STUBS);
  await db.exec(migration);
  // 2回実行しても壊れないこと
  await db.exec(migration);
  await db.query("insert into auth.users (id) values ($1), ($2), ($3)", [A, B, C]);

  expect(await as(A, "select public.can_create_household() as ok")).toEqual([{ ok: true }]);
  householdA = (await as<{ h: string }>(A, "select public.create_household('山田家', 'たろう') as h"))[0].h;
  // 既定では2つ目の家族は作れない（招待がないと使えない）
  expect(await as(C, "select public.can_create_household() as ok")).toEqual([{ ok: false }]);
  await expectError(as(C, "select public.create_household('別の家', 'じろう')"), /household_creation_closed/);
  // 複数の家族で使う設定にすれば作れる（家族どうしが見えないことの検証用）
  await as(null, "update public.app_settings set allow_new_households = true");
  householdC = (await as<{ h: string }>(C, "select public.create_household('別の家', 'じろう') as h"))[0].h;
  await as(null, "update public.app_settings set allow_new_households = false");
}, 60_000);

describe("家族の作成と招待", () => {
  it("作った人は管理者になり、2つ目の家族は作れない", async () => {
    const rows = await as(A, "select role, display_name from public.members");
    expect(rows).toEqual([{ role: "owner", display_name: "たろう" }]);
    await expectError(as(A, "select public.create_household('もう一つ', 'たろう')"), /already_member/);
  });

  it("招待コードで参加でき、メンバー以外は家族の情報を見られない", async () => {
    expect(await as(B, "select * from public.households")).toEqual([]);
    const [inv] = await as<{ code: string }>(A, "select * from public.create_invite($1)", [householdA]);
    expect(inv.code).toMatch(/^[0-9A-F]{12}$/);
    // 区切り文字や小文字が混ざっていても参加できる
    const pretty = `${inv.code.slice(0, 4)}-${inv.code.slice(4, 8)}-${inv.code.slice(8)}`.toLowerCase();
    const [{ h }] = await as<{ h: string }>(B, "select public.join_household($1, 'はなこ') as h", [pretty]);
    expect(h).toBe(householdA);
    const members = await as(B, "select display_name, role from public.members order by joined_at");
    expect(members).toEqual([
      { display_name: "たろう", role: "owner" },
      { display_name: "はなこ", role: "member" },
    ]);
  });

  it("他の家族のメンバーは、招待なしに参加・閲覧できない", async () => {
    await expectError(as(C, "select public.create_invite($1)", [householdA]), /forbidden/);
    expect(await as(C, "select * from public.members where household_id = $1", [householdA])).toEqual([]);
  });

  it("存在しない・取り消し済み・期限切れのコードでは参加できない", async () => {
    const D = "00000000-0000-4000-8000-00000000000d";
    await db.query("insert into auth.users (id) values ($1)", [D]);
    await expectError(as(D, "select public.join_household('ZZZZZZZZZZZZ', 'x')"), /invite_not_found/);

    const [inv] = await as<{ code: string }>(A, "select * from public.create_invite($1)", [householdA]);
    const [{ id }] = await as<{ id: string }>(A, "select id from public.invites where code = $1", [inv.code]);
    await as(A, "select public.revoke_invite($1)", [id]);
    await expectError(as(D, "select public.join_household($1, 'x')", [inv.code]), /invite_expired/);

    const [inv2] = await as<{ code: string }>(A, "select * from public.create_invite($1)", [householdA]);
    await as(null, "update public.invites set expires_at = now() - interval '1 minute' where code = $1", [inv2.code]);
    await expectError(as(D, "select public.join_household($1, 'x')", [inv2.code]), /invite_expired/);
  });

  it("メンバーは自分の役割を管理者に書き換えられない", async () => {
    await expectError(as(B, "update public.members set role = 'owner' where user_id = auth.uid()"), /permission denied/);
    await as(B, "update public.members set display_name = 'はな' where user_id = auth.uid()");
    const rows = await as(B, "select display_name, role from public.members where user_id = auth.uid()");
    expect(rows).toEqual([{ display_name: "はな", role: "member" }]);
  });
});

describe("家族のデータ", () => {
  let floor: string;
  let room: string;
  let storage: string;

  it("メンバーは登録でき、別の家族には見えない", async () => {
    [{ id: floor }] = await as<{ id: string }>(
      B,
      "insert into public.floors (household_id, name, name_key) values ($1, '2階', '2階') returning id",
      [householdA],
    );
    [{ id: room }] = await as<{ id: string }>(
      A,
      "insert into public.rooms (household_id, floor_id, name, name_key) values ($1, $2, '書斎', '書斎') returning id",
      [householdA, floor],
    );
    [{ id: storage }] = await as<{ id: string }>(
      A,
      "insert into public.storages (household_id, room_id, name, name_key) values ($1, $2, '本棚', '本棚') returning id",
      [householdA, room],
    );
    await as(B, "insert into public.items (household_id, storage_id, name, category) values ($1, $2, '保証書', '書類')", [
      householdA,
      storage,
    ]);
    expect(await as(A, "select name from public.items")).toEqual([{ name: "保証書" }]);
    expect(await as(C, "select name from public.items")).toEqual([]);
  });

  it("別の家族へは書き込めず、他の家族の収納場所も参照できない", async () => {
    await expectError(
      as(C, "insert into public.floors (household_id, name, name_key) values ($1, '侵入', '侵入')", [householdA]),
      /row-level security/,
    );
    // 自分の家族のIDで、他の家族の収納場所を指定しても登録できない
    await expectError(
      as(C, "insert into public.items (household_id, storage_id, name, category) values ($1, $2, 'x', '書類')", [
        householdC,
        storage,
      ]),
      /foreign key/,
    );
  });

  it("同じ階の部屋名の重複と、中身がある場所の削除を防ぐ", async () => {
    await expectError(
      as(A, "insert into public.rooms (household_id, floor_id, name, name_key) values ($1, $2, '書斎', '書斎')", [
        householdA,
        floor,
      ]),
      /duplicate key/,
    );
    await expectError(as(A, "delete from public.floors where id = $1", [floor]), /foreign key/);
    await expectError(as(A, "delete from public.storages where id = $1", [storage]), /foreign key/);
  });

  it("登録物を移動してから収納場所を削除できる", async () => {
    const [{ id: other }] = await as<{ id: string }>(
      A,
      "insert into public.storages (household_id, room_id, name, name_key) values ($1, $2, '引き出し', '引き出し') returning id",
      [householdA, room],
    );
    const [{ n }] = await as<{ n: number }>(A, "select public.move_items_and_delete_storage($1, $2) as n", [storage, other]);
    expect(n).toBe(1);
    expect(await as(A, "select storage_id from public.items")).toEqual([{ storage_id: other }]);
    storage = other;
    await expectError(as(C, "select public.move_items_and_delete_storage($1, $1)", [storage]), /not_found/);
  });

  it("復元で家族のデータを丸ごと置き換えられる", async () => {
    const f = "10000000-0000-4000-8000-000000000001";
    const r = "10000000-0000-4000-8000-000000000002";
    const s = "10000000-0000-4000-8000-000000000003";
    const t = "2026-01-01T00:00:00.000Z";
    const data = {
      floors: [{ id: f, name: "1階", name_key: "1階", sort_order: 0, demo_key: null, created_at: t, updated_at: t }],
      rooms: [{ id: r, floor_id: f, name: "納戸", name_key: "納戸", sort_order: 0, demo_key: null, created_at: t, updated_at: t }],
      storages: [{ id: s, room_id: r, name: "工具箱", name_key: "工具箱", photo_path: null, demo_key: null, created_at: t, updated_at: t }],
      items: [
        {
          id: "10000000-0000-4000-8000-000000000004", storage_id: s, name: "電動ドライバー", category: "工具",
          detail: "", memo: "", photo_path: null, status: "normal", last_checked_at: null, demo_key: null,
          created_at: t, updated_at: t,
        },
      ],
      words: [{ id: "10000000-0000-4000-8000-000000000005", words: ["物置", "倉庫"], created_at: t, updated_at: t }],
    };
    await as(A, "select public.replace_household_data($1, $2::jsonb)", [householdA, JSON.stringify(data)]);
    expect(await as(B, "select name from public.items")).toEqual([{ name: "電動ドライバー" }]);
    expect(await as(B, "select words from public.word_groups")).toEqual([{ words: ["物置", "倉庫"] }]);
    await expectError(
      as(C, "select public.replace_household_data($1, $2::jsonb)", [householdA, JSON.stringify(data)]),
      /forbidden/,
    );
  });
});

describe("写真と管理", () => {
  it("写真は自分の家族のフォルダにだけ保存・閲覧できる", async () => {
    await as(B, "insert into storage.objects (bucket_id, name) values ('photos', $1)", [`${householdA}/p1.jpg`]);
    await expectError(
      as(C, "insert into storage.objects (bucket_id, name) values ('photos', $1)", [`${householdA}/p2.jpg`]),
      /row-level security/,
    );
    expect(await as(C, "select name from storage.objects")).toEqual([]);
    expect(await as(A, "select name from storage.objects")).toEqual([{ name: `${householdA}/p1.jpg` }]);
  });

  it("管理者だけがメンバーを外せ、管理者は自分で抜けられない", async () => {
    await expectError(as(B, "select public.remove_member($1, $2)", [householdA, A]), /forbidden/);
    await expectError(as(A, "select public.leave_household($1)", [householdA]), /owner_cannot_leave/);
    await as(A, "select public.remove_member($1, $2)", [householdA, B]);
    // 外されたメンバーはもうデータを見られない
    expect(await as(B, "select name from public.items")).toEqual([]);
  });
});
