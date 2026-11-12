-- KATHYA AI WhatsApp Cloud API channel and inbox storage.
create table if not exists public.whatsapp_channels (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 phone_number_id text not null unique,
 display_phone_number text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists whatsapp_channels_user_idx on public.whatsapp_channels(user_id);
alter table public.whatsapp_channels enable row level security;
drop policy if exists whatsapp_channels_select_own on public.whatsapp_channels;
create policy whatsapp_channels_select_own on public.whatsapp_channels for select to authenticated using (user_id=auth.uid());
drop policy if exists whatsapp_channels_insert_own on public.whatsapp_channels;
create policy whatsapp_channels_insert_own on public.whatsapp_channels for insert to authenticated with check (user_id=auth.uid());
drop policy if exists whatsapp_channels_update_own on public.whatsapp_channels;
create policy whatsapp_channels_update_own on public.whatsapp_channels for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists whatsapp_channels_delete_own on public.whatsapp_channels;
create policy whatsapp_channels_delete_own on public.whatsapp_channels for delete to authenticated using (user_id=auth.uid());
grant select,insert,update,delete on public.whatsapp_channels to authenticated;

create table if not exists public.whatsapp_messages (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 channel_id uuid not null references public.whatsapp_channels(id) on delete cascade,
 wa_message_id text not null unique,
 direction text not null check (direction in ('inbound','outbound')),
 from_number text,
 to_number text,
 message_type text not null default 'text',
 message_text text,
 delivery_status text not null default 'received',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists whatsapp_messages_user_created_idx on public.whatsapp_messages(user_id,created_at desc);
create index if not exists whatsapp_messages_channel_created_idx on public.whatsapp_messages(channel_id,created_at desc);
alter table public.whatsapp_messages enable row level security;
drop policy if exists whatsapp_messages_select_own on public.whatsapp_messages;
create policy whatsapp_messages_select_own on public.whatsapp_messages for select to authenticated using (user_id=auth.uid());
drop policy if exists whatsapp_messages_insert_own on public.whatsapp_messages;
create policy whatsapp_messages_insert_own on public.whatsapp_messages for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.whatsapp_channels c where c.id=channel_id and c.user_id=auth.uid()));
grant select,insert on public.whatsapp_messages to authenticated;
