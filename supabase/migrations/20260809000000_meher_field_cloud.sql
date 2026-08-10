create table if not exists public.field_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  projects jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.field_data enable row level security;

drop policy if exists "Users read their own field data" on public.field_data;
create policy "Users read their own field data"
  on public.field_data for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users create their own field data" on public.field_data;
create policy "Users create their own field data"
  on public.field_data for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own field data" on public.field_data;
create policy "Users update their own field data"
  on public.field_data for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.photo_records (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null,
  unit_id text not null,
  category text not null,
  caption text not null default '',
  storage_path text not null unique,
  width integer,
  height integer,
  original_size bigint,
  compressed_size bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists photo_records_user_unit_idx
  on public.photo_records (user_id, unit_id);

alter table public.photo_records enable row level security;

drop policy if exists "Users read their own photo records" on public.photo_records;
create policy "Users read their own photo records"
  on public.photo_records for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users create their own photo records" on public.photo_records;
create policy "Users create their own photo records"
  on public.photo_records for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own photo records" on public.photo_records;
create policy "Users update their own photo records"
  on public.photo_records for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own photo records" on public.photo_records;
create policy "Users delete their own photo records"
  on public.photo_records for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('unit-photos', 'unit-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "Users read their own unit photos" on storage.objects;
create policy "Users read their own unit photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'unit-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users upload their own unit photos" on storage.objects;
create policy "Users upload their own unit photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'unit-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users update their own unit photos" on storage.objects;
create policy "Users update their own unit photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'unit-photos'
    and owner_id = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'unit-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users delete their own unit photos" on storage.objects;
create policy "Users delete their own unit photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'unit-photos'
    and owner_id = (select auth.uid()::text)
  );

