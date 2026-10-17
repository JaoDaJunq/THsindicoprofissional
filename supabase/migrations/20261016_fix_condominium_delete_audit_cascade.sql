-- Applied to production on 2026-10-16.
-- Fixes permanent condominium deletion when child-table audit triggers fire
-- during ON DELETE CASCADE after the parent condominium is no longer referenceable.

create or replace function private.write_condominium_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  oldj jsonb;
  newj jsonb;
  rowj jsonb;
  condo uuid;
  rid uuid;
  lbl text;
  sensitivity text := coalesce(nullif(tg_argv[0],''),'operational');
  label_key text := coalesce(nullif(tg_argv[1],''),'title');
  ignored text[] := array['updated_at','created_at'];
  delta jsonb;
begin
  if tg_table_name='condominiums' and tg_op='DELETE' then
    return old;
  end if;

  oldj := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else '{}'::jsonb end;
  newj := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else '{}'::jsonb end;
  rowj := case when tg_op='DELETE' then oldj else newj end;

  if tg_table_name='condominiums' then
    condo := nullif(rowj->>'id','')::uuid;
  else
    condo := nullif(rowj->>'condominium_id','')::uuid;
  end if;
  rid := nullif(rowj->>'id','')::uuid;

  if condo is null then
    return coalesce(new,old);
  end if;

  if tg_op='DELETE'
     and tg_table_name <> 'condominiums'
     and not exists (
       select 1
       from public.condominiums c
       where c.id = condo
     )
  then
    return old;
  end if;

  if tg_table_name='units' then
    lbl := concat_ws(' / ',nullif(rowj->>'block_name',''),nullif(rowj->>'unit_number',''));
  elsif tg_table_name='condominium_members' then
    lbl := coalesce(nullif(rowj->>'member_type',''),nullif(rowj->>'role',''),'Vínculo de usuário');
  elsif tg_table_name='assembly_attendance' then
    lbl := coalesce(nullif(rowj->>'representative_name',''),'Presença em assembleia');
  elsif tg_table_name='assembly_votes' then
    lbl := 'Voto em assembleia';
  else
    lbl := nullif(rowj->>label_key,'');
  end if;

  oldj := oldj - ignored;
  newj := newj - ignored;

  if tg_table_name='condominiums' then
    oldj := oldj - array['google_calendar_id','google_calendar_name'];
    newj := newj - array['google_calendar_id','google_calendar_name'];
  end if;

  if tg_op='INSERT' then
    delta := jsonb_build_object('new',newj);
  elsif tg_op='DELETE' then
    delta := jsonb_build_object('old',oldj);
  else
    delta := private.audit_jsonb_diff(oldj,newj);
    if delta='{}'::jsonb then return new; end if;
  end if;

  insert into public.audit_events(
    condominium_id,actor_user_id,action,entity_type,entity_id,entity_label,sensitivity,changes,metadata
  ) values (
    condo,auth.uid(),lower(tg_op),tg_table_name,rid,lbl,sensitivity,delta,
    jsonb_build_object('trigger','database','schema',tg_table_schema)
  );

  return coalesce(new,old);
end;
$$;
