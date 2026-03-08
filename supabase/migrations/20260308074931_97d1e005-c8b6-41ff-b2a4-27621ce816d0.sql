
create table if not exists public.community_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  slot_index integer not null,
  status text not null default 'available',
  project_name text,
  website_url text,
  thumbnail_url text,
  created_at timestamptz default now(),
  constraint community_slots_status_check check (status in ('available','pending','approved'))
);

alter table public.community_slots enable row level security;

create policy "Public can view approved slots"
  on public.community_slots for select
  using (status = 'approved' or auth.uid() = user_id);

create policy "Users can claim slots"
  on public.community_slots for insert
  with check (auth.uid() = user_id);

create policy "Users can update own slots"
  on public.community_slots for update
  using (auth.uid() = user_id);

create policy "Users can delete own slots"
  on public.community_slots for delete
  using (auth.uid() = user_id);
