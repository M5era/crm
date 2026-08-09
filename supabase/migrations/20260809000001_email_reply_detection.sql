-- Reply detection: the mail we send, and the mail that comes back.
--
-- Matching an incoming reply to the right person is only a guess if the send
-- path forgets what it sent. So every outbound message banks its RFC 5322
-- Message-ID here; a reply carries that ID in In-Reply-To / References, which
-- turns matching into a lookup rather than fuzzy subject comparison.
--
-- The mailbox itself is read elsewhere (n8n over IMAP). This schema stores the
-- envelope and the verdict, never the connection.

create table public.email_messages (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,

  direction     text not null check (direction in ('outbound', 'inbound')),

  -- RFC 5322 Message-ID with the angle brackets stripped. Unique per
  -- workspace, which is what makes redelivery harmless: IMAP will hand us the
  -- same message again whenever a poll is interrupted mid-batch.
  message_id    text not null,
  in_reply_to   text,
  -- `references` is a reserved word in SQL, hence the name.
  reference_ids text[] not null default '{}',

  contact_id    uuid references public.contacts (id) on delete set null,
  lead_id       uuid references public.leads (id) on delete set null,

  subject       text,
  from_email    text,
  from_name     text,
  to_email      text,
  body          text,

  -- Inbound only. An out-of-office is not a reply and a bounce is the
  -- opposite of one; conflating either with interest is how a funnel starts
  -- lying to you.
  classification text check (classification in (
    'human',        -- a person actually wrote back
    'auto_reply',   -- out-of-office, vacation responder, mailing list
    'bounce',       -- delivery failed
    'unsubscribe'   -- asked to be left alone
  )),

  -- Which rung of the ladder found the contact, so a wrong match is
  -- explainable after the fact rather than mysterious.
  matched_by    text check (matched_by in ('message_id', 'email', 'none')),

  headers       jsonb,
  occurred_at   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create unique index email_messages_workspace_message_id_unique
  on public.email_messages (workspace_id, message_id);

create index email_messages_workspace_idx
  on public.email_messages (workspace_id, direction, occurred_at desc);

create index email_messages_contact_idx
  on public.email_messages (contact_id, occurred_at desc);

-- The unmatched queue: inbound mail we could not attribute to anybody. It is
-- a working list, so it gets its own small index rather than a table scan.
create index email_messages_unmatched_idx
  on public.email_messages (workspace_id, occurred_at desc)
  where direction = 'inbound' and contact_id is null;

comment on table public.email_messages is
  'Outbound sends and inbound replies. Outbound rows exist so inbound rows can be matched by Message-ID.';

alter table public.email_messages enable row level security;

create policy "crm members full access" on public.email_messages
  for all to authenticated
  using (private.is_crm_member()) with check (private.is_crm_member());

-- ------------------------------------------------------------- contacts
-- Three facts the outreach funnel needs and the lifecycle alone cannot carry:
-- a dead address, an explicit opt-out, and when they last wrote back.
alter table public.contacts add column bounced_at      timestamptz;
alter table public.contacts add column unsubscribed_at timestamptz;
alter table public.contacts add column last_reply_at   timestamptz;

comment on column public.contacts.bounced_at is
  'Last delivery failure. A bounced address should never be mailed again.';
comment on column public.contacts.unsubscribed_at is
  'They asked to stop. Honour this regardless of lifecycle.';
