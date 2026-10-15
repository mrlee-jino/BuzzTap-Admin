# Admin payment oversight

Open **Payment Oversight** in the sidebar (`/payments`). This implements the admin
portion of the customer-payment-approval handoff, using the existing hosted API.
No business checkout migration is applied by this frontend change. Customer app
and business checkout release coordination remains a separate rollout task.

## Features

- Payment explorer: 25-row server pagination; business, global customer UUID,
  creation dates (UTC+8), and state filters. Expiry is derived only for PENDING and
  APPROVED requests. Lists refresh every 30 seconds; evidence has manual refresh.
- Evidence: immutable item/price/time snapshots, business registration ID versus
  global profile UUID, requester/approver, consent version, timestamps, original
  payload, receipt/session IDs, and paginated payment/refund/dispute event history.
  Merchant receipts are read subject to existing RLS; unavailable access is shown
  explicitly. Shared transaction metadata can be searched by the merchant receipt
  UUID without treating the receipt and shared transfer as separate charges.
- Disputes: OPEN/UNDER_REVIEW filter, business/customer/date/age filters, report and
  evidence inspection, and confirmed review via `admin_review_payment_dispute`.
  Explanations are customer-visible, 10–2,000 trimmed characters. Closing moves no
  funds and closed reports cannot be rewritten.
- Controls: current state and paginated append-only history per business;
  pause/resume via `admin_set_business_points_payments`, with confirmation and a
  5–1,000 character reason. No control row means enabled only after a successful
  read. Failed reads are unavailable, never interpreted as enabled.
- Monitoring: business/customer request and decline counts for the last 30 days,
  refunds for those requests in that period, and all unresolved disputes with age.
  These are leads for investigation, not automatic fraud classifications. Failed
  captures are unavailable because denied attempts are not in this event stream.
- Bell notifications for OPEN/UNDER_REVIEW disputes.

## Funding and refund audit

Customer and Treasury funding use `admin_load_customer_bp`; business purchase
approvals use `admin_review_purchase_request`. Profile edits/status changes also
use checked RPCs. No direct wallet or financial receipt writes were added. The
Transactions page previously simulated refunds in React state and displayed a
success message without moving funds. That action was removed. Search now covers
database UUIDs and linked metadata, and reads all transaction pages.

Merchant refunds remain in the authorized business workflow using the original
business receipt UUID. Admin dispute review does not grant business membership
or a blanket refund override. No balance adjustment, customer-approval override,
legacy debit call, or broad financial table write grant is introduced.

## Operational setup and rollout

Assign a named support owner and an acknowledgement/resolution-time policy before
launch. The supplied schema has no support-assignment or SLA fields; this page
does not imply that such ownership is saved. Persistent operational/security
alerts and failed capture telemetry need a separate monitored system.

Use normal active ADMIN sessions and publishable client keys. Keep
`payment_private` out of the exposed Data API schemas. UI expiry uses the browser
clock for display; server RPCs remain authoritative for payment expiry and state.
No app/customer payment approval or capture action exists in this admin UI.

Validate in staging with real admin/customer/merchant sessions before coordinated
production rollout, including composite `.single()` responses, closed-dispute
retries, competing reviews, pause during capture, network interruptions, and
BP/CBP refund evidence. UI tests cannot certify real simultaneous database locks.

Verification:

`supabase/tests/payment_admin_contract.sql` checks the existing hosted contract
under an authenticated admin role, invalid RPC input, and non-admin denials;
it requires existing active admin/customer fixtures and rolls back its session.
`tests/payment-oversight.browser.mjs` exercises the screens against mocked HTTP
responses using Playwright and Chrome. Set `PLAYWRIGHT_MODULE` to an importable
Playwright module or install it in a separate test environment; `CHROME_PATH` and
`TEST_BASE_URL` can override Chrome and the running Vite server. Screenshots go to
ignored `test-results/`. This harness performs no hosted writes.

```powershell
node --test src/lib/*.test.js
npm run lint
npm run build
```
