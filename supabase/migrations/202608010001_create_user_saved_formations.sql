create table public.user_saved_formations (
  user_id uuid primary key references auth.users (id) on delete cascade,
  formations_schema_version integer not null check (formations_schema_version > 0),
  formations jsonb not null check (jsonb_typeof(formations) = 'object'),
  client_updated_at timestamptz null,
  updated_at timestamptz not null default current_timestamp
);

comment on table public.user_saved_formations is
  'One versioned Dragonfire Lab Saved Formation Library per authenticated user.';

create function public.set_user_saved_formations_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = current_timestamp;
  return new;
end;
$$;

create trigger set_user_saved_formations_updated_at
before update on public.user_saved_formations
for each row
execute function public.set_user_saved_formations_updated_at();

alter table public.user_saved_formations enable row level security;

revoke all privileges on table public.user_saved_formations from public, anon, authenticated;
grant select, insert, update, delete on table public.user_saved_formations to authenticated;

create policy "authenticated users select their saved formations"
on public.user_saved_formations
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "authenticated users insert their saved formations"
on public.user_saved_formations
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "authenticated users update their saved formations"
on public.user_saved_formations
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "authenticated users delete their saved formations"
on public.user_saved_formations
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on function public.set_user_saved_formations_updated_at() from public;
grant execute on function public.set_user_saved_formations_updated_at() to authenticated;
