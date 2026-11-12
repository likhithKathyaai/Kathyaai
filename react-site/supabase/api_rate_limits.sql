-- Shared per-user API rate limits for cost-bearing actions.
create table if not exists public.kathya_api_rate_limits (
 user_id uuid not null references auth.users(id) on delete cascade,
 action text not null,
 window_start timestamptz not null,
 request_count integer not null default 0,
 primary key(user_id,action,window_start)
);
alter table public.kathya_api_rate_limits enable row level security;
revoke all on public.kathya_api_rate_limits from anon,authenticated;

create or replace function public.consume_kathya_rate_limit(p_action text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
 uid uuid := auth.uid();
 max_requests integer;
 window_seconds integer;
 bucket timestamptz;
 current_count integer;
begin
 if uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 case p_action
  when 'vapi_test_call' then max_requests:=3; window_seconds:=900;
  when 'vapi_assistant_create' then max_requests:=5; window_seconds:=3600;
  when 'whatsapp_send' then max_requests:=20; window_seconds:=3600;
  else raise exception 'Unsupported rate limit action' using errcode='22023';
 end case;
 bucket:=to_timestamp(floor(extract(epoch from now())/window_seconds)*window_seconds);
 insert into public.kathya_api_rate_limits(user_id,action,window_start,request_count)
 values(uid,p_action,bucket,1)
 on conflict(user_id,action,window_start)
 do update set request_count=public.kathya_api_rate_limits.request_count+1
 returning request_count into current_count;
 delete from public.kathya_api_rate_limits where user_id=uid and window_start<now()-interval '7 days';
 return current_count<=max_requests;
end;
$$;
revoke all on function public.consume_kathya_rate_limit(text) from public;
grant execute on function public.consume_kathya_rate_limit(text) to authenticated;
