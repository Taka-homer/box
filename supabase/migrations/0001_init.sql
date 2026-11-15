-- わが家の収納：家族共有用のデータベース
-- Supabase の SQL Editor で、このファイルの内容をそのまま実行してください（何度実行しても安全です）。
--
-- ・すべてのデータは household_id（家族）ごとに分かれ、行レベルセキュリティで
--   その家族のメンバー以外は読み書きできません。
-- ・名前の重複判定用の name_key はアプリ側で正規化した値です。


-- ---------------------------------------------------------------
-- 家族とメンバー・招待
-- ---------------------------------------------------------------

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  -- 1人が参加できる家族は1つ
  unique (user_id)
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  code text not null unique,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  max_uses int not null default 10 check (max_uses > 0),
  used_count int not null default 0,
  revoked boolean not null default false
);

-- ---------------------------------------------------------------
-- 階・部屋・収納場所・もの・マイ辞書
-- （複合外部キーで、別の家族のデータを参照できないようにする）
-- ---------------------------------------------------------------

create table if not exists public.floors (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  name_key text not null,
  sort_order int not null default 0,
  demo_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  unique (household_id, name_key)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  floor_id uuid not null,
  name text not null check (char_length(name) between 1 and 60),
  name_key text not null,
  sort_order int not null default 0,
  demo_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  unique (floor_id, name_key),
  foreign key (floor_id, household_id) references public.floors(id, household_id) on delete restrict
);

create table if not exists public.storages (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  room_id uuid not null,
  name text not null check (char_length(name) between 1 and 60),
  name_key text not null,
  photo_path text,
  demo_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  unique (room_id, name_key),
  foreign key (room_id, household_id) references public.rooms(id, household_id) on delete restrict
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  storage_id uuid not null,
  name text not null check (char_length(name) between 1 and 60),
  category text not null check (category in ('未分類', '書類', '工具', '季節用品', '家電・付属品', '日用品', 'その他')),
  detail text not null default '' check (char_length(detail) <= 200),
  memo text not null default '' check (char_length(memo) <= 1000),
  photo_path text,
  status text not null default 'normal' check (status in ('normal', 'missing')),
  last_checked_at timestamptz,
  demo_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (storage_id, household_id) references public.storages(id, household_id) on delete restrict
);

