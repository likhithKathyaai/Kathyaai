# KATHYA AI SaaS database setup

Run these scripts in the **KATHYA AI Supabase project**, in this order. These scripts are committed to the development branch; committing them does not execute them against Supabase.

1. `schema.sql` — profiles, auth helpers and base application tables.
2. `workspace_records.sql` — customer workspace record store.
3. `saas_organizations.sql` — organizations, memberships, tenant RLS and signup provisioning.
4. `platform_admin_overview.sql` — owner-only platform overview.
5. `platform_admin_management.sql` — organization/member administration and audit log.
6. `platform_admin_owner_guard.sql` — prevents member-management upserts from demoting a workspace owner.
7. `voice_minute_credits.sql` — monthly purchased/promotional minute lots, ledger, usage deduction, expiry and Stripe purchase-credit grant.
8. `multitenant_product_core.sql` — customer business profiles, CRM contacts, campaigns, integrations, automations, structured extractions, subscription state and private knowledge storage.
9. `stripe_webhook_processing.sql` — retry-safe Stripe webhook event processing states and recovery.

## Environment variables used by server routes

Required for authenticated Vapi usage:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPI_PRIVATE_API_KEY`
- `KATHYA_VAPI_WEBHOOK_SECRET`

For daily credit expiry:
- `CRON_SECRET` (configured for the feature preview branch)
- Optional email delivery: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

For Stripe checkout (not configured until Stripe account/price IDs are supplied):
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_LAUNCH`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_SCALE`, `STRIPE_PRICE_ENTERPRISE`
- `STRIPE_PRICE_MINUTES_500`, `STRIPE_PRICE_MINUTES_2000`, `STRIPE_PRICE_MINUTES_5000`

## Vapi configuration

New assistants created from this branch receive the authenticated end-of-call webhook URL for their deployment. The webhook URL uses the active Vercel deployment host and `KATHYA_VAPI_WEBHOOK_SECRET`. Each customer must enter the Vapi phone-number ID assigned to that agent; the platform-wide phone number is not automatically shared between customers.

The webhook bills fractional minutes based on reported call duration. It does not yet enforce a zero-credit block before call initiation; that needs a Vapi pre-call control or telephony routing gate and must be tested before commercial use.

## Important security and launch notes

- Never put provider API keys, OAuth tokens, Stripe secrets or Supabase service-role keys in browser code or customer-visible JSON.
- Integration records store public metadata only. OAuth/token vaulting needs a server-side secret store.
- Knowledge files are stored in the private `kathya-knowledge` bucket under an organization UUID prefix. The preview processor extracts PDF, DOCX, TXT, Markdown and CSV text into the tenant's knowledge row; URL-only sources remain pending until safe website ingestion is added. Vapi agent deployment includes up to 12,000 characters from the tenant's latest ready knowledge documents.
- The Stripe webhook verifies signatures and is idempotent. Configure the webhook endpoint at `/api/billing/stripe-webhook` for checkout completion, subscription updates/deletion and failed invoices.
- Monthly credit expiry runs from the Vercel cron route `/api/cron/voice-credit-expiry`. Email notices are queued; delivery requires SMTP variables.
- Provider costs are recorded separately when Vapi reports a cost value. Do not treat customer minutes as provider spend.
- Test with separate company accounts and a Vapi test number before any production release.
