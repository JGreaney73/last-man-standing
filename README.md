# Last Man Standing

React/Vite frontend for the Aspendale Stingrays Last Man Standing competition.
The application uses Supabase Auth, Supabase Postgres, and private Supabase
Storage. Production hosting is configured for Vercel.

## Local setup

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor.
3. Copy `.env.example` to `.env.local` and add the Supabase URL and anon key.
4. Create users in Supabase Authentication.
5. Promote at least two approved users to administrators:

   ```sql
   update public.profiles
   set role = 'admin'
   where id in ('AUTH_USER_UUID_1', 'AUTH_USER_UUID_2');
   ```

6. Start the app:

   ```bash
   npm install
   npm run dev
   ```

Supabase Auth uses email/password credentials. Passwords and the service-role
key must never be stored in frontend code or committed to GitHub.

## Participant and entry import

Create each participant's account in Supabase Authentication first. Prepare a
CSV with one row per entry and these headers: `email`, `participant_name`, and
`entry_name`. Repeat the participant email and name for each of their entries:

```csv
email,participant_name,entry_name
alex@example.com,Alex Smith,Alex
alex@example.com,Alex Smith,Alex's second entry
```

Import from a trusted local machine:

```bash
SUPABASE_URL="https://your-project.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
npm run import:participants -- "/path/to/participants.csv"
```

The importer updates matching entry numbers and adds missing ones; it does not
delete entries omitted from a later CSV. Players can switch between and manage
their provisioned entries in the app, but cannot create entries themselves.
Keep the service-role key out of Vercel, `.env.local`, and version control.

## Fixture import

The supplied `epl-2026-GMTStandardTime.csv` contains 329 fixtures for rounds
6–38. Import it from a trusted local machine after applying the schema:

```bash
SUPABASE_URL="https://your-project.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
npm run seed:fixtures -- "/path/to/epl-2026-GMTStandardTime.csv"
```

The CSV times are interpreted as GMT/UTC. The service-role key is used only by
this local import command and must never be added to Vercel or `.env.local`.

## Commands

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Production deployment

See [`docs/production-deployment.md`](docs/production-deployment.md) for the
complete GitHub, Supabase, Vercel, migration, authentication, verification,
and rollback procedure.
# last-man-standing
