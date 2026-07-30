-- Staff-only sales notes from portfolio Excel (Notes to Sales column).
alter table products
  add column if not exists notes_to_sales text;
