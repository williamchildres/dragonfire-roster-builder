# Supabase Saved Formation Library

Saved formations use `public.user_saved_formations`, a separate account document from `public.user_rosters`. The existing table already supports v0.23.2 schema-2 JSON and reservation synchronization through `formations_schema_version`, `formations`, `client_updated_at`, and `updated_at`; no new migration or policy change is required. Troop-affinity recommendations remain render-time derived data and are not written to this row. Apply `supabase/migrations/202608010001_create_user_saved_formations.sql` only where the original v0.23.0 table has not yet been installed.

The browser client uses only the Supabase publishable key. It never uses service-role credentials, and exports contain no account ID or email address.

## Verification

After applying the migration, verify the table and RLS state from an administrative SQL session:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'user_saved_formations';

select relrowsecurity
from pg_class
where oid = 'public.user_saved_formations'::regclass;

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'user_saved_formations'
order by policyname;
```

Use two disposable authenticated test users to verify that each can select, insert, update, and delete only its own row. An anonymous request and a cross-user request must be denied. Confirm that updates advance `updated_at`, that `client_updated_at` retains the client timestamp, and that `formations` is an object with format `dragonfire-lab-saved-formations` and schema version `2`. Existing schema-1 rows must load unreserved and persist schema 2 only on the next actual account write. Malformed schema-2 `reserved` values and overlapping reserved records must be rejected without changing browser data.

## Rollback and deployment ordering

Export any production rows before rollback. A rollback drops the trigger, function, policies, and table; it permanently removes account copies but does not remove browser-local libraries. Deploy in this order: apply and verify the database migration, deploy the frontend, then complete signed-in initialization, conflict, offline, and reconnect acceptance. If the table is unavailable, the frontend preserves browser data and reports account synchronization as unavailable without touching roster synchronization.

Do not declare cross-device Saved Formation synchronization released until the production migration and authenticated flows have been verified. Keep the pull request draft while that verification remains outstanding.
