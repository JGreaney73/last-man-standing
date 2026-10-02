create table if not exists public.competition_settings (
  id boolean primary key default true check (id),
  starting_round integer not null default 1 check (starting_round > 0),
  updated_at timestamptz not null default clock_timestamp()
);

insert into public.competition_settings (id, starting_round)
values (
  true,
  coalesce((select min(round_number) from public.rounds), 1)
)
on conflict (id) do nothing;

alter table public.competition_settings enable row level security;

drop policy if exists "Authenticated users can read competition settings"
  on public.competition_settings;
create policy "Authenticated users can read competition settings"
  on public.competition_settings for select to authenticated
  using (true);

drop policy if exists "Admins can update competition settings"
  on public.competition_settings;
create policy "Admins can update competition settings"
  on public.competition_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.competition_settings from public, anon;
grant select, update on public.competition_settings to authenticated;