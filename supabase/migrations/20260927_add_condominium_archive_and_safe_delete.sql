-- Applied to production on 2026-09-27.
-- Adds reversible condominium archiving and a guarded permanent-delete RPC.

alter table public.condominiums
  add column if not exists archived_at timestamptz;

create index if not exists condominiums_archived_at_idx
  on public.condominiums (archived_at);

create or replace function public.delete_condominium_if_empty(p_condominium_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  has_linked_data boolean;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if not (select private.has_condo_role(p_condominium_id, array['syndic'])) then
    raise exception 'forbidden';
  end if;

  select exists (
    select 1 from public.units u where u.condominium_id = p_condominium_id
    union all
    select 1 from public.condominium_members cm
      where cm.condominium_id = p_condominium_id
        and (cm.role <> 'syndic' or cm.user_id <> auth.uid())
    union all
    select 1 from public.maintenances m where m.condominium_id = p_condominium_id
    union all
    select 1 from public.tasks t where t.condominium_id = p_condominium_id
    union all
    select 1 from public.service_requests sr where sr.condominium_id = p_condominium_id
    union all
    select 1 from public.documents d where d.condominium_id = p_condominium_id
    union all
    select 1 from public.assemblies a where a.condominium_id = p_condominium_id
    union all
    select 1 from public.finance_transactions ft where ft.condominium_id = p_condominium_id
    union all
    select 1 from public.gas_controls gc where gc.condominium_id = p_condominium_id
    union all
    select 1 from public.file_entries fe where fe.condominium_id = p_condominium_id
    union all
    select 1 from public.announcements an where an.condominium_id = p_condominium_id
  ) into has_linked_data;

  if has_linked_data then
    raise exception 'condominium_has_linked_data';
  end if;

  delete from public.condominiums
  where id = p_condominium_id;

  if not found then
    raise exception 'condominium_not_found';
  end if;
end;
$$;

revoke all on function public.delete_condominium_if_empty(uuid) from public;
grant execute on function public.delete_condominium_if_empty(uuid) to authenticated;
