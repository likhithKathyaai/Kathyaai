# KATHYA AI React Website

Production-oriented React/Vite frontend.

## Local
npm install
npm run dev

## Build
npm run build

Deploy the contents of `dist/` to the website document root. Do not point Hostinger at the React source directory.

## Routes
/, /product, /solutions, /industries, /integrations, /pricing, /developers, /resources

The current production WordPress site should remain live until this React build is reviewed and the compiled output is deployed in a controlled cutover.


<!-- Vercel production trigger: kathya-react -->


## Customer workspace setup

The customer dashboard uses Supabase Auth and the `workspace_records` table. Apply these SQL files in the Supabase SQL Editor, in this order:

1. `supabase/schema.sql` — profiles, auth trigger, tenant tables and row-level security.
2. `supabase/workspace_records.sql` — customer workspace records and row-level security.

Configure these Vercel environment variables for the preview branch before testing integrations:

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key for the dashboard |
| `VAPI_PRIVATE_API_KEY` | Vapi private API key; server-side only |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key; server-side only, required for call-report webhook persistence |
| `KATHYA_VAPI_WEBHOOK_SECRET` | Long random secret shared between the Vapi webhook header and this server |
| `VAPI_PHONE_NUMBER_ID` | Default Vapi phone-number ID for outbound test calls (can be overridden per agent) |
| `KATHYA_VAPI_MODEL` | Optional model override; defaults to `gpt-6-luna` |
| `KATHYA_VAPI_WEBHOOK_URL` | Optional public webhook URL; otherwise the Vercel deployment URL is used |

Never prefix private keys or the service-role key with `VITE_`. Never place them in client-side code.

### Voice-agent workflow

1. Save an agent in **Create Agent**.
2. Add the agent's Vapi phone-number ID in its optional phone-number field, or set `VAPI_PHONE_NUMBER_ID` in Vercel.
3. Deploy the agent to Vapi. New assistants use GPT-6 Luna by default.
4. To receive completed call reports, set the webhook and service-role variables above, then redeploy the preview branch.
5. Use **Test call** with an E.164 number such as `+14155550123`. Calls may incur Vapi and telephony charges; only press the button when you intend to place a real call.
6. Completed Vapi end-of-call reports are saved to the customer's `conversations` records and appear in **AI Conversations** and the dashboard.

The `/api/health` endpoint reports whether required integration variables exist without returning their values. The dashboard uses this to display setup readiness.


## Platform admin setup

After applying the two customer-workspace SQL files above, apply:

3. `supabase/admin_dashboard.sql` — owner/admin-only platform aggregates and the founder owner assignment.

The migration assigns the existing `likhit@pamedlogtalent.com` auth account as the first owner if that account already exists. If the account is created later, re-run the final INSERT statement in the migration. The admin overview is read-only and uses a security-definer RPC that checks the admin role on every request.

## Preview integration readiness

The preview branch currently has the Supabase URL and publishable key configured. The following server-side credentials are separate setup requirements; add them directly in Vercel → Project → Settings → Environment Variables, scoped to Preview (and the `preview/dashboard-motion` branch where applicable). Never paste secrets into chat or commit them to GitHub.

| Variable | Needed for |
| --- | --- |
| `VAPI_PRIVATE_API_KEY` | Creating assistants and placing calls |
| `SUPABASE_SERVICE_ROLE_KEY` | Saving provider webhooks server-side |
| `KATHYA_VAPI_WEBHOOK_SECRET` | Authenticating Vapi webhooks |
| `VAPI_PHONE_NUMBER_ID` | Outbound calling |
| `FOUNDER_CRM_VERCEL_BYPASS_SECRET` | Allowing preview lead sync to reach the protected Founder CRM deployment |
| `SMTP_USER`, `SMTP_PASSWORD` | Email notifications for website leads |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Cloud API sending |
| `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | WhatsApp webhook verification and signature validation |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Billing checkout and signed billing events (not yet enabled) |

Optional: `LEAD_NOTIFICATION_EMAIL`, `KATHYA_VAPI_MODEL`, `KATHYA_VAPI_WEBHOOK_URL`.

The Founder CRM sync endpoint currently responds with HTTP 401 from the preview deployment because the preview bypass secret is not configured. Add the existing bypass secret directly in Vercel; do not share its value in chat.

## Launch gates

The site is not production-launch-ready until all of these are verified:

- [ ] Supabase SQL migrations applied and auth signup/sign-in/password recovery tested.
- [ ] Founder owner role verified at `/admin`.
- [ ] Vapi assistant creation and a consented test call completed using a real connected number.
- [ ] Vapi end-of-call webhook saved a transcript/summary to the correct customer workspace.
- [ ] Website lead submission succeeded through Founder CRM or SMTP.
- [ ] WhatsApp webhook verification, inbound persistence and outbound delivery tested with the approved Meta business number.
- [ ] Billing provider, plan IDs, tax settings, customer terms and webhook reconciliation approved and tested before any charge is enabled.
- [ ] Mobile/desktop browser checks, accessibility, SEO, security headers and production-domain cutover reviewed.

A green Vercel build confirms compilation and deployment only; it does not prove external provider credentials, database migrations, or real-world calls/messages are working. Production domain and production branch must remain unchanged until the owner explicitly approves launch.
