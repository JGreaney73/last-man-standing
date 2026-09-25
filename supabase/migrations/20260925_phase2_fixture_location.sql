-- Apply this migration to an existing Supabase project that predates venue storage.
alter table public.fixtures
  add column if not exists location text not null default '';
