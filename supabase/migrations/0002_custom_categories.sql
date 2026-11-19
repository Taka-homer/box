-- カテゴリを自由に追加できるようにする（0001_init.sql の後に実行。何度実行しても安全）
-- これまでは決まった7種類だけを許可していた。1〜20文字の任意の名前を許可する。

alter table public.items drop constraint if exists items_category_check;
alter table public.items
  add constraint items_category_check check (char_length(btrim(category)) between 1 and 20);
