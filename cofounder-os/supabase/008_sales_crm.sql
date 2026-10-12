-- Phase 9: Founder-only sales CRM records and follow-up drafts
create table if not exists public.founder_sales_leads(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 company text not null check(char_length(company) between 1 and 160),
 contact_name text not null default '',
 email text not null default '',
 source text not null default '',
 stage text not null default 'new' check(stage in ('new','contacted','qualified','demo','proposal','won','lost')),
 fit text not null default 'unknown' check(fit in ('unknown','low','medium','high')),
 intent text not null default 'unknown' check(intent in ('unknown','low','medium','high')),
 engagement text not null default 'none' check(engagement in ('none','replied','demo_requested')),
 estimated_value_usd numeric(12,2) not null default 0 check(estimated_value_usd>=0),
 follow_up_on date,
 last_contacted_on date,
 notes text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists founder_sales_leads_owner_followup_idx on public.founder_sales_leads(owner_id,follow_up_on);
alter table public.founder_sales_leads enable row level security;
create policy "Founder reads own sales leads" on public.founder_sales_leads for select to authenticated using(owner_id=auth.uid() and public.is_approved_founder());
create policy "Founder inserts own sales leads" on public.founder_sales_leads for insert to authenticated with check(owner_id=auth.uid() and public.is_approved_founder());
create policy "Founder updates own sales leads" on public.founder_sales_leads for update to authenticated using(owner_id=auth.uid() and public.is_approved_founder()) with check(owner_id=auth.uid() and public.is_approved_founder());
create policy "Founder deletes own sales leads" on public.founder_sales_leads for delete to authenticated using(owner_id=auth.uid() and public.is_approved_founder());
create or replace function public.founder_sales_lead_owner() returns trigger language plpgsql security invoker set search_path='' as $$begin new.owner_id:=auth.uid();return new;end$$;
drop trigger if exists set_founder_sales_lead_owner on public.founder_sales_leads;
create trigger set_founder_sales_lead_owner before insert on public.founder_sales_leads for each row execute function public.founder_sales_lead_owner();
