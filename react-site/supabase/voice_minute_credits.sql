-- KATHYA AI monthly voice-minute credit wallet
-- Apply after schema.sql, saas_organizations.sql and platform_admin_management.sql.
-- Additive migration. Does not change existing customer billing rows or production by itself.

create table if not exists public.voice_credit_lots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source text not null check (source in ('purchased','promotional','admin_adjustment')),
  granted_minutes numeric(12,2) not null check (granted_minutes > 0),
  remaining_minutes numeric(12,2) not null check (remaining_minutes >= 0 and remaining_minutes <= granted_minutes),
  expires_at timestamptz not null,
  reference text,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists voice_credit_lots_org_expiry_idx
  on public.voice_credit_lots(organization_id, expires_at, created_at)
  where remaining_minutes > 0;

create table if not exists public.voice_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lot_id uuid references public.voice_credit_lots(id) on delete set null,
  entry_type text not null check (entry_type in ('grant','usage','refund','adjustment','expiry')),
  source text check (source in ('purchased','promotional','admin_adjustment','provider_usage')),
  minutes_delta numeric(12,2) not null check (minutes_delta <> 0),
  description text,
  reference text,
  metadata jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists voice_credit_ledger_org_created_idx
  on public.voice_credit_ledger(organization_id, created_at desc);

create table if not exists public.voice_usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'vapi',
  provider_event_id text not null,
  agent_id uuid,
  call_id text,
  minutes numeric(12,2) not null check (minutes > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table if not exists public.voice_usage_allocations (
  id uuid primary key default gen_random_uuid(),
  usage_event_id uuid not null references public.voice_usage_events(id) on delete cascade,
  lot_id uuid not null references public.voice_credit_lots(id) on delete restrict,
  minutes numeric(12,2) not null check (minutes > 0),
  created_at timestamptz not null default now(),
  unique (usage_event_id, lot_id)
);

alter table public.voice_credit_lots enable row level security;
alter table public.voice_credit_ledger enable row level security;
alter table public.voice_usage_events enable row level security;
alter table public.voice_usage_allocations enable row level security;

revoke all on public.voice_credit_lots, public.voice_credit_ledger,
  public.voice_usage_events, public.voice_usage_allocations from public, anon, authenticated;
grant all on public.voice_credit_lots, public.voice_credit_ledger,
  public.voice_usage_events, public.voice_usage_allocations to service_role;

-- Customer-safe balance: only a member of the requested organization can read it.
create or replace function public.customer_voice_credit_balance(p_org_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.is_organization_member(p_org_id) then
    raise exception 'Workspace access required' using errcode='42501';
  end if;
  select jsonb_build_object(
    'available_minutes', coalesce(sum(l.remaining_minutes) filter (where l.expires_at > now()),0),
    'expiring_minutes', coalesce(sum(l.remaining_minutes) filter (
      where l.expires_at > now() and l.expires_at <= now() + interval '7 days'),0),
    'next_expiry', min(l.expires_at) filter (where l.remaining_minutes > 0 and l.expires_at > now())
  ) into result
  from public.voice_credit_lots l where l.organization_id=p_org_id;
  return result;
end; $$;
revoke all on function public.customer_voice_credit_balance(uuid) from public, anon;
grant execute on function public.customer_voice_credit_balance(uuid) to authenticated;

-- Platform-owner view. Provider costs are intentionally not inferred from customer minutes.
create or replace function public.platform_admin_credit_overview()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users where user_id=auth.uid() and role='owner'
  ) then raise exception 'Platform owner access required' using errcode='42501'; end if;

  select jsonb_build_object(
    'totals', jsonb_build_object(
      'available_minutes', coalesce((select sum(remaining_minutes) from public.voice_credit_lots where expires_at>now()),0),
      'granted_minutes', coalesce((select sum(granted_minutes) from public.voice_credit_lots),0),
      'used_minutes', coalesce((select sum(minutes) from public.voice_usage_events),0),
      'expired_unspent_minutes', coalesce((select sum(remaining_minutes) from public.voice_credit_lots where expires_at<=now()),0)
    ),
    'organizations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',o.id,'name',o.name,'owner_email',u.email,'status',o.status,
        'available_minutes',coalesce((select sum(l.remaining_minutes) from public.voice_credit_lots l where l.organization_id=o.id and l.expires_at>now()),0),
        'expiring_minutes',coalesce((select sum(l.remaining_minutes) from public.voice_credit_lots l where l.organization_id=o.id and l.expires_at>now() and l.expires_at<=now()+interval '7 days'),0),
        'used_minutes',coalesce((select sum(e.minutes) from public.voice_usage_events e where e.organization_id=o.id),0),
        'next_expiry',(select min(l.expires_at) from public.voice_credit_lots l where l.organization_id=o.id and l.remaining_minutes>0 and l.expires_at>now())
      ) order by o.created_at desc)
      from public.organizations o left join auth.users u on u.id=o.owner_user_id
    ),'[]'::jsonb)
  ) into result;
  return result;
