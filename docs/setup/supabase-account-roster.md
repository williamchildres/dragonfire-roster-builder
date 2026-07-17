# Supabase account roster setup

Dragonfire Lab is fully functional without Supabase configuration. When the two browser-publishable build variables are absent, the account client is not created, Sign in is not shown, and no Supabase request is made.

## Project and migration

1. Create or select a Supabase project.
2. From the repository root, link the Supabase CLI to the development project and run `supabase db push`, or paste and run `supabase/migrations/202607170001_create_user_rosters.sql` in the Supabase SQL editor.
3. Confirm `public.user_rosters` exists with one row per `user_id`, roster schema version, JSON roster array, client timestamp, and server timestamp.
4. In Table Editor or with `select relrowsecurity from pg_class where oid = 'public.user_rosters'::regclass;`, confirm Row Level Security is enabled.
5. Confirm `anon` has no table privilege with `select has_table_privilege('anon', 'public.user_rosters', 'select');` (the result must be false).
6. Confirm authenticated SELECT, INSERT, and UPDATE policies bind `user_id` to `auth.uid()` in Database > Policies. DELETE is intentionally not granted.

For a development rollback, run:

```sql
drop table if exists public.user_rosters cascade;
drop function if exists public.set_user_rosters_updated_at();
```

Then reset or repair the local Supabase migration history before applying the migration again. Do not use this rollback against production data without a reviewed backup and recovery plan.

## Authentication URLs

Enable email OTP/magic-link authentication. Set the production Site URL to `https://dragonfirelab.com`. Add approved redirect URLs for `https://dragonfirelab.com/` and the exact local development origin used for testing, normally `http://127.0.0.1:5173/`. Password and social providers are not part of this feature.

## GitHub Pages variables

In GitHub, open **Settings > Secrets and variables > Actions > Variables** and add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

These values are exposed to the browser build by `.github/workflows/deploy-pages.yml`. The publishable key is not a service-role key; authorization depends on RLS. Never add a service-role key, database password, JWT signing secret, or actual `.env` file to the repository. Removing either variable safely returns the next deployment to local-only mode.

## Cross-user RLS verification

Use two disposable authenticated test users. As user A, insert or update only the row whose `user_id` is A. With user B's access token, verify that selecting A's ID returns no row and that insert/update attempts using A's ID fail. Then verify B can create and update B's own row. Repeat with the REST client or SQL sessions that set distinct authenticated JWT claims; do not test with a privileged database or service-role session because it bypasses the browser security model.

## Current scope

Account synchronization covers roster ownership, Star Rank, Dragon Level (persisted as `reignLevel`), Habit Levels, and dragon notes. The browser copy remains available after sign-out and after cloud errors. Saved formations and subscriptions do not exist as account-backed features.

## Post-deployment acceptance checklist

After the Supabase project is configured and the PR is merged:

1. Run the migration.
2. Confirm RLS policies.
3. Set production Site URL and redirect URL.
4. Add GitHub build variables.
5. Trigger Pages deployment.
6. Open a fresh private browser session.
7. Create/sign in through the magic link.
8. Create a small local roster before first sign-in.
9. Choose Save to account.
10. Verify the row exists for that authenticated user.
11. Sign out.
12. Verify local roster remains.
13. Sign in from a second browser/device.
14. Verify account roster loads.
15. Change Star Rank, Dragon Level, one Habit Level, and notes.
16. Verify synchronization status becomes Synced.
17. Reload and verify values.
18. Confirm a different authenticated user cannot access the first user’s row.
19. Confirm formations are still local and no UI claims otherwise.
