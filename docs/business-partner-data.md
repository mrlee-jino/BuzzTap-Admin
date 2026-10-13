# Business partner data handoff

Frontend additions are implemented. No migrations or database changes were applied.

## Verification performed

- Inspected the business-project handoff and the admin pages/migrations.
- This checkout defines `business_bp_wallets(business_id UUID PRIMARY KEY, balance BIGINT, created_at, updated_at)` and an authenticated ADMIN SELECT policy in `supabase/migrations/20261003190000_credit_approved_business_purchases.sql`.
- The checkout also defines ADMIN purchase-request and content SELECT policies.
- No SQL connection, Supabase CLI, service-role credential, or authenticated admin token is configured for this development session. The configured public REST metadata request returned HTTP 401 on 2026-10-13. Deployed columns, policies, grants, migration deployment and transaction-type constraints could not be independently verified.
- A user's existing signed-in admin session performs frontend reads. Successful profile RPC responses and returned shared wallet records can be displayed. Empty responses do not establish zero balances or complete staff/operations coverage.

## Frontend behavior

- Public profiles: `get_public_business_profile({p_business_id})`, ACTIVE businesses only, at most four concurrent calls. Validate the returned business ID. Show public name/logo/address/contact/about/website and free-text opening hours; preserve the registered name for searching. HTTP(S) links only. Profile loading can be moved into the bulk backend API once the deployed profile storage is verified.
- Shared wallets: `business_bp_wallets`, batches of 100 IDs. Use only returned valid balance records. Never query or combine legacy `buzzpoint_wallets` balances. Missing wallet rows stay unreported.
- Rankings: retain ACTIVE partners and COMPLETED `transactions`, excluding CUSTOMER_LOAD/BUSINESS_PURCHASE. Completed refunds remain activity. Rankings are not net sales.
- Shared sales: only `transactions`, never mirrored `business_transactions`. Gross = PURCHASE with status COMPLETED or REFUNDED. Refunds = completed REFUND amounts. Net = gross minus refunds. Transfers and treasury funding are not sales. Original sales and refunds belong to their own `created_at` reporting periods; historical net can change if a sale's status changes.
- Buyers: distinct `transactions.customer_id` on qualifying shared sales. Repeat buyers have at least two sales within that business/window. Guests are sales with no customer ID and are not deduplicated. Repeat rate is undefined without identified buyers. These counts are not merged with local `customers.id` identifiers.
- Windows: consecutive rolling 30 x 24-hour UTC intervals, inclusive start/exclusive end, based on `created_at`. Previous period is the preceding 30 days. All time has no comparison. Display dates in Asia/Shanghai. Net comparison is `(current - previous) / abs(previous) * 100`; no percentage when the baseline is zero or unconfirmed.
- Source failures remain independent. Profile, wallet or optional summary failure does not remove the partner directory/rankings.
- Without a verified summary, sales totals cover visible qualifying records only. Businesses with no qualifying records remain unreported. Network cards show the number of reporting partners; absent partners do not contribute invented zeros.

## Backend proposal for review

The frontend optionally calls `admin_get_business_partner_summary` using batches of 100 IDs. The [SQL draft](proposals/admin_business_partner_summary.sql) is outside the migration directory and has not been executed or SQL-validated against the live schema.

Arguments: `p_business_ids TEXT[]`, `p_start TIMESTAMPTZ|null`, `p_end TIMESTAMPTZ`, `p_previous_start TIMESTAMPTZ|null`, `p_timezone TEXT`.

Expected response:

```json
{
  "access_verified": true,
  "window": {"start": "2026-09-13T08:00:00Z", "end": "2026-10-13T08:00:00Z", "previous_start": "2026-08-14T08:00:00Z", "timestamp_basis": "created_at", "timezone": "Asia/Shanghai"},
  "businesses": [{
    "business_id": "business-id",
    "last_shared_sale": "2026-10-01T08:00:00Z",
    "metrics": {
      "shared_net": {"available": true, "value": 250, "unit": "BP"},
      "active_staff": {"available": true, "value": 0},
      "cash_net": {"available": false, "value": null, "reason": "Source not verified"}
    }
  }]
}
```

