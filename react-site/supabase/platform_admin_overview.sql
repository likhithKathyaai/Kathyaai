-- KATHYA AI platform-owner control plane (Phase 2)
-- Apply after schema.sql and saas_organizations.sql.
-- Read-only overview: only the explicitly assigned platform owner can call it.

create or replace function public.platform_admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
      and au.role = 'owner'
  ) then
    raise exception 'Platform owner access required'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'metrics', jsonb_build_object(
      'organizations', (select count(*) from public.organizations),
      'active_organizations', (select count(*) from public.organizations where status = 'active'),
      'suspended_organizations', (select count(*) from public.organizations where status = 'suspended'),
      'agents', (select count(*) from public.agents),
      'conversations', (select count(*) from public.conversations)
    ),
    'organizations', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'name', o.name,
          'slug', o.slug,
          'status', o.status,
          'plan', o.plan,
          'owner_email', owner_user.email,
          'members', (select count(*) from public.organization_members om where om.organization_id = o.id),
          'agents', (select count(*) from public.agents a where a.organization_id = o.id),
          'conversations', (select count(*) from public.conversations c where c.organization_id = o.id),
          'created_at', o.created_at
        )
        order by o.created_at desc
      )
      from public.organizations o
      left join auth.users owner_user on owner_user.id = o.owner_user_id
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.platform_admin_overview() from public, anon;
grant execute on function public.platform_admin_overview() to authenticated;

comment on function public.platform_admin_overview() is
  'Read-only KATHYA platform overview restricted to the platform owner role.';
