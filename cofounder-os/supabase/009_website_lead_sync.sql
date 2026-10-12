-- Phase 10: permit only trusted service-role inserts with explicit owner.
-- Ordinary authenticated users still receive their own auth.uid() as owner.
create or replace function public.founder_sales_lead_owner()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if (select auth.role()) = 'service_role' then
    if new.owner_id is null then
      raise exception 'owner_id required for service-role sales lead';
    end if;
  else
    new.owner_id := (select auth.uid());
  end if;
  return new;
end;
$$;
-- Avoid accidental duplicates from retried website requests.
alter table public.founder_sales_leads
  add column if not exists external_submission_id text;
create unique index if not exists founder_sales_leads_external_submission_unique
  on public.founder_sales_leads(owner_id, external_submission_id)
  where external_submission_id is not null;
