-- Normalize Supabase/default grants. Browser-authenticated clients intentionally cannot delete cloud rosters.
revoke all privileges
on table public.user_rosters
from public, anon, authenticated;

grant select, insert, update
on table public.user_rosters
to authenticated;
