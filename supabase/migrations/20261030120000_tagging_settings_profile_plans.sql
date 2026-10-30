-- AI 태깅 컬럼, 추천 시간 설정, 스타일 프로필, 하루치 코디 추천 결과.
-- 개발용 프로젝트에 먼저 적용해 확인한 뒤 운영에 반영한다.

alter table public.closet_items
  add column colors text[] not null default '{}',
  add column material text,
  add column seasons text[] not null default '{}',
  add column styles text[] not null default '{}',
  add column pattern text,
  add column confidence real check (confidence is null or (confidence >= 0 and confidence <= 1)),
  add column tagged_at timestamptz;

-- 사용자별 추천 시간/요일. recommend_days는 "입을 날"의 요일(0=일 ... 6=토).
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  recommend_time time not null default '21:00',
  recommend_days smallint[] not null default '{0,1,2,3,4,5,6}',
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.style_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.outfit_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_date date not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_date)
);

alter table public.user_settings enable row level security;
alter table public.style_profiles enable row level security;
alter table public.outfit_plans enable row level security;

create policy "user_settings_select_own" on public.user_settings
  for select using (auth.uid() = user_id);
create policy "user_settings_insert_own" on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy "user_settings_update_own" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_settings_delete_own" on public.user_settings
  for delete using (auth.uid() = user_id);

create policy "style_profiles_select_own" on public.style_profiles
  for select using (auth.uid() = user_id);
create policy "style_profiles_insert_own" on public.style_profiles
  for insert with check (auth.uid() = user_id);
create policy "style_profiles_update_own" on public.style_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "style_profiles_delete_own" on public.style_profiles
  for delete using (auth.uid() = user_id);

create policy "outfit_plans_select_own" on public.outfit_plans
  for select using (auth.uid() = user_id);
create policy "outfit_plans_insert_own" on public.outfit_plans
  for insert with check (auth.uid() = user_id);
create policy "outfit_plans_update_own" on public.outfit_plans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "outfit_plans_delete_own" on public.outfit_plans
  for delete using (auth.uid() = user_id);
