-- School Grads internal portal. One shared master: entities (schools) + contacts.
-- Every other module references entities.id. One school = one record.

create table if not exists users (
  id            serial primary key,
  name          text not null,
  email         text not null unique,
  password_hash text not null,
  role          text not null default 'employee', -- admin|sales|ops|finance|employee
  active        boolean not null default true
);

create table if not exists entities (
  id               serial primary key,
  name             text not null,
  board            text,                          -- CBSE|ICSE|IGCSE|IB|State
  segment          text,                          -- k12|preschool
  city             text,
  state            text default 'Telangana',
  address          text,
  gstin            text,                          -- lives here only; invoices inherit
  pan              text,
  status           text not null default 'lead',  -- lead|pilot|active|renewal|churned
  owner_id         integer references users(id),
  pilot_start      date,
  pilot_end        date,
  success_criteria text,
  renewal_date     date,
  notes            text,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now()
);

create table if not exists contacts (
  id        serial primary key,
  entity_id integer not null references entities(id) on delete cascade,
  name      text not null,
  role_tag  text,                                 -- founder|principal|coordinator|accounts
  email     text,
  phone     text,
  notes     text,
  deleted_at timestamptz
);

create table if not exists programs (
  id         serial primary key,
  name       text not null,
  vendor     text,                                -- Code School Finland | Moomin | Kindiedays | Finnish Experience
  unit       text not null default 'per_school',  -- per_school|per_teacher|per_student
  unit_price numeric(12,2) not null default 0,
  sac_code   text,
  gst_rate   numeric(5,2) not null default 18,
  active     boolean not null default true
);

create table if not exists campaigns (
  id          serial primary key,
  name        text not null,
  status      text not null default 'active', -- active|completed
  start_date  date,
  end_date    date,
  budget      numeric(12,2),
  owner_id    integer references users(id),
  created_at  timestamptz not null default now()
);