Only an explicitly `access_verified: true` response may establish confirmed zeros. Unknown/missing metrics are `available: false`, `value: null`, with a reason. Numeric values must be JSON numbers. Never return customer identities through this analytics endpoint.

The draft guards an ACTIVE ADMIN before privileged reads, uses an empty search path, aggregates sources separately before joining, supports text/UUID business IDs, and caps each call at 100 IDs. It also requires the function owner to bypass RLS or own each RLS source without FORCE RLS; otherwise it refuses to assert complete coverage. It implements shared sales/wallets, active membership counts (including OWNER), PUBLISHED post counts (status only, not expiry), and PENDING purchase request counts/amounts from locally evidenced columns. Missing wallets remain unavailable. It deliberately leaves other metrics unavailable until their deployed schema and semantics are checked.

## Remaining backend work

| Metric/source | Required verification before enabling |
| --- | --- |
| Active stations / sessions | Exact status fields, active-state definition, session timestamp and count basis |
| Rebate promotions | Enabled/status fields, start/end dates and reporting timezone |
| Cash sales/refunds | `business_transactions` type/status constraints and amount precision. CASH_PURCHASE originals COMPLETED/REFUNDED less completed CASH_REFUND. No currency assumption |
| Customized BP sales/refunds | CUSTOMIZED_PURCHASE originals COMPLETED/REFUNDED less completed CUSTOMIZED_REFUND; keep CBP separate |
| Customized wallet | Wallet ownership/key/units. Preserve negative recovery balances |
| Pending settlements | Pending statuses, amount field and payment unit; do not assume BP or a cash currency |
| Purchased BP totals | Reconcile funding source/unique request linkage before adding ledger and approved request totals |
| Public profile bulk loading | Confirm underlying tables and public-function authorization before adding profiles to the summary |
| Complete owner/staff list | Confirm ADMIN access to business_members and profiles; visible members are not a complete staff count |

Do not sum shared transaction rows with their local mirrors. If local customer analytics are added, scope `business_transactions.customer_id::text = customers.id::text` by business_id and map `customers.profile_id` to profiles before merging identities.

## Read-only schema audit for the database owner

Run these queries in an authorized SQL session and review their results before deploying the draft:

```sql
select table_name, column_name, data_type, udt_name, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name in (
  'businesses', 'transactions', 'business_members', 'business_bp_wallets',
  'business_transactions', 'customers', 'workstations', 'workstation_sessions',
  'content_items', 'purchase_requests', 'settlement_requests',
  'business_rebate_promotions', 'business_customized_bp_wallets',
  'business_customized_bp_ledger'
) order by table_name, ordinal_position;

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public'
order by tablename, policyname;

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('authenticated', 'anon')
order by table_name, grantee, privilege_type;

select c.relname, c.relrowsecurity, c.relforcerowsecurity, r.rolname as owner,
  r.rolbypassrls, r.rolsuper
from pg_class c join pg_namespace n on n.oid = c.relnamespace
join pg_roles r on r.oid = c.relowner
where n.nspname = 'public' and c.relkind in ('r', 'p');

select c.conrelid::regclass as relation, c.conname, pg_get_constraintdef(c.oid)
from pg_constraint c join pg_namespace n on n.oid = c.connamespace
where n.nspname = 'public' and c.contype in ('f', 'c');

select p.proname, pg_get_function_identity_arguments(p.oid),
  pg_get_functiondef(p.oid), p.proacl, r.rolname as owner, r.rolbypassrls, r.rolsuper
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
join pg_roles r on r.oid = p.proowner
where n.nspname = 'public' and p.proname in (
  'is_admin', 'get_public_business_profile', 'admin_get_business_partner_summary'
);
```

Database-owner queries establish schema/grants, but not the browser user's RLS coverage. Also verify queries/RPCs using a real ACTIVE ADMIN session, an ordinary business member, and an unauthenticated caller. The new RPC must reject the latter two, return confirmed zeros for an empty authorized source, keep missing wallets null, and avoid multiplied sums when a business has multiple staff/posts/requests.
