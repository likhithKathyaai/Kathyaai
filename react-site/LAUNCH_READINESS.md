# KATHYA AI launch readiness

This checklist is the release gate for the multi-tenant SaaS application. A successful Vercel build is not proof that Supabase migrations, OAuth, Vapi, Stripe, SMTP, tenant isolation or live call flows work end to end.

## Current development scope

- Application source: `react-site/`
- Development branch: `feature/platform-admin-management`
- Production branch: `kathya-react`
- Production must not receive unfinished platform features.
- The customer dashboard must show tenant-derived values only. Empty workspaces must show zero/empty states, not demo activity.
- Cloud Pivot Solutions is the first customer workspace; it is not a separate product.

## Database setup order

Run the SQL scripts in `react-site/supabase/README.md` against the intended Supabase project, in the listed order. Committing SQL does not apply it to a database. After applying, verify the tables, functions, policies and storage bucket exist.

The current set covers:
1. Profiles and base tables.
2. Workspace record storage.
3. Organizations, memberships, signup provisioning and tenant RLS.
4. Platform-owner overview.
5. Platform-owner customer/member management and audit log.
6. Workspace-owner role protection.
7. Voice-minute lots, ledger, usage deduction, expiry and Stripe idempotency.
8. Tenant CRM, knowledge metadata/storage, campaigns, integrations, automations, structured extractions and subscription state.

## Required external configuration

### Supabase
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the browser.
- `SUPABASE_SERVICE_ROLE_KEY` only in server-side Vercel environment variables.
- Configure the canonical Site URL and redirect allowlist for `https://kathyaai.com` and `https://www.kathyaai.com`.
- Assign the platform owner role in `admin_users` only after verifying the correct owner auth user.
- Confirm the SQL scripts have been applied to the same Supabase project used by the preview.

### Vapi
- `VAPI_PRIVATE_API_KEY` and `KATHYA_VAPI_WEBHOOK_SECRET` must be configured server-side.
- Configure a Vapi test phone number and a webhook for the preview deployment.
- Verify assistant creation, phone assignment, inbound call, end-of-call report, duplicate webhook delivery, call transcript/summary persistence and customer credit deduction.
- The current credit gate prevents deployment when a workspace has no balance. It does not yet guarantee that an already-deployed inbound number refuses every new call after its balance reaches zero. Treat this as a launch blocker until a pre-call/telephony enforcement mechanism is tested.
- Vapi's current documentation recommends Custom Credentials for webhook authentication. The code currently uses the legacy inline server URL secret; migrate to a Vapi credential ID before treating webhook security as final.

### Stripe
Checkout is not ready until the Stripe account supplies and verifies:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_LAUNCH`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_SCALE`, `STRIPE_PRICE_ENTERPRISE`
- `STRIPE_PRICE_MINUTES_500`, `STRIPE_PRICE_MINUTES_2000`, `STRIPE_PRICE_MINUTES_5000`

Configure the Stripe webhook at `/api/billing/stripe-webhook` for checkout completion, subscription updates/deletion and failed invoices. Use Stripe test mode first. Verify that a completed payment grants the correct workspace minutes once only, and that failed or duplicate events never grant additional credits.

### Email notifications
Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `SMTP_FROM` to enable credit-expiry email delivery. Without SMTP, expiry processing can run but customer emails are not delivered.

## Functional test matrix

Run against two separate test organizations with separate users. Do not use real customer data or a live payment method.

| Area | Required pass condition |
| --- | --- |
| Signup and onboarding | New user gets one private organization, completes profile setup and lands in that workspace. |
| Workspace isolation | User A cannot read, update, delete or infer User B's organization data through tables, RPCs, storage or APIs. |
| Roles | Owner/admin/member/viewer permissions match policy; viewer is read-only; workspace owner cannot be demoted or removed. |
| Agent builder | Draft saves, edits and deletes are tenant-scoped; unsupported languages/voice settings are rejected clearly. |
| Vapi | Assistant deploy, phone attach, inbound/outbound test, webhook authentication, retries and idempotent usage posting all pass. |
| CRM | Contacts create, read, update, search and delete work within one organization only. |
| Knowledge | File upload, private storage policy, extraction, indexing, agent retrieval and document deletion work. Pending files must not be represented as indexed/ready. |
| Automations | Draft creation, activation, trigger validation, action authorization, execution logs, retries and failure handling work. |
| Campaigns | Drafting, audience validation, scheduling, consent/suppression checks, provider send and delivery reporting work. |
| Billing | Stripe test checkout, subscription lifecycle, invoice failure, minute top-up, duplicate events and refunds reconcile correctly. |
| Credits | Earliest-expiring lots are consumed first; insufficient balance blocks new calls; expiry and notifications are idempotent. |
| Operations | Error monitoring, audit log, backups/restore, rate limits, secrets, retention and incident response are verified. |

## Release rule

Do not promote to production while any item above is unverified, any required secret/price ID is missing, any tenant-isolation test fails, or any customer can incur provider costs without the intended credit controls. A preview deployment can be marked READY while its external integrations remain unconfigured.
