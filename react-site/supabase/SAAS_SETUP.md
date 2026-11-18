# KATHYA AI SaaS organization foundation

This migration upgrades the existing per-account workspace model into an organization-scoped foundation without creating a separate Cloud Pivot product.

## Files

- `supabase/schema.sql` — existing authentication, profiles, agents, conversations, billing and platform-admin tables.
- `supabase/workspace_records.sql` — existing customer workspace records.
- `supabase/saas_organizations.sql` — new organizations, memberships, default-workspace provisioning, organization IDs, and organization-based row-level security.

## Apply in Supabase

1. Open the Supabase project currently used by the KATHYA AI React application.
2. Open **SQL Editor**.
3. Confirm the existing `schema.sql` and `workspace_records.sql` migrations have already been applied. Do not rerun them blindly on a production database.
4. Open `saas_organizations.sql` from this folder, copy the complete SQL, and run it once.
5. Review the SQL Editor result. Stop if any statement reports an error; do not continue to frontend testing until it is resolved.
6. In the Supabase SQL Editor, assign the platform owner only after the owner's verified Auth account exists. Replace the email with the actual KATHYA platform-owner email:

```sql
insert into public.admin_users(user_id, role)
select id, 'owner'
from auth.users
where lower(email) = lower('OWNER_EMAIL')
on conflict (user_id) do update set role = 'owner';
```

## Verify the migration

Run:

```sql
select count(*) as organizations from public.organizations;
select count(*) as memberships from public.organization_members;
select count(*) as unassigned_workspace_records
from public.workspace_records
where organization_id is null;
select count(*) as unassigned_agents
from public.agents
where organization_id is null;
```

For existing users, each account receives a default organization and an owner membership. Existing agent, conversation, billing and workspace-record rows are backfilled to that organization. New workspace records receive the signed-in user's default organization through a database trigger.

## Security and current scope

- Organization membership, not a client-supplied organization ID, controls row access.
- Owner, admin and member roles can manage workspace operational records; viewer is read-only.
- Customer browser clients cannot create memberships or change roles. Invitations and membership changes must be implemented through trusted server-side endpoints in a later phase.
- Billing data remains read-only to customer clients.
- The current application chooses the user's first/default organization. Organization switching and invitations are not part of this first migration.
- Do not place Supabase service-role keys, Vapi keys, telephony secrets or payment secrets in `VITE_*` variables or browser code.

## Deployment

This commit is on `kathya-react`. It does not change the production domain, Supabase database, Vapi configuration or Vercel environment variables by itself. Apply the SQL manually only after reviewing the target Supabase project. Validate the app on a preview deployment before any production cutover.