create table if not exists campaign_entities (
  campaign_id integer not null references campaigns(id) on delete cascade,
  entity_id   integer not null references entities(id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (campaign_id, entity_id)
);

create table if not exists deals (
  id             serial primary key,
  entity_id      integer not null references entities(id) on delete cascade,
  title          text not null,
  stage          text not null default 'inquiry', -- inquiry|demo|pilot|proposal|negotiation|won|lost
  value          numeric(12,2) not null default 0,
  expected_close date,
  owner_id       integer references users(id),
  campaign_id    integer references campaigns(id) on delete set null,
  notes          text,
  deleted_at     timestamptz,
  created_at     timestamptz not null default now()
);

create table if not exists activities (
  id         serial primary key,
  entity_id  integer references entities(id) on delete cascade,
  deal_id    integer references deals(id) on delete cascade,
  kind       text not null default 'note',        -- note|call|meeting|email|task
  note       text not null,
  due_on     date,
  done_at    timestamptz,
  owner_id   integer references users(id),
  duration_minutes integer,
  outcome    text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists quotes (
  id         serial primary key,
  entity_id  integer not null references entities(id) on delete cascade,
  deal_id    integer references deals(id) on delete set null,
  number     text not null unique,
  quote_date date not null default current_date,
  status     text not null default 'draft',       -- draft|sent|accepted|rejected
  notes      text,
  deleted_at timestamptz
);

create table if not exists quote_items (
  id          serial primary key,
  quote_id    integer not null references quotes(id) on delete cascade,
  program_id  integer references programs(id),
  description text not null,
  qty         numeric(10,2) not null default 1,
  unit_price  numeric(12,2) not null default 0,
  gst_rate    numeric(5,2) not null default 18
);

create table if not exists invoices (
  id              serial primary key,
  entity_id       integer not null references entities(id) on delete restrict,
  quote_id        integer references quotes(id) on delete set null,
  number          text not null unique,           -- unique = a numbering race errors, not duplicates
  invoice_date    date not null default current_date,
  due_date        date,
  place_of_supply text not null default 'Telangana',
  intra_state     boolean not null default true,  -- true => CGST+SGST, false => IGST
  status          text not null default 'issued', -- issued|paid|cancelled
  notes           text,
  deleted_at      timestamptz
);

create table if not exists invoice_items (
  id          serial primary key,
  invoice_id  integer not null references invoices(id) on delete cascade,
  program_id  integer references programs(id),
  description text not null,
  sac_code    text,
  qty         numeric(10,2) not null default 1,
  unit_price  numeric(12,2) not null default 0,
  gst_rate    numeric(5,2) not null default 18
);

create table if not exists payments (
  id         serial primary key,
  invoice_id integer not null references invoices(id) on delete cascade,
  paid_on    date not null default current_date,
  amount     numeric(12,2) not null,
  mode       text,
  ref        text
);

create table if not exists expenses (
  id          serial primary key,
  vendor      text not null,
  bill_date   date not null default current_date,
  amount      numeric(12,2) not null,             -- excluding GST, so TDS base is straightforward
  category    text,                               -- royalty|trainer_travel|event|software|other
  tds_section text,                               -- 194J|194C|none
  tds_amount  numeric(12,2) not null default 0,
  entity_id   integer references entities(id) on delete set null,
  paid        boolean not null default false,
  notes       text
);

create table if not exists documents (
  id         serial primary key,
  entity_id  integer not null references entities(id) on delete cascade,
  parent_id  integer references documents(id) on delete cascade,
  is_folder  boolean not null default false,
  title      text not null,
  url        text,                                -- legacy or external link
  file_path  text,                                -- local file system path
  size       integer,
  mime_type  text,
  kind       text,                                -- contract|po|mou|other
  created_at timestamptz not null default now()
);

create table if not exists deliveries (
  id           serial primary key,
  entity_id    integer not null references entities(id) on delete cascade,
  invoice_id   integer references invoices(id) on delete set null,
  title        text not null,
  kind         text not null default 'session',   -- session|deliverable
  trainer      text,
  scheduled_on date,
  status       text not null default 'planned',   -- planned|done|blocked
  notes        text
);

create table if not exists employees (
  id                serial primary key,
  user_id           integer references users(id) on delete set null,
  name              text not null,
  designation       text,
  doj               date,
  pan               text,
  aadhaar           text,
  bank_account      text,
  bank_ifsc         text,
  ctc               numeric(12,2),
  uan               text,                         -- PF-ready field; no filing engine below 20 staff
  esic_no           text,                         -- ESI-ready field; not triggered below 10 staff
  emergency_contact text,
  cl_total          integer not null default 12,
  el_total          integer not null default 15,
  active            boolean not null default true
);

create table if not exists leave_requests (
  id          serial primary key,
  employee_id integer not null references employees(id) on delete cascade,
  kind        text not null default 'CL',         -- CL|SL|EL|LOP
  from_on     date not null,
  to_on       date not null,
  days        numeric(5,1) not null default 1,
  reason      text,
  status      text not null default 'pending',    -- pending|approved|rejected
  decided_by  integer references users(id)
);

create table if not exists attendance (
  id          serial primary key,
  employee_id integer not null references employees(id) on delete cascade,
  on_date     date not null default current_date,
  check_in    timestamptz,
  check_out   timestamptz,
  unique (employee_id, on_date)
);

create table if not exists payslips (
  id               serial primary key,
  employee_id      integer not null references employees(id) on delete cascade,
  period           date not null,                 -- first day of the month
  basic            numeric(12,2) not null default 0,
  hra              numeric(12,2) not null default 0,
  allowances       numeric(12,2) not null default 0,
  pt               numeric(12,2) not null default 0,
  tds              numeric(12,2) not null default 0,
  other_deductions numeric(12,2) not null default 0,
  unique (employee_id, period)
);

-- One row per (kind, financial year). The upsert in lib/seq.js is the lock, so two
-- people issuing an invoice in the same instant get different numbers instead of a
-- unique-violation crash. Counting rows would also reuse a number after a deletion.
create table if not exists counters (
  kind text not null,                              -- invoice|quote
  fy   text not null,                              -- "26-27"
  n    integer not null default 0,
  primary key (kind, fy)
);

-- Backfill from the numbers already issued ("SG/26-27/0007" -> fy "26-27", n 7),
-- so an existing database carries on from where it stopped rather than restarting at 1.
insert into counters (kind, fy, n)
select 'invoice', split_part(number, '/', 2), max(split_part(number, '/', 3)::int)
from invoices group by 2
on conflict do nothing;

insert into counters (kind, fy, n)
select 'quote', split_part(number, '/', 2), max(split_part(number, '/', 3)::int)
from quotes group by 2
on conflict do nothing;

-- Rounds per line, the same way lib/gst.js does, so the printed invoice and the
-- receivables view never disagree by a paisa.
create or replace view invoice_totals as
select i.id, i.entity_id, i.number, i.invoice_date, i.due_date, i.status, i.intra_state,
       coalesce(sum(round(ii.qty * ii.unit_price, 2)), 0) as taxable,
       coalesce(sum(round(ii.qty * ii.unit_price * ii.gst_rate / 100, 2)), 0) as tax,
       coalesce(sum(round(ii.qty * ii.unit_price, 2)) +
                sum(round(ii.qty * ii.unit_price * ii.gst_rate / 100, 2)), 0) as total,
       coalesce((select sum(p.amount) from payments p where p.invoice_id = i.id), 0) as paid
from invoices i
left join invoice_items ii on ii.invoice_id = i.id
group by i.id;

create index if not exists idx_deals_entity on deals(entity_id);
create index if not exists idx_activities_due on activities(due_on) where done_at is null;
-- The pipeline board asks every deal for its last activity and next open follow-up.
create index if not exists idx_activities_deal on activities(deal_id);
create index if not exists idx_activities_entity on activities(entity_id);
create index if not exists idx_invoices_entity on invoices(entity_id);
create index if not exists idx_deliveries_sched on deliveries(scheduled_on);

create table if not exists audit_logs (
  id          serial primary key,
  table_name  text not null,
  record_id   integer not null,
  user_id     integer references users(id),
  action      text not null,
  changes     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_logs_record on audit_logs(table_name, record_id);

alter table entities add column if not exists deleted_at timestamptz;
alter table contacts add column if not exists deleted_at timestamptz;
alter table deals add column if not exists deleted_at timestamptz;
alter table activities add column if not exists deleted_at timestamptz;
alter table quotes add column if not exists deleted_at timestamptz;
alter table invoices add column if not exists deleted_at timestamptz;

-- Add new columns to existing tables
alter table deals add column if not exists campaign_id integer references campaigns(id) on delete set null;

alter table activities add column if not exists duration_minutes integer;
alter table activities add column if not exists outcome text;

alter table documents alter column url drop not null;
alter table documents add column if not exists parent_id integer references documents(id) on delete cascade;
alter table documents add column if not exists is_folder boolean not null default false;
alter table documents add column if not exists file_path text;
alter table documents add column if not exists size integer;
alter table documents add column if not exists mime_type text;

-- Quote ownership: tracks which sales rep created/owns a quote
alter table quotes add column if not exists owner_id integer references users(id);

-- Enquiry kind for activities (logged from school detail view)
alter table activities add column if not exists contact_id integer references contacts(id) on delete set null;
