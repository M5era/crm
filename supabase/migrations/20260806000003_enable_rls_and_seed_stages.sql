-- Row level security. Anonymous visitors get nothing; the login page is the gate.
-- (Migration 20260806000005 narrows these policies further to an allowlist.)
alter table public.stages       enable row level security;
alter table public.companies    enable row level security;
alter table public.contacts     enable row level security;
alter table public.leads        enable row level security;
alter table public.activities   enable row level security;
alter table public.stage_events enable row level security;

create policy "authenticated full access" on public.stages
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.companies
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.contacts
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.leads
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.activities
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.stage_events
  for all to authenticated using (true) with check (true);

-- Seed the pipeline definition only. No sample leads, contacts or companies.
insert into public.stages (key, name, description, position, color, is_won)
values
  ('new',       'New Lead',      'Captured but not yet worked — needs a first touch.',        0, '#64748b', false),
  ('contacted', 'Contacted',     'Outreach sent, conversation opened, awaiting a reply.',     1, '#38bdf8', false),
  ('qualified', 'Qualified',     'Discovery done — need, budget and timing are confirmed.',   2, '#a78bfa', false),
  ('proposal',  'Proposal Sent', 'Scope and pricing delivered, waiting on a decision.',       3, '#fbbf24', false),
  ('won',       'Closed Won',    'Signed client. Counts toward booked revenue.',              4, '#34d399', true)
on conflict (key) do nothing;
