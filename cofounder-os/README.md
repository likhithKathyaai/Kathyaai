# KATHYA Co-Founder OS — Phase 1

Separate founder-only Vite/React application. This is NOT the customer-facing KATHYA dashboard.

## Modules
- Founder email/password authentication using Supabase Auth
- Overview with live record counts
- Tasks, Ideas, Campaigns, Leads: create, list, mark done, delete
- Persistent records with per-user RLS plus founder email allowlist
- Mobile responsive navigation

## Run locally
1. `cd cofounder-os && npm install`
2. Create `.env.local` from `.env.example`, using your **dedicated** Supabase project's URL and publishable key. Never expose a service-role key.
3. In that Supabase project's SQL editor, execute `supabase/001_founder_os.sql`.
4. Insert your verified founder email into `public.founder_allowlist` from the SQL editor.
5. In Supabase Authentication, turn OFF public self-signups after provisioning the founder account. Confirm email verification is enabled.
6. `npm run dev`; test sign-in and CRUD with your approved account. Test an unapproved account cannot read or write.

## Deployment
Create a **new** Vercel project, with root directory `cofounder-os`, build command `npm run build`, output directory `dist`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the new project. Set Supabase Auth Site URL and allowed redirect URLs to your new founder-only domain. Do not reuse the public KATHYA deployment.

## Security
This is a Phase 1 MVP. A private URL is not access control: RLS and the founder allowlist are the authorization boundary. Do not store customer secrets, credentials, or regulated data in this MVP. Production hardening should include MFA, audit logging, backups, rate limits, and independent security tests. The signup UI is for initial provisioning; disable public signups for production.
