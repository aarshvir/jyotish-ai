-- Pillar 1: enable Supabase Realtime broadcasts on the `reports` table so the
-- client GeneratingScreen can subscribe to phase transitions instead of 3s polling.
--
-- Idempotent: wrapped in DO block so re-running is safe.

do $$
begin
  begin
    alter publication supabase_realtime add table public.reports;
  exception
    when duplicate_object then
      -- Already in the publication — nothing to do.
      null;
    when undefined_object then
      -- Publication doesn't exist yet on this project; create it and retry.
      create publication supabase_realtime for table public.reports;
  end;
end $$;

-- Ensure REPLICA IDENTITY is FULL so UPDATE payloads include all columns.
-- Without this, the client only receives the primary key on UPDATE events.
alter table public.reports replica identity full;
