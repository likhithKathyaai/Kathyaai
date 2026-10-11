-- Phase 3: additive task execution fields. Safe for existing founder_items records.
alter table public.founder_items add column if not exists priority text not null default 'medium';
alter table public.founder_items add column if not exists due_date date;
alter table public.founder_items add column if not exists progress_status text not null default 'todo';
alter table public.founder_items add column if not exists execution_plan text not null default '';
update public.founder_items set progress_status='completed' where status='done' and progress_status<>'completed';
alter table public.founder_items drop constraint if exists founder_items_priority_check;
alter table public.founder_items add constraint founder_items_priority_check check(priority in ('low','medium','high'));
alter table public.founder_items drop constraint if exists founder_items_progress_status_check;
alter table public.founder_items add constraint founder_items_progress_status_check check(progress_status in ('todo','in_progress','blocked','completed'));
create index if not exists founder_items_task_due_idx on public.founder_items(owner_id,due_date) where kind='Tasks';
