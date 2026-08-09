-- Cold outreach, editable pipelines, and machine access.

-- ------------------------------------------------------- contact lifecycle
-- A thousand cold contacts must not become a thousand cards on the board.
-- Outreach is tracked here, on the person; a deal is only created once someone
-- actually replies. This mirrors how every CRM splits "contact" from
-- "deal/opportunity" — Salesforce calls the promotion "lead conversion".
alter table public.contacts
  add column lifecycle text not null default 'new'
    check (lifecycle in (
      'new',          -- imported, never contacted
      'contacted',    -- outreach sent, no response yet
      'replied',      -- responded, not yet qualified
      'qualified',    -- real opportunity — usually has a deal
      'unqualified',  -- not a fit, or asked to stop
      'customer'      -- has bought
    ));

create index contacts_lifecycle_idx on public.contacts (workspace_id, lifecycle);

-- When outreach last went out, so "not touched in N days" is answerable
-- without scanning the activity log.
alter table public.contacts add column last_contacted_at timestamptz;

-- ------------------------------------------------------------ deduplication
-- Importing the same list twice should update rows, not duplicate them.
-- Partial indexes: rows without an email or domain simply do not participate.
create unique index contacts_workspace_email_unique
  on public.contacts (workspace_id, lower(email))
  where email is not null;

create unique index companies_workspace_name_unique
  on public.companies (workspace_id, lower(name));

-- --------------------------------------------------------------- api keys
-- Only the hash is stored. The plaintext token is shown once, at creation,
-- and is unrecoverable afterwards — a leaked database does not leak keys.
create table public.api_keys (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  name          text not null,
  token_hash    text not null unique,
  token_prefix  text not null,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

create index api_keys_workspace_idx on public.api_keys (workspace_id);

alter table public.api_keys enable row level security;

create policy "crm members full access" on public.api_keys
  for all to authenticated
  using (private.is_crm_member()) with check (private.is_crm_member());

comment on table public.api_keys is
  'Bearer tokens for the import API. Scoped to one workspace. Hash only.';

-- ------------------------------------------------------------- import runs
-- A record of every bulk import so a bad CSV can be understood after the fact.
create table public.import_runs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  source       text not null,              -- 'csv' | 'api'
  entity       text not null,              -- 'contacts' | 'companies' | 'leads'
  created      integer not null default 0,
  updated      integer not null default 0,
  failed       integer not null default 0,
  errors       jsonb,
  author       text,
  created_at   timestamptz not null default now()
);

create index import_runs_workspace_idx
  on public.import_runs (workspace_id, created_at desc);

alter table public.import_runs enable row level security;

create policy "crm members full access" on public.import_runs
  for all to authenticated
  using (private.is_crm_member()) with check (private.is_crm_member());
