-- Stage moves are the source of truth for open/won; "lost" is an explicit,
-- separate decision that must survive field edits but is cleared by a stage move.
create or replace function public.sync_lead_status()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  stage_is_won boolean;
begin
  select s.is_won into stage_is_won
  from public.stages s
  where s.id = new.stage_id;

  if tg_op = 'UPDATE' and new.stage_id is distinct from old.stage_id then
    -- A drag across the board reopens a lost lead and wins/unwins as appropriate.
    new.status := case when stage_is_won then 'won' else 'open' end;
  elsif new.status = 'lost' then
    -- Explicitly marked lost: honour it regardless of which stage it sits in.
    new.status := 'lost';
  elsif stage_is_won then
    new.status := 'won';
  elsif tg_op = 'UPDATE' and old.status = 'won' then
    new.status := 'open';
  end if;

  if new.status in ('won', 'lost') then
    new.closed_at := coalesce(new.closed_at, now());
  else
    new.closed_at := null;
  end if;

  return new;
end;
$$;
