-- Workspaces: two businesses in one CRM, sharing a login and nothing else.
-- Every record belongs to exactly one workspace. There is deliberately no
-- cross-workspace view — a contact of the photography business is invisible
-- from Inflate AI and vice versa.

create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  accent      text not null default '#7c6cff',
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

comment on table public.workspaces is
  'Separate businesses. All CRM data is scoped to exactly one workspace.';

insert into public.workspaces (slug, name, description, accent, position)
values
  ('inflate-ai',  'Inflate AI',  'AI automation agency',   '#7c6cff', 0),
  ('photography', 'Photography', 'Photography business',   '#22d3ee', 1);

-- ------------------------------------------------------- scope every table
alter table public.stages     add column workspace_id uuid references public.workspaces (id) on delete cascade;
alter table public.companies  add column workspace_id uuid references public.workspaces (id) on delete cascade;
alter table public.contacts   add column workspace_id uuid references public.workspaces (id) on delete cascade;
alter table public.leads      add column workspace_id uuid references public.workspaces (id) on delete cascade;
alter table public.activities add column workspace_id uuid references public.workspaces (id) on delete cascade;

-- Everything that exists today was built for the automation agency.
update public.stages     set workspace_id = (select id from public.workspaces where slug = 'inflate-ai');
update public.companies  set workspace_id = (select id from public.workspaces where slug = 'inflate-ai');
update public.contacts   set workspace_id = (select id from public.workspaces where slug = 'inflate-ai');
update public.leads      set workspace_id = (select id from public.workspaces where slug = 'inflate-ai');
update public.activities set workspace_id = (select id from public.workspaces where slug = 'inflate-ai');

alter table public.stages     alter column workspace_id set not null;
alter table public.companies  alter column workspace_id set not null;
alter table public.contacts   alter column workspace_id set not null;
alter table public.leads      alter column workspace_id set not null;
alter table public.activities alter column workspace_id set not null;

create index stages_workspace_idx     on public.stages (workspace_id);
create index companies_workspace_idx  on public.companies (workspace_id);
create index contacts_workspace_idx   on public.contacts (workspace_id);
create index leads_workspace_idx      on public.leads (workspace_id);
create index activities_workspace_idx on public.activities (workspace_id);

-- A stage key is only unique inside its own workspace: both businesses may
-- have a 'new' stage.
alter table public.stages drop constraint stages_key_key;
alter table public.stages add constraint stages_workspace_key_unique unique (workspace_id, key);

-- ------------------------------------------------------- photography stages
-- Shoot work does not move through "Qualified -> Proposal Sent"; it moves
-- through holding a date and getting paid. The last stage is the won one, so
-- revenue counts when the balance is settled rather than when a date is
-- pencilled in.
insert into public.stages (workspace_id, key, name, description, position, color, is_won)
select
  w.id, s.key, s.name, s.description, s.position, s.color, s.is_won
from public.workspaces w
cross join (values
  ('enquiry',   'Enquiry',        'New request in — not yet replied to.',                   0, '#184f95', false),
  ('quoted',    'Quote Sent',     'Packages and pricing shared, awaiting a reply.',          1, '#2a78d6', false),
  ('held',      'Date Held',      'Date pencilled in, waiting on the deposit.',              2, '#5598e7', false),
  ('booked',    'Booked',         'Deposit paid and the date is confirmed.',                 3, '#86b6ef', false),
  ('delivered', 'Delivered',      'Gallery delivered and the balance is paid.',              4, '#b7d3f6', true)
) as s(key, name, description, position, color, is_won)
where w.slug = 'photography';

-- ------------------------------------------------------------------- RLS
alter table public.workspaces enable row level security;

create policy "crm members full access" on public.workspaces
  for all to authenticated
  using (private.is_crm_member()) with check (private.is_crm_member());
