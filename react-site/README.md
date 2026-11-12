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
