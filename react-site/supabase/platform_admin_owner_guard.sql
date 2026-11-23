-- KATHYA platform-admin hardening: prevent the add-member path from demoting a workspace owner.
-- Apply after platform_admin_management.sql.
create or replace function public.platform_admin_manage_member(
 p_action text,p_org_id uuid,p_email text default null,p_user_id uuid default null,p_role text default null
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare actor uuid:=auth.uid(); target uuid; old_role text;
begin
 if actor is null or not exists(select 1 from public.admin_users where user_id=actor and role='owner') then
  raise exception 'Platform owner access required' using errcode='42501';
 end if;
 if not exists(select 1 from public.organizations where id=p_org_id) then
  raise exception 'Workspace not found';
 end if;
 if p_action='add' then
  if p_role not in ('admin','member','viewer') then
   raise exception 'Role must be admin, member or viewer';
  end if;
  select id into target from auth.users where lower(email)=lower(trim(p_email)) limit 1;
  if target is null then
   raise exception 'No registered KATHYA user exists with that email. Ask them to register first.';
  end if;
  select role into old_role from public.organization_members
   where organization_id=p_org_id and user_id=target;
  if old_role='owner' then
   raise exception 'The workspace owner role is protected and cannot be changed through member management.';
  end if;
  insert into public.organization_members(organization_id,user_id,role)
   values(p_org_id,target,p_role)
   on conflict(organization_id,user_id) do update set role=excluded.role;
  insert into public.platform_admin_audit_logs(actor_user_id,action,entity_type,entity_id,details)
   values(actor,'member.added_or_updated','organization_member',p_org_id,
    jsonb_build_object('user_id',target,'email',lower(trim(p_email)),'role',p_role));
 elsif p_action='role' then
  if p_role not in ('admin','member','viewer') then raise exception 'Invalid role'; end if;
  select role into old_role from public.organization_members
   where organization_id=p_org_id and user_id=p_user_id;
  if old_role is null then raise exception 'Member not found'; end if;
  if old_role='owner' then raise exception 'Workspace owner role cannot be changed'; end if;
  update public.organization_members set role=p_role
   where organization_id=p_org_id and user_id=p_user_id;
  insert into public.platform_admin_audit_logs(actor_user_id,action,entity_type,entity_id,details)
   values(actor,'member.role_changed','organization_member',p_org_id,
    jsonb_build_object('user_id',p_user_id,'from',old_role,'to',p_role));
 elsif p_action='remove' then
  select role into old_role from public.organization_members
   where organization_id=p_org_id and user_id=p_user_id;
  if old_role is null then raise exception 'Member not found'; end if;
  if old_role='owner' then raise exception 'Workspace owner cannot be removed'; end if;
  delete from public.organization_members where organization_id=p_org_id and user_id=p_user_id;
  insert into public.platform_admin_audit_logs(actor_user_id,action,entity_type,entity_id,details)
   values(actor,'member.removed','organization_member',p_org_id,
    jsonb_build_object('user_id',p_user_id));
 else
  raise exception 'Unsupported member action';
 end if;
 return jsonb_build_object('success',true);
end;
$$;
revoke all on function public.platform_admin_manage_member(text,uuid,text,uuid,text) from public,anon;
grant execute on function public.platform_admin_manage_member(text,uuid,text,uuid,text) to authenticated;
