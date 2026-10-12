-- Phase 6 fix: preserve owner for trusted server-side scheduled workflow inserts.
-- Ordinary authenticated users still cannot impersonate another founder.
create or replace function public.founder_workflow_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.role() = 'service_role' then
    if new.owner_id is null then
      raise exception 'owner_id required for service_role workflow insert';
    end if;
  else
    new.owner_id := auth.uid();
  end if;
  return new;
end;
$$;
-- Existing set_founder_workflow_owner trigger continues to call this function.
