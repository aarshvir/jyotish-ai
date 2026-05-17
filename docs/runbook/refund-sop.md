# Manual Refund SOP

**Source:** v5 §3.10 (manual SOP, no admin route built)
**Trigger:** User requests refund within 24h per public guarantee.

## 1. Inputs needed from user

- Registered email address (the one used at checkout).
- Approximate date/time of purchase (to disambiguate if they have multiple payments).
- Reason is optional and is not required to process the refund.

## 2. Steps

### Step 1 — Identify the payment in Supabase

```sql
-- Replace EMAIL_HERE with the user's email
select rp.id, rp.report_id, rp.intent_id, rp.amount_minor, rp.currency, rp.status,
       rp.created_at, r.payment_status, r.plan
from ziina_payments rp
join reports r on r.id = rp.report_id
join auth.users u on u.id = r.user_id
where u.email = 'EMAIL_HERE'
order by rp.created_at desc;
```

### Step 2 — Issue refund in Ziina dashboard

1. Log in to the Ziina merchant dashboard.
2. Find the intent by `intent_id` from the query above.
3. Issue full refund (no partial refunds for the 24h guarantee).
4. Note the Ziina refund reference number.

### Step 3 — Update Supabase

```sql
-- Replace REPORT_ID with the report.id from step 1
update reports
set payment_status = 'refunded',
    updated_at = now()
where id = 'REPORT_ID';
```

**Important:** the `20260514_lock_down_paid_report_status.sql` migration prevents
client writes to `payment_status`. This `update` must be run via the Supabase
service-role client, NOT through the user-facing app.

### Step 4 — Confirm with user

Reply to the user with the standard refund-confirmation template (see
`launch-day-support.md` §3.2). Include:
- Confirmation of refund issuance.
- Expected timeline (5–10 business days for card refunds).
- Reference number from Ziina.

### Step 5 — Log it

Add a one-liner to a Supabase note table or your private support sheet:
- Date, user email, report ID, refund ref, reason (if given).
- This is needed for monthly reconciliation and to spot patterns (e.g.
  refund requests clustering around a specific lagna → indicates a domain bug).

## 3. What NOT to do

- **Do not delete the report row.** The refund is recorded against an
  existing report; deleting loses the audit trail.
- **Do not issue partial refunds.** The public policy is full refund or
  nothing. Partials confuse users and complicate accounting.
- **Do not chargeback.** If a user threatens a chargeback, refund immediately
  and document the request — chargebacks are more expensive and damage
  Ziina merchant trust.

## 4. Edge cases

- **User paid but never received a report.** Treat as a "technical issue"
  refund. Same SOP. No 24h limit applies.
- **User asks within 24h, but their report contains a hallucinated scripture
  verse or invented prediction.** Refund immediately AND escalate to a
  post-mortem in `docs/runbook/content-audit-checklist.md`.
- **Two refund requests on the same payment.** This is impossible if Step 3
  was completed correctly. If you see it, audit the prior refund and check
  the Ziina dashboard for the actual state.
