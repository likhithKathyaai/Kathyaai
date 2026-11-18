-- KATHYA AI Platform Admin Management (Phase 3)
-- Owner-only mutations; no service-role key is exposed to the browser.
create table if not exists public.platform_admin_audit_logs (
 id uuid primary key default gen_random_uuid(),
 actor_user_id uuid not null references auth.users(id) on delete restrict,
 action text not null, entity_type text not null, entity_id uuid,
 details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
alter table public.platform_admin_audit_logs enable row level security;
revoke all on public.platform_admin_audit_logs from public, anon, authenticated;

create or replace function public.platform_admin_manage_organization(
 p_action text,p_org_id uuid default null,p_name text default null,p_slug text default null,
 p_owner_email text default null,p_plan text default null,p_status text default null
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare actor uuid:=auth.uid(); owner_id uuid; org public.organizations%rowtype;
begin
 if actor is null or not exists(select 1 from public.admin_users where user_id=actor and role='owner') then
  raise exception 'Platform owner access required' using errcode='42501';
 end if;
 if p_action='create' then
  if nullif(trim(p_name),'') is null or nullif(trim(p_slug),'') is null or nullif(trim(p_owner_email),'') is null then raise exception 'Name, slug and owner email are required'; end if;
  if p_plan not in ('launch','growth','scale','enterprise') then raise exception 'Invalid plan'; end if;
  select id into owner_id from auth.users where lower(email)=lower(trim(p_owner_email)) limit 1;
  if owner_id is null then raise exception 'No registered KATHYA user exists with that email. Ask them to register first.'; end if;
  insert into public.organizations(name,slug,owner_user_id,plan,status) values(trim(p_name),lower(trim(p_slug)),owner_id,p_plan,'active') returning * into org;
  insert into public.organization_members(organization_id,user_id,role) values(org.id,owner_id,'owner');
  insert into public.platform_admin_audit_logs(actor_user_id,action,entity_type,entity_id,details)
  values(actor,'organization.created','organization',org.id,jsonb_build_object('name',org.name,'owner_email',lower(trim(p_owner_email)),'plan',org.plan));
 elsif p_action='update' then
  if p_org_id is null then raise exception 'Workspace ID is required'; end if;
  if p_plan is not null and p_plan not in ('launch','growth','scale','enterprise') then raise exception 'Invalid plan'; end if;
  if p_status is not null and p_status not in ('active','suspended','closed') then raise exception 'Invalid status'; end if;
  update public.organizations set name=coalesce(nullif(trim(p_name),''),name),plan=coalesce(p_plan,plan),status=coalesce(p_status,status),updated_at=now()
   where id=p_org_id returning * into org;
  if not found then raise exception 'Workspace not found'; end if;
  insert into public.platform_admin_audit_logs(actor_user_id,action,entity_type,entity_id,details)
  values(actor,'organization.updated','organization',org.id,jsonb_build_object('name',org.name,'plan',org.plan,'status',org.status));
 else raise exception 'Unsupported organization action';
 end if;
 return jsonb_build_object('id',org.id,'name',org.name,'slug',org.slug,'plan',org.plan,'status',org.status);
end; $$;
revoke all on function public.platform_admin_manage_organization(text,uuid,text,text,text,text,text) from public,anon;
grant execute on function public.platform_admin_manage_organization(text,uuid,text,text,text,text,text) to authenticated;

create or replace function public.platform_admin_list_members(p_org_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.admin_users where user_id=auth.uid() and role='owner') then raise exception 'Platform owner access required' using errcode='42501'; end if;
 if not exists(select 1 from public.organizations where id=p_org_id) then raise exception 'Workspace not found'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'email',u.email,'role',m.role,'created_at',m.created_at)
  order by case m.role when 'owner' then 0 when 'admin' then 1 when 'member' then 2 else 3 end,u.email),'[]'::jsonb)
 into result from public.organization_members m join auth.users u on u.id=m.user_id where m.organization_id=p_org_id;
 return result;
end; $$;
revoke all on function public.platform_admin_list_members(uuid) from public,anon;
grant execute on function public.platform_admin_list_members(uuid) to authenticated;

create or replace function public.platform_admin_manage_member(
 p_action text,p_org_id uuid,p_email text default null,p_user_id uuid default null,p_role text default null
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare actor uuid:=auth.uid(); target uuid; old_role text;
begin
 if actor is null or not exists(select 1 from public.admin_users where user_id=actor and role='owner') then raise exception 'Platform owner access required' using errcode='42501'; end if;
 if not exists(select 1 from public.organizations where id=p_org_id) then raise exception 'Workspace not found'; end if;
 if p_action='add' then
  if p_role not in ('admin','member','viewer') then raise exception 'Role must be admin, member or viewer'; end if;
  select id into target from auth.users where lower(email)=lower(trim(p_email)) limit 1;
  if target is null then raise exception 'No registered KATHYA user exists with that email. Ask them to register first.'; end if;
  insert into public.organization_members(organization_id,user_id,role) values(p_org_id,target,p_role)
  on conflict(organization_id,user_id) do update set role=excluded.role;
  insert into public.platform_admin_audit_logs(actor_user_id,action,entity_type,entity_id,details)
  values(actor,'member.added_or_updated','organization_member',p_org_id,jsonb_build_object('user_id',target,'email',lower(trim(p_email)),'role',p_role));
 elsif p_action='role' then
  if p_role not in ('admin','member','viewer') then raise exception 'Invalid role'; end if;
  select role into old_role from public.organization_members where organization_id=p_org_id and user_id=p_user_id;
  if old_role is null then raise exception 'Member not found'; end if;
  if old_role='owner' then raise exception 'Workspace owner role cannot be changed'; end if;
  update public.organization_members set role=p_role where organization_id=p_org_id and user_id=p_user_id;
  insert into public.platform_admin_audit_logs(actor_user_id,action,entity_type,entity_id,details)
  values(actor,'member.role_changed','organization_member',p_org_id,jsonb_build_object('user_id',p_user_id,'from',old_role,'to',p_role));
 elsif p_action='remove' then
  select role into old_role from public.organization_members where organization_id=p_org_id and user_id=p_user_id;
  if old_role is null then raise exception 'Member not found'; end if;
  if old_role='owner' then raise exception 'Workspace owner cannot be removed'; end if;
  delete from public.organization_members where organization_id=p_org_id and user_id=p_user_id;
  insert into public.platform_admin_audit_logs(actor_user_id,action,entity_type,entity_id,details)
  values(actor,'member.removed','organization_member',p_org_id,jsonb_build_object('user_id',p_user_id));
 else raise exception 'Unsupported member action';
 end if;
 return jsonb_build_object('success',true);
end; $$;
revoke all on function public.platform_admin_manage_member(text,uuid,text,uuid,text) from public,anon;
grant execute on function public.platform_admin_manage_member(text,uuid,text,uuid,text) to authenticated;

create or replace function public.platform_admin_audit_log()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.admin_users where user_id=auth.uid() and role='owner') then raise exception 'Platform owner access required' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'action',x.action,'entity_type',x.entity_type,'entity_id',x.entity_id,
  'details',x.details,'created_at',x.created_at,'actor_email',u.email) order by x.created_at desc),'[]'::jsonb)
 into result from (select * from public.platform_admin_audit_logs order by created_at desc limit 100) x
 left join auth.users u on u.id=x.actor_user_id;
 return result;
end; $$;
revoke all on function public.platform_admin_audit_log() from public,anon;
grant execute on function public.platform_admin_audit_log() to authenticated;
comment on table public.platform_admin_audit_logs is 'Audit trail for privileged KATHYA platform-owner actions.';
