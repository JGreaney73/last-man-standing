# Production deployment

## Architecture

- Frontend: React and Vite
- Hosting: Vercel
- Authentication: Supabase Auth
- Database: Supabase Postgres
- Private imports: Supabase Storage
- Version control: GitHub

The browser uses only the Supabase project URL and anon key. The Supabase
service-role key is never required by the frontend and must never be placed in
Vercel or committed to GitHub.

## Before deployment

1. Push the repository to GitHub.
2. Create or select the production Supabase project.
3. For a new Supabase project, run `supabase/schema.sql` in the SQL Editor,
   followed by `supabase/migrations/20260926_phase4_selection_lockout.sql`.
4. For an existing project, run these migrations in order:
   - `supabase/migrations/20260925_phase2_fixture_location.sql`
   - `supabase/migrations/20260925_phase3_dashboard_leaderboard.sql`
   - `supabase/migrations/20260926_phase4_selection_lockout.sql`
5. In Supabase Authentication, create the team accounts. The profile trigger
   creates a corresponding `public.profiles` row.
6. Promote at least two administrators:

   ```sql
   update public.profiles
   set role = 'admin'
   where id in ('ADMIN_USER_UUID_1', 'ADMIN_USER_UUID_2');
   ```

7. Verify the `participant-imports` storage bucket is private.
8. Import the supplied fixture list from a trusted local machine:

   ```bash
   SUPABASE_URL="https://your-project.supabase.co" \
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
   npm run seed:fixtures -- "/path/to/epl-2026-GMTStandardTime.csv"
   ```

9. Set the first competition round to `open` only when selections should be
   accepted. Leave future rounds as `scheduled`. The lockout migration installs
   a Supabase Cron job that locks overdue rounds and allocates missing picks
   within one minute of the deadline.

## Vercel deployment

1. In Vercel, import the GitHub repository.
2. Keep the detected framework as Vite.
3. Confirm the build command is `npm run build`.
4. Confirm the output directory is `dist`.
5. Add these Production environment variables:

   ```text
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

6. Deploy the production branch.
7. In Supabase Authentication URL Configuration, set the production Site URL
   to the Vercel domain and add the Vercel domain to allowed redirect URLs.

## Post-deployment verification

- Open the Vercel URL in a private browser window.
- Confirm unauthenticated users see the login screen.
- Sign in as a standard user.
- Confirm Dashboard, Selection, Journey, and Leaderboard load.
- Confirm Admin is unavailable to the standard user.
- Sign in as each administrator and verify Admin access.
- Confirm fixture count and round/date/time values.
- Create, edit, and delete a test fixture as an administrator.
- Confirm a standard user cannot modify fixtures.
- Make a test selection and verify it persists after refresh.
- Change that selection before lockout and verify the replacement persists.
- Confirm the selection is rejected by the database after the two-hour cutoff.
- Confirm an overdue active competitor without a selection receives the
   alphabetically first unused team with `selection_source = 'AUTO'`.
- Confirm another user cannot see that selection history.
- Check browser console and Vercel deployment logs for errors.

## Database checks

```sql
select count(*) from public.fixtures;

select count(*)
from public.profiles
where role = 'admin';

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'leaderboard_players';
```

The fixture count should match the imported source file. At least two admin
profiles should exist. `authenticated` should have `SELECT` on
`leaderboard_players`; anonymous/public access should not be granted.
The `allocate-overdue-round-selections` job should appear in `cron.job` and
run once per minute.

## Rollback

1. In Vercel, redeploy the previous successful deployment from the Deployments
   page.
2. If a database change caused the issue, stop making new selections and take
   a Supabase database backup/export before changing data.
3. Do not delete production tables to roll back. Use a corrective migration or
   restore a verified backup.
4. If only fixture data is wrong, correct or remove the affected fixture rows
   from Admin and verify selections before reopening the round.

## Common errors

### Supabase configuration required

The Vercel project is missing `VITE_SUPABASE_URL` or
`VITE_SUPABASE_ANON_KEY`. Add both variables and redeploy.

### Invalid email or password

Confirm the user exists in Supabase Auth, is not disabled, and is using the
correct email/password. Passwords are managed by Supabase Auth only.

### Admin access required

Confirm the authenticated user has a profile and that `profiles.role` is
`admin`. Sign out and back in after changing the role.

### Fixtures or teams do not appear

Check that the seed script completed, the round is `open` or `scheduled`, and
the user is authenticated. Inspect the browser console and Supabase logs.

### Permission denied for a database operation

Check that the relevant RLS policy exists and that the request is authenticated.
Do not solve this by exposing the service-role key in the frontend.

### Automatic selections are not being allocated

Confirm the lockout migration completed, `pg_cron` is enabled, and the
`allocate-overdue-round-selections` job is present in `cron.job`. Check recent
job runs in `cron.job_run_details` and confirm the round has a kickoff time.
