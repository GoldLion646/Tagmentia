-- Enable needed extensions
create extension if not exists pgcrypto;
create extension if not exists pg_cron;

-- Pending signups table
create table if not exists public.pending_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  otp_hash text not null,
  otp_expires_at timestamptz not null,
  attempt_count int not null default 0,
  request_count int not null default 1,
  created_at timestamptz not null default now(),
  last_sent_at timestamptz not null default now(),
  ip_hash text
);

-- Normalize and lowercase emails on write
create or replace function public.normalize_email()
returns trigger as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Attach normalization trigger
create or replace trigger trg_pending_signups_normalize_email
before insert or update on public.pending_signups
for each row execute function public.normalize_email();

-- Case-insensitive uniqueness on email
create unique index if not exists pending_signups_email_unique_idx
  on public.pending_signups ((lower(email)));

-- Helpful indexes
create index if not exists idx_pending_signups_expires_at on public.pending_signups (otp_expires_at);
create index if not exists idx_pending_signups_created_at on public.pending_signups (created_at);
create index if not exists idx_pending_signups_last_sent on public.pending_signups (last_sent_at);

-- Enable RLS (service role will bypass)
alter table public.pending_signups enable row level security;

-- Hourly cleanup job: purge old/expired rows
select cron.schedule(
  'purge-pending-signups-hourly',
  '0 * * * *',
  $$
  delete from public.pending_signups
  where created_at < now() - interval '24 hours'
     or otp_expires_at < now() - interval '1 hour';
  $$
);
