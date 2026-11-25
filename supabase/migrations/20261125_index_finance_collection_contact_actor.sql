-- Applied to production on 2026-11-25.
-- Covers the created_by foreign key reported by the Supabase performance advisor.

create index if not exists finance_collection_contacts_created_by_idx
  on public.finance_collection_contacts (created_by);