end; $$;
revoke all on function public.platform_admin_credit_overview() from public, anon;
grant execute on function public.platform_admin_credit_overview() to authenticated;

create or replace function public.platform_admin_credit_ledger(p_org_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users where user_id=auth.uid() and role='owner'
  ) then raise exception 'Platform owner access required' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',l.id,'entry_type',l.entry_type,'source',l.source,'minutes_delta',l.minutes_delta,
    'description',l.description,'reference',l.reference,'created_at',l.created_at
  ) order by l.created_at desc),'[]'::jsonb)
  into result from (
    select * from public.voice_credit_ledger
    where p_org_id is null or organization_id=p_org_id
    order by created_at desc limit 200
  ) l;
  return result;
end; $$;
revoke all on function public.platform_admin_credit_ledger(uuid) from public, anon;
grant execute on function public.platform_admin_credit_ledger(uuid) to authenticated;

-- Grants are owner-only. If expiry is omitted, the lot expires at the start of next UTC month.
create or replace function public.platform_admin_allocate_voice_minutes(
  p_org_id uuid, p_minutes numeric, p_source text, p_note text default null, p_reference text default null
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare lot public.voice_credit_lots%rowtype; expiry timestamptz;
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users where user_id=auth.uid() and role='owner'
  ) then raise exception 'Platform owner access required' using errcode='42501'; end if;
  if p_minutes is null or p_minutes<=0 or p_minutes>10000000 then raise exception 'Minutes must be greater than zero and within the allowed limit'; end if;
  if p_source not in ('purchased','promotional','admin_adjustment') then raise exception 'Invalid credit source'; end if;
  if not exists(select 1 from public.organizations where id=p_org_id and status='active') then
    raise exception 'Active customer workspace not found';
  end if;
  expiry := (date_trunc('month', now() at time zone 'UTC') + interval '1 month') at time zone 'UTC';
  insert into public.voice_credit_lots(organization_id,source,granted_minutes,remaining_minutes,expires_at,reference,note,created_by)
  values(p_org_id,p_source,p_minutes,p_minutes,expiry,nullif(trim(p_reference),''),nullif(trim(p_note),''),auth.uid())
  returning * into lot;
  insert into public.voice_credit_ledger(organization_id,lot_id,entry_type,source,minutes_delta,description,reference,actor_user_id)
  values(p_org_id,lot.id,'grant',p_source,p_minutes,coalesce(nullif(trim(p_note),''),'Minutes allocated by platform admin'),lot.reference,auth.uid());
  insert into public.platform_admin_audit_logs(actor_user_id,action,entity_type,entity_id,details)
  values(auth.uid(),'voice_minutes.allocated','voice_credit_lot',lot.id,
    jsonb_build_object('organization_id',p_org_id,'minutes',p_minutes,'source',p_source,'expires_at',expiry,'reference',lot.reference));
  return jsonb_build_object('lot_id',lot.id,'minutes',lot.granted_minutes,'source',lot.source,'expires_at',lot.expires_at);
end; $$;
revoke all on function public.platform_admin_allocate_voice_minutes(uuid,numeric,text,text,text) from public, anon;
grant execute on function public.platform_admin_allocate_voice_minutes(uuid,numeric,text,text,text) to authenticated;

