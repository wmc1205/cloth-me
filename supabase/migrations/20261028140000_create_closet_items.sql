-- 옷장 아이템 + 사진 저장소. AI 태깅 컬럼(colors, seasons 등)은 3단계에서 추가한다.

create table public.closet_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('outer', 'top', 'bottom', 'shoes', 'etc')),
  name text not null,
  image_path text not null,
  created_at timestamptz not null default now()
);

create index closet_items_user_id_idx on public.closet_items (user_id);

alter table public.closet_items enable row level security;

create policy "closet_items_select_own" on public.closet_items
  for select using (auth.uid() = user_id);

create policy "closet_items_insert_own" on public.closet_items
  for insert with check (auth.uid() = user_id);

create policy "closet_items_update_own" on public.closet_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "closet_items_delete_own" on public.closet_items
  for delete using (auth.uid() = user_id);

-- 비공개 버킷. 파일 경로는 <user_id>/<파일명> 이고, 본인 폴더만 접근할 수 있다.
insert into storage.buckets (id, name, public)
values ('closet', 'closet', false)
on conflict (id) do nothing;

create policy "closet_storage_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "closet_storage_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "closet_storage_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "closet_storage_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text);
