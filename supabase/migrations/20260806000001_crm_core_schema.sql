-- Inflate AI CRM — core schema
-- Entities: stages -> leads -> (companies, contacts), plus activities and stage_events.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- stages
create table public.stages (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name        text not null,
  description text,
  position    integer not null,
  color       text not null default '#64748b',
  is_won      boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table public.stages is 'Ordered pipeline stages a lead moves through.';

-- ---------------------------------------------------------------- companies
create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  domain      text,
  website     text,
  industry    text,
  size        text,
  location    text,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index companies_name_idx on public.companies (lower(name));

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- contacts
create table public.contacts (
  id         uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name  text,
  email      text,
  phone      text,
  title      text,
  company_id uuid references public.companies (id) on delete set null,
  linkedin   text,
  source     text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_company_id_idx on public.contacts (company_id);
create index contacts_email_idx on public.contacts (lower(email));

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- leads
create table public.leads (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  company_id          uuid references public.companies (id) on delete set null,
  contact_id          uuid references public.contacts (id) on delete set null,
  stage_id            uuid not null references public.stages (id) on delete restrict,
  value               numeric(12, 2) not null default 0,
  status              text not null default 'open'
                        check (status in ('open', 'won', 'lost')),
  source              text,
  owner               text,
  expected_close_date date,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  closed_at           timestamptz
);

create index leads_stage_id_idx on public.leads (stage_id);
create index leads_status_idx on public.leads (status);
create index leads_company_id_idx on public.leads (company_id);
create index leads_contact_id_idx on public.leads (contact_id);
create index leads_created_at_idx on public.leads (created_at);

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- activities
create table public.activities (
  id         uuid primary key default gen_random_uuid(),
  type       text not null default 'note'
               check (type in ('note', 'call', 'email', 'meeting', 'task')),
  subject    text not null,
  body       text,
  lead_id    uuid references public.leads (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  author     text,
  created_at timestamptz not null default now()
);

create index activities_lead_id_idx on public.activities (lead_id);
create index activities_contact_id_idx on public.activities (contact_id);
create index activities_company_id_idx on public.activities (company_id);
create index activities_created_at_idx on public.activities (created_at desc);

-- ---------------------------------------------------------------- stage_events
-- Append-only log of every stage transition. Powers funnel conversion and
-- time-in-stage analytics.
create table public.stage_events (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references public.leads (id) on delete cascade,
  from_stage_id uuid references public.stages (id) on delete set null,
  to_stage_id   uuid not null references public.stages (id) on delete cascade,
  created_at    timestamptz not null default now()
);

create index stage_events_lead_id_idx on public.stage_events (lead_id);
create index stage_events_created_at_idx on public.stage_events (created_at);

-- Record the transition automatically so history can never drift from state.
create or replace function public.log_stage_event()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.stage_events (lead_id, from_stage_id, to_stage_id)
    values (new.id, null, new.stage_id);
  elsif new.stage_id is distinct from old.stage_id then
    insert into public.stage_events (lead_id, from_stage_id, to_stage_id)
    values (new.id, old.stage_id, new.stage_id);
  end if;
  return new;
end;
$$;

create trigger leads_log_stage_event
  after insert or update of stage_id on public.leads
  for each row execute function public.log_stage_event();

-- Keep status/closed_at consistent with the stage the lead sits in.
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

  if stage_is_won then
    new.status := 'won';
  elsif new.status = 'won' then
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

create trigger leads_sync_status
  before insert or update on public.leads
  for each row execute function public.sync_lead_status();
