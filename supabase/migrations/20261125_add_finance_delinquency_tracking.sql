-- Applied to production on 2026-11-25.
-- Adds delinquency tracking to finance without treating it as an expense.

alter table public.finance_transactions
  add column if not exists unit_id uuid null references public.units(id) on delete set null,
  add column if not exists is_delinquency boolean not null default false;

create index if not exists finance_transactions_delinquency_idx
  on public.finance_transactions (condominium_id, is_delinquency, status, due_date);

create index if not exists finance_transactions_unit_id_idx
  on public.finance_transactions (unit_id);

alter table public.finance_transactions
  drop constraint if exists finance_transactions_delinquency_kind_check;

alter table public.finance_transactions
  add constraint finance_transactions_delinquency_kind_check
  check (is_delinquency = false or kind = 'income');

create table if not exists public.finance_collection_contacts (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  transaction_id uuid not null references public.finance_transactions(id) on delete cascade,
  contact_at timestamptz not null default now(),
  channel text not null default 'whatsapp'
    check (channel in ('whatsapp','phone','email','in_person','other')),
  note text not null check (length(trim(note)) between 1 and 4000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists finance_collection_contacts_transaction_idx
  on public.finance_collection_contacts (transaction_id, contact_at desc);

create index if not exists finance_collection_contacts_condo_idx
  on public.finance_collection_contacts (condominium_id, contact_at desc);

alter table public.finance_collection_contacts enable row level security;

revoke all on table public.finance_collection_contacts from anon;
revoke all on table public.finance_collection_contacts from authenticated;
grant select, insert on table public.finance_collection_contacts to authenticated;

drop policy if exists finance_collection_contacts_select_review on public.finance_collection_contacts;
create policy finance_collection_contacts_select_review
on public.finance_collection_contacts
for select
to authenticated
using (
  (select private.has_condo_role(finance_collection_contacts.condominium_id, array['syndic','council']))
);

drop policy if exists finance_collection_contacts_insert_syndic on public.finance_collection_contacts;
create policy finance_collection_contacts_insert_syndic
on public.finance_collection_contacts
for insert
to authenticated
with check (
  (select private.has_condo_role(finance_collection_contacts.condominium_id, array['syndic']))
  and created_by = (select auth.uid())
  and exists (
    select 1
    from public.finance_transactions ft
    where ft.id = finance_collection_contacts.transaction_id
      and ft.condominium_id = finance_collection_contacts.condominium_id
      and ft.is_delinquency = true
  )
);

drop trigger if exists audit_finance_collection_contacts on public.finance_collection_contacts;
create trigger audit_finance_collection_contacts
after insert on public.finance_collection_contacts
for each row execute function private.write_condominium_audit_event('financial','note');

create or replace function private.ensure_finance_transaction_consistency()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  cat_condo uuid;
  cat_kind text;
  unit_condo uuid;
begin
  if new.category_id is not null then
    select condominium_id, kind into cat_condo, cat_kind
    from public.finance_categories where id = new.category_id;
    if cat_condo is null or cat_condo <> new.condominium_id or cat_kind <> new.kind then
      raise exception 'finance_category_mismatch';
    end if;
  end if;

  if new.unit_id is not null then
    select condominium_id into unit_condo
    from public.units where id = new.unit_id;
    if unit_condo is null or unit_condo <> new.condominium_id then
      raise exception 'finance_unit_mismatch';
    end if;
  end if;

  if new.is_delinquency and new.kind <> 'income' then
    raise exception 'finance_delinquency_must_be_income';
  end if;

  if tg_op = 'UPDATE' then
    if new.condominium_id <> old.condominium_id or new.created_by <> old.created_by then
      raise exception 'finance_transaction_identity_immutable';
    end if;
  end if;
  return new;
end;
$$;

insert into public.finance_categories (
  condominium_id, kind, name, is_active, sort_order, created_by
)
select
  c.id, 'income', 'Inadimplência', true, 15, c.created_by
from public.condominiums c
where c.archived_at is null
  and not exists (
    select 1
    from public.finance_categories fc
    where fc.condominium_id = c.id
      and fc.kind = 'income'
      and lower(fc.name) = lower('Inadimplência')
  );
