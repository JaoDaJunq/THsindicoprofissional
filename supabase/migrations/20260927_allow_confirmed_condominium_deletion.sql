-- Applied to production on 2026-09-27.
-- Allows explicit, confirmed condominium deletion while preserving the
-- "last syndic" protection for ordinary membership edits/removals.

create or replace function private.protect_last_active_syndic()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining_syndics integer;
begin
  if not exists (
    select 1
    from public.condominiums c
    where c.id = old.condominium_id
  ) then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if old.role = 'syndic' and old.is_active = true then
    if tg_op = 'DELETE' or new.role <> 'syndic' or new.is_active <> true then
      select count(*)
      into remaining_syndics
      from public.condominium_members cm
      where cm.condominium_id = old.condominium_id
        and cm.role = 'syndic'
        and cm.is_active = true
        and cm.id <> old.id;

      if remaining_syndics = 0 then
        raise exception 'cannot_remove_last_syndic';
      end if;
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.delete_condominium_permanently(
  p_condominium_id uuid,
  p_confirmed boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if p_confirmed is not true then
    raise exception 'confirmation_required';
  end if;

  if not (select private.has_condo_role(p_condominium_id, array['syndic'])) then
    raise exception 'forbidden';
  end if;

  delete from public.condominiums
  where id = p_condominium_id;

  if not found then
    raise exception 'condominium_not_found';
  end if;
end;
$$;

revoke all on function public.delete_condominium_permanently(uuid, boolean) from public;
grant execute on function public.delete_condominium_permanently(uuid, boolean) to authenticated;
