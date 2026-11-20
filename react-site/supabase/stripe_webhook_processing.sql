-- Add retry-safe processing states to Stripe webhook event idempotency.
-- Existing rows are historical completed events; new events start in processing state.
alter table public.stripe_webhook_events
  add column if not exists status text,
  add column if not exists attempts integer not null default 1,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists last_error text;

update public.stripe_webhook_events set status='processed' where status is null;
alter table public.stripe_webhook_events alter column status set default 'processing';
alter table public.stripe_webhook_events alter column status set not null;
alter table public.stripe_webhook_events alter column processed_at drop default;
alter table public.stripe_webhook_events alter column processed_at drop not null;

do $$
begin
  if not exists(select 1 from pg_constraint where conname='stripe_webhook_events_status_check') then
    alter table public.stripe_webhook_events add constraint stripe_webhook_events_status_check
      check(status in ('processing','processed','failed'));
  end if;
end $$;

create index if not exists stripe_webhook_events_status_updated_idx
  on public.stripe_webhook_events(status,updated_at);
