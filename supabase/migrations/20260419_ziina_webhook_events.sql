-- Pillar 1: Ziina webhook replay-protection table.
--
-- Ziina retries webhooks on non-2xx, so the handler MUST be idempotent.
-- We store every event_id we've seen and ignore duplicates.

create table if not exists public.ziina_webhook_events (
  id            uuid primary key default gen_random_uuid(),
  event_id      text unique not null,
  event_type    text,
  intent_id     text,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  process_error text
);

create index if not exists ziina_webhook_events_intent_id_idx
  on public.ziina_webhook_events (intent_id);

create index if not exists ziina_webhook_events_received_at_idx
  on public.ziina_webhook_events (received_at desc);

-- Service role only; no user-facing access.
alter table public.ziina_webhook_events enable row level security;

-- No policies = no access for anon/authenticated users. Only service role (bypass RLS) can read/write.
-- Explicit deny-all policy for documentation:
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ziina_webhook_events'
      and policyname = 'deny_all_non_service'
  ) then
    create policy deny_all_non_service on public.ziina_webhook_events
      for all using (false) with check (false);
  end if;
end $$;
