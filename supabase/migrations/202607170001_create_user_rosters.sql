create table public.user_rosters (
  user_id uuid primary key references auth.users (id) on delete cascade,
  roster_schema_version integer not null check (roster_schema_version > 0),
  roster jsonb not null check (jsonb_typeof(roster) = 'array'),
  client_updated_at timestamptz null,
  updated_at timestamptz not null default current_timestamp
);

comment on table public.user_rosters is
  'One normalized Dragonfire Lab roster per authenticated user.';

create function public.set_user_rosters_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = current_timestamp;
  return new;
end;
$$;

create trigger set_user_rosters_updated_at
before update on public.user_rosters
for each row
execute function public.set_user_rosters_updated_at();

alter table public.user_rosters enable row level security;

revoke all on table public.user_rosters from public, anon;
grant select, insert, update on table public.user_rosters to authenticated;

create policy "authenticated users select their roster"
on public.user_rosters
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "authenticated users insert their roster"
on public.user_rosters
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "authenticated users update their roster"
on public.user_rosters
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on function public.set_user_rosters_updated_at() from public;
grant execute on function public.set_user_rosters_updated_at() to authenticated;