-- Provider webhook/service role only. Idempotent per provider event; consumes earliest-expiring
-- unexpired lots first and fails closed if the customer does not have enough minutes.
create or replace function public.consume_voice_minutes(
  p_org_id uuid, p_minutes numeric, p_provider_event_id text,
  p_provider text default 'vapi', p_agent_id uuid default null, p_call_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare event_row public.voice_usage_events%rowtype; lot public.voice_credit_lots%rowtype;
  remaining numeric(12,2); take_minutes numeric(12,2); balance numeric(12,2);
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
  if p_org_id is null or p_minutes is null or p_minutes<=0 or nullif(trim(p_provider_event_id),'') is null then
    raise exception 'Organization, positive minutes and provider event ID are required';
  end if;
  perform 1 from public.organizations where id=p_org_id for update;
  if not found then raise exception 'Workspace not found'; end if;
  select * into event_row from public.voice_usage_events
    where provider=p_provider and provider_event_id=p_provider_event_id;
  if found then
    if event_row.organization_id<>p_org_id or event_row.minutes<>p_minutes then
      raise exception 'Provider event ID was already used for a different workspace or duration';
    end if;
    select coalesce(sum(l.remaining_minutes),0) into balance from public.voice_credit_lots l
      where l.organization_id=p_org_id and l.expires_at>now();
    return jsonb_build_object('duplicate',true,'available_minutes',balance);
  end if;
  select coalesce(sum(l.remaining_minutes),0) into balance from public.voice_credit_lots l
    where l.organization_id=p_org_id and l.expires_at>now();
  if balance < p_minutes then raise exception 'Insufficient voice minutes' using errcode='P0001'; end if;
  insert into public.voice_usage_events(organization_id,provider,provider_event_id,agent_id,call_id,minutes,metadata)
  values(p_org_id,p_provider,p_provider_event_id,p_agent_id,p_call_id,p_minutes,coalesce(p_metadata,'{}'::jsonb))
  returning * into event_row;
  remaining := p_minutes;
  for lot in
    select * from public.voice_credit_lots
    where organization_id=p_org_id and remaining_minutes>0 and expires_at>now()
    order by expires_at asc, created_at asc
    for update
  loop
    exit when remaining<=0;
    take_minutes := least(lot.remaining_minutes,remaining);
    update public.voice_credit_lots set remaining_minutes=remaining_minutes-take_minutes where id=lot.id;
    insert into public.voice_usage_allocations(usage_event_id,lot_id,minutes)
    values(event_row.id,lot.id,take_minutes);
    insert into public.voice_credit_ledger(organization_id,lot_id,entry_type,source,minutes_delta,description,reference,metadata)
    values(p_org_id,lot.id,'usage','provider_usage',-take_minutes,'Voice usage charged',p_provider_event_id,
      jsonb_build_object('provider',p_provider,'call_id',p_call_id,'agent_id',p_agent_id));
    remaining := remaining-take_minutes;
  end loop;
  select coalesce(sum(l.remaining_minutes),0) into balance from public.voice_credit_lots l
    where l.organization_id=p_org_id and l.expires_at>now();
  return jsonb_build_object('duplicate',false,'charged_minutes',p_minutes,'available_minutes',balance,'usage_event_id',event_row.id);
end; $$;
revoke all on function public.consume_voice_minutes(uuid,numeric,text,text,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.consume_voice_minutes(uuid,numeric,text,text,uuid,text,jsonb) to service_role;

-- Scheduled backend job can call this once per day to record and zero expired balances.
create or replace function public.expire_voice_minutes()
returns integer language plpgsql security definer set search_path=''
as $$
declare lot public.voice_credit_lots%rowtype; expired_count integer:=0;
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
  for lot in select * from public.voice_credit_lots where expires_at<=now() and remaining_minutes>0 for update
  loop
    update public.voice_credit_lots set remaining_minutes=0 where id=lot.id;
    insert into public.voice_credit_ledger(organization_id,lot_id,entry_type,source,minutes_delta,description,reference)
    values(lot.organization_id,lot.id,'expiry',lot.source,-lot.remaining_minutes,'Unused monthly voice minutes expired',lot.reference);
    expired_count:=expired_count+1;
  end loop;
  return expired_count;
end; $$;
revoke all on function public.expire_voice_minutes() from public, anon, authenticated;
grant execute on function public.expire_voice_minutes() to service_role;

comment on table public.voice_credit_lots is 'KATHYA purchased and promotional voice-minute grants with monthly expiry.';
comment on table public.voice_credit_ledger is 'Append-only audit ledger for KATHYA voice-minute credits and debits.';
comment on function public.consume_voice_minutes(uuid,numeric,text,text,uuid,text,jsonb) is 'Idempotent provider-side usage deduction; call only after verifying provider webhook authenticity and mapping call to organization.';

-- Stripe checkout webhook idempotency and purchased-minute grants.
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);
alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from public,anon,authenticated;
grant all on public.stripe_webhook_events to service_role;

create unique index if not exists voice_credit_lots_source_reference_uidx
  on public.voice_credit_lots(source,reference) where reference is not null;

create or replace function public.grant_purchased_voice_minutes(
  p_org_id uuid,p_minutes numeric,p_reference text,p_note text default null
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare lot public.voice_credit_lots%rowtype; expiry timestamptz;
begin
 if auth.role()<>'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
 if p_org_id is null or p_minutes is null or p_minutes<=0 or nullif(trim(p_reference),'') is null then
  raise exception 'Organization, positive minutes and unique purchase reference are required';
 end if;
 expiry := (date_trunc('month',now() at time zone 'UTC')+interval '1 month') at time zone 'UTC';
 insert into public.voice_credit_lots(organization_id,source,granted_minutes,remaining_minutes,expires_at,reference,note)
 values(p_org_id,'purchased',p_minutes,p_minutes,expiry,trim(p_reference),nullif(trim(p_note),''))
 on conflict(source,reference) where reference is not null do nothing
 returning * into lot;
 if lot.id is null then
  select * into lot from public.voice_credit_lots where source='purchased' and reference=trim(p_reference);
  if lot.organization_id<>p_org_id or lot.granted_minutes<>p_minutes then
   raise exception 'Purchase reference already exists with different credit details';
  end if;
  return jsonb_build_object('duplicate',true,'lot_id',lot.id,'expires_at',lot.expires_at);
 end if;
 insert into public.voice_credit_ledger(organization_id,lot_id,entry_type,source,minutes_delta,description,reference)
 values(p_org_id,lot.id,'grant','purchased',p_minutes,'Purchased voice minutes credited after verified payment',lot.reference);
 return jsonb_build_object('duplicate',false,'lot_id',lot.id,'minutes',p_minutes,'expires_at',expiry);
end; $$;
revoke all on function public.grant_purchased_voice_minutes(uuid,numeric,text,text) from public,anon,authenticated;
grant execute on function public.grant_purchased_voice_minutes(uuid,numeric,text,text) to service_role;
