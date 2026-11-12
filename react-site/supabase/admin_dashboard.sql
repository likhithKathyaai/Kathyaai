-- KATHYA AI admin overview. Apply after schema.sql and workspace_records.sql.
-- Idempotent migration; only explicitly assigned owner/admin users can read platform-wide aggregates.
create or replace function public.get_kathya_admin_overview()
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
    select 1 from public.admin_users
    where user_id = auth.uid() and role in ('owner','admin')
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'customers', (select count(*) from public.profiles),
    'agents', (select count(*) from public.workspace_records where category = 'agents'),
    'deployedAgents', (select count(*) from public.workspace_records where category = 'agents' and nullif(payload->>'vapiAssistantId','') is not null),
    'conversations', (select count(*) from public.workspace_records where category = 'conversations'),
    'leads', (select count(*) from public.workspace_records where category = 'leads'),
    'recentCustomers', (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      from (
        select id, email, business_name, created_at
        from public.profiles order by created_at desc limit 8
      ) x
    ),
    'recentConversations', (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      from (
        select wr.id, wr.title, wr.payload->>'summary' as summary,
               wr.created_at, p.email as customer_email
        from public.workspace_records wr
        left join public.profiles p on p.id = wr.user_id
        where wr.category = 'conversations'
        order by wr.created_at desc limit 8
      ) x
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_kathya_admin_overview() from public;
grant execute on function public.get_kathya_admin_overview() to authenticated;

-- Assign the first platform owner to the existing founder account, if it already exists.
-- Safe to re-run; if the account has not been created yet, this inserts nothing.
insert into public.admin_users(user_id, role)
select id, 'owner'
from auth.users
where lower(email) = lower('likhit@pamedlogtalent.com')
on conflict (user_id) do update set role = 'owner';
