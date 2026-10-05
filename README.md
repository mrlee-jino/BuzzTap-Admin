# BuzzTap Admin

React and Vite admin interface backed by Supabase.

## Local Development

1. Install Node.js and npm.
2. Copy `.env.example` to `.env.local` and set the Supabase project URL and publishable key.
3. Install dependencies with `npm install`.
4. Start the local server with `npm run dev`.

Required client environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Only use the Supabase publishable/anon key in this browser application. Never put a service-role key in a `VITE_*` variable.

## Verification

- `npm run lint`
- `npm run build`

The production bundle is written to `dist/`. The repository does not currently have an automated test suite.

## Supabase Prerequisites

The SQL files in `supabase/migrations/` are incremental feature migrations, not a complete initial database schema. They depend on existing BuzzTap tables, constraints, helper functions, and policies. Before deployment:

1. Provision the complete baseline schema and required functions in a staging Supabase project.
2. Apply migrations in timestamp order and verify each succeeds.
3. Verify row-level security and admin checks for every table and RPC used by the app, including denial for non-admin and inactive accounts.
4. Create and verify an active `ADMIN` profile for each administrator.
5. Configure Supabase Auth site URL, redirect URLs, email delivery, and recovery flows for the production domain.
6. Test treasury and purchase-request operations against staging data, including failed, repeated, and concurrent requests.

## Deployment Checklist

- Configure the two required environment variables in the hosting provider. These values are bundled into the public client; keep all privileged credentials server-side.
- Configure SPA history fallback so direct navigation to routes such as `/customers` serves `index.html`.
- Use a staging deployment to verify login, permissions, database reads/writes, exports, and mobile layouts before production.
- Configure backups, monitoring, and a rollback procedure.
- Do not treat the disabled user-management and Settings controls as operational. Business status management, user provisioning, platform settings, 2FA setup, and maintenance mode need secure persisted backend implementations.
- Business purchase approvals credit BP from the treasury reserve; independently verify payment before approving. No payment processor is integrated.