create table if not exists public.word_groups (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  words text[] not null check (cardinality(words) between 2 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rooms_floor_idx on public.rooms (floor_id);
create index if not exists storages_room_idx on public.storages (room_id);
create index if not exists items_storage_idx on public.items (storage_id);
create index if not exists items_household_idx on public.items (household_id);

-- ---------------------------------------------------------------
-- 権限の判定
-- ---------------------------------------------------------------

create or replace function public.is_member(h uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.members where household_id = h and user_id = auth.uid());
$$;

create or replace function public.is_owner(h uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.members where household_id = h and user_id = auth.uid() and role = 'owner');
$$;

alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.floors enable row level security;
alter table public.rooms enable row level security;
alter table public.storages enable row level security;
alter table public.items enable row level security;
alter table public.word_groups enable row level security;

drop policy if exists households_select on public.households;
create policy households_select on public.households for select to authenticated using (public.is_member(id));
drop policy if exists households_update on public.households;
create policy households_update on public.households for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

drop policy if exists members_select on public.members;
create policy members_select on public.members for select to authenticated using (public.is_member(household_id));
-- 自分の表示名だけ変更できる（役割の変更は不可）
drop policy if exists members_update_self on public.members;
create policy members_update_self on public.members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites for select to authenticated using (public.is_member(household_id));

do $$
declare t text;
begin
  foreach t in array array['floors', 'rooms', 'storages', 'items', 'word_groups'] loop
    execute format('drop policy if exists %1$s_all on public.%1$s', t);
    execute format(
      'create policy %1$s_all on public.%1$s for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id))',
      t
    );
  end loop;
end $$;

-- 役割の書き換えを防ぐため、members の更新は表示名だけに限定する
revoke update on public.members from authenticated;
grant update (display_name) on public.members to authenticated;

grant usage on schema public to authenticated;
grant select on public.households, public.members, public.invites to authenticated;
grant update (name) on public.households to authenticated;
grant select, insert, update, delete on public.floors, public.rooms, public.storages, public.items, public.word_groups to authenticated;

-- ---------------------------------------------------------------
-- 操作用の関数（家族の作成・招待・参加など）
-- ---------------------------------------------------------------

-- アプリの設定。既定では、最初の1家族を作ったあとは新しい家族を作れない
-- （URLを知った第三者が勝手に使うのを防ぐ。複数の家族で使う場合だけ true にする）
create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  allow_new_households boolean not null default false
);
insert into public.app_settings (id) values (true) on conflict (id) do nothing;
alter table public.app_settings enable row level security;

create or replace function public.can_create_household()
returns boolean
language sql stable security definer set search_path = public
as $$
  select not exists (select 1 from public.households)
      or coalesce((select allow_new_households from public.app_settings where id), false);
$$;

create or replace function public.create_household(p_household_name text, p_display_name text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare h uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if exists (select 1 from public.members where user_id = auth.uid()) then raise exception 'already_member'; end if;
  if not public.can_create_household() then raise exception 'household_creation_closed'; end if;
  insert into public.households (name) values (trim(p_household_name)) returning id into h;
  insert into public.members (household_id, user_id, display_name, role) values (h, auth.uid(), trim(p_display_name), 'owner');
  return h;
end $$;

create or replace function public.create_invite(p_household uuid)
returns table (code text, expires_at timestamptz, max_uses int)
language plpgsql security definer set search_path = public
as $$
declare c text;
begin
  if not public.is_member(p_household) then raise exception 'forbidden'; end if;
  -- 推測されにくい12文字（16進）の招待コード
  c := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  insert into public.invites (household_id, code, created_by, expires_at, max_uses)
    values (p_household, c, auth.uid(), now() + interval '7 days', 10);
  return query select c, now() + interval '7 days', 10;
end $$;

create or replace function public.revoke_invite(p_invite uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare h uuid;
begin
  select household_id into h from public.invites where id = p_invite;
  if h is null or not public.is_member(h) then raise exception 'forbidden'; end if;
  update public.invites set revoked = true where id = p_invite;
end $$;

-- 招待コードを確かめて参加する。期限切れ・取り消し・回数超過は参加できない
create or replace function public.join_household(p_code text, p_display_name text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare inv public.invites;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select * into inv from public.invites
    where code = upper(regexp_replace(coalesce(p_code, ''), '[^0-9A-Za-z]', '', 'g'))
    for update;
  if inv.id is null then raise exception 'invite_not_found'; end if;
  if inv.revoked or inv.expires_at <= now() or inv.used_count >= inv.max_uses then
    raise exception 'invite_expired';
  end if;
  if exists (select 1 from public.members where user_id = auth.uid()) then raise exception 'already_member'; end if;
  insert into public.members (household_id, user_id, display_name, role)
    values (inv.household_id, auth.uid(), trim(p_display_name), 'member');
  update public.invites set used_count = used_count + 1 where id = inv.id;
  return inv.household_id;
end $$;

-- 管理者（家族を作った人）がメンバーを外す
create or replace function public.remove_member(p_household uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_owner(p_household) then raise exception 'forbidden'; end if;
  if p_user = auth.uid() then raise exception 'cannot_remove_self'; end if;
  delete from public.members where household_id = p_household and user_id = p_user;
end $$;

-- 管理者以外が自分で家族から抜ける
create or replace function public.leave_household(p_household uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_owner(p_household) then raise exception 'owner_cannot_leave'; end if;
  delete from public.members where household_id = p_household and user_id = auth.uid();
end $$;

-- 登録物を移動してから収納場所を削除する（1つの処理としてまとめて行う）
create or replace function public.move_items_and_delete_storage(p_storage uuid, p_target uuid)
returns int
language plpgsql security invoker set search_path = public
as $$
declare h uuid; n int;
begin
  select household_id into h from public.storages where id = p_storage;
  if h is null then raise exception 'not_found'; end if;
  if not exists (select 1 from public.storages where id = p_target and household_id = h) or p_storage = p_target then
    raise exception 'target_not_found';
  end if;
  update public.items set storage_id = p_target, updated_at = now() where storage_id = p_storage;
  get diagnostics n = row_count;
  delete from public.storages where id = p_storage;
  return n;
end $$;

-- バックアップからの復元：家族のデータを丸ごと置き換える（1つの処理としてまとめて行う）
create or replace function public.replace_household_data(p_household uuid, p_data jsonb)
returns void
language plpgsql security invoker set search_path = public
as $$
begin
  if not public.is_member(p_household) then raise exception 'forbidden'; end if;
  delete from public.items where household_id = p_household;
  delete from public.storages where household_id = p_household;
  delete from public.rooms where household_id = p_household;
  delete from public.floors where household_id = p_household;
  delete from public.word_groups where household_id = p_household;

  insert into public.floors (id, household_id, name, name_key, sort_order, demo_key, created_at, updated_at)
    select id, p_household, name, name_key, sort_order, demo_key, created_at, updated_at
    from jsonb_to_recordset(coalesce(p_data->'floors', '[]'))
      as x(id uuid, name text, name_key text, sort_order int, demo_key text, created_at timestamptz, updated_at timestamptz);
  insert into public.rooms (id, household_id, floor_id, name, name_key, sort_order, demo_key, created_at, updated_at)
    select id, p_household, floor_id, name, name_key, sort_order, demo_key, created_at, updated_at
    from jsonb_to_recordset(coalesce(p_data->'rooms', '[]'))
      as x(id uuid, floor_id uuid, name text, name_key text, sort_order int, demo_key text, created_at timestamptz, updated_at timestamptz);
  insert into public.storages (id, household_id, room_id, name, name_key, photo_path, demo_key, created_at, updated_at)
    select id, p_household, room_id, name, name_key, photo_path, demo_key, created_at, updated_at
    from jsonb_to_recordset(coalesce(p_data->'storages', '[]'))
      as x(id uuid, room_id uuid, name text, name_key text, photo_path text, demo_key text, created_at timestamptz, updated_at timestamptz);
  insert into public.items (id, household_id, storage_id, name, category, detail, memo, photo_path, status, last_checked_at, demo_key, created_at, updated_at)
    select id, p_household, storage_id, name, category, detail, memo, photo_path, status, last_checked_at, demo_key, created_at, updated_at
    from jsonb_to_recordset(coalesce(p_data->'items', '[]'))
      as x(id uuid, storage_id uuid, name text, category text, detail text, memo text, photo_path text, status text,
           last_checked_at timestamptz, demo_key text, created_at timestamptz, updated_at timestamptz);
  insert into public.word_groups (id, household_id, words, created_at, updated_at)
    select id, p_household, words, created_at, updated_at
    from jsonb_to_recordset(coalesce(p_data->'words', '[]'))
      as x(id uuid, words text[], created_at timestamptz, updated_at timestamptz);
end $$;

revoke all on function public.can_create_household() from public;
grant execute on function public.can_create_household() to anon, authenticated;
revoke all on function public.create_household(text, text) from public;
revoke all on function public.create_invite(uuid) from public;
revoke all on function public.revoke_invite(uuid) from public;
revoke all on function public.join_household(text, text) from public;
revoke all on function public.remove_member(uuid, uuid) from public;
revoke all on function public.leave_household(uuid) from public;
revoke all on function public.move_items_and_delete_storage(uuid, uuid) from public;
revoke all on function public.replace_household_data(uuid, jsonb) from public;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.create_invite(uuid) to authenticated;
grant execute on function public.revoke_invite(uuid) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
grant execute on function public.leave_household(uuid) to authenticated;
grant execute on function public.move_items_and_delete_storage(uuid, uuid) to authenticated;
grant execute on function public.replace_household_data(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------
-- 写真の保存場所（非公開）。パスの先頭が家族IDのものだけ、そのメンバーが扱える
-- ---------------------------------------------------------------

insert into storage.buckets (id, name, public)
  values ('photos', 'photos', false)
  on conflict (id) do nothing;

drop policy if exists photos_select on storage.objects;
create policy photos_select on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists photos_insert on storage.objects;
create policy photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists photos_delete on storage.objects;
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.is_member(((storage.foldername(name))[1])::uuid));

-- ---------------------------------------------------------------
-- 家族が変更したら、他の人の画面にもすぐ反映されるようにする
-- ---------------------------------------------------------------

do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['floors', 'rooms', 'storages', 'items', 'word_groups'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
