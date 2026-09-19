-- Mirrors the production migration applied on 2026-09-19.
-- Extends immutable user-action auditing to gas controls and tasks.

drop trigger if exists audit_gas_controls on public.gas_controls;
create trigger audit_gas_controls
after insert or update or delete on public.gas_controls
for each row execute function private.write_condominium_audit_event('operational','unit_label');

drop trigger if exists audit_tasks on public.tasks;
create trigger audit_tasks
after insert or update or delete on public.tasks
for each row execute function private.write_condominium_audit_event('operational','title');
