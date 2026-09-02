# Reference Projects

This file is the working reference map for the condominium management system.

## Rules

- Public source code is not automatically free to copy.
- Prefer concepts over direct code unless the license is permissive and the copied portion is genuinely useful.
- If code is reused from MIT, BSD-2-Clause, or Apache-2.0 projects, preserve notices/attribution where required.
- GPL-3.0 and AGPL-3.0 projects are concept/reference sources only unless the project licensing strategy explicitly changes.
- Before implementing a module, check the matching references below and current upstream status.

## Architecture and condominium domain

### open-condo-software/condo
License: MIT
Use for: condominium/property domain structure, management workflows, navigation and product concepts.
Policy: concepts freely; direct code only when it is clearly better than our current implementation and attribution is preserved.

### point-source/supabase-tenant-rbac
License: BSD-2-Clause
Use for: multi-tenant Supabase/RBAC patterns, tenant isolation, role modelling, RLS concepts.
Policy: strong technical reference for security; adapt to our condominium_members model instead of transplanting schema blindly.

## Visual system / dashboard UX

### tabler/tabler
License: MIT
Use for: dense but readable admin dashboards, sidebar hierarchy, table spacing, cards, badges, empty states and responsive dashboard proportions.
Policy: visual/product reference. Prefer our own CSS implementation rather than importing the framework into the current vanilla application.

### TailAdmin/free-react-tailwind-admin-dashboard
License: MIT
Use for: modern dashboard hierarchy, KPI cards, header actions, responsive sidebar/drawer behavior and table/card composition.
Policy: visual/product reference. Do not introduce React or Tailwind only to reproduce a visual pattern that can be implemented in the current stack.

### tremorlabs/tremor
License: Apache-2.0
Use for: analytics hierarchy, KPI/chart composition and report/dashboard information density.
Policy: concepts primarily. Do not add charts without real data or a clear operational decision supported by the chart.

### saadeghi/daisyui
License: MIT
Use for: mobile dock/bottom-navigation ergonomics, safe-area handling and compact responsive component ideas.
Policy: visual/product reference. The Gestão Condominial mobile dock is an original implementation generated from the existing sidebar routes rather than copied component code.

### Public curved/blob bottom-navigation demos
License: varies / sometimes unspecified
Use for: motion and active-tab shape inspiration only.
Policy: CONCEPTS ONLY when a clear permissive license is absent. Reimplement interactions from scratch and keep reduced-motion support.

For the current visual-refresh branch, preferred concepts are:
- desktop sidebar remains compact and secondary to the content;
- KPI cards emphasize the number first, label second;
- tables remain tables on wide screens and become readable cards on phones;
- mobile uses a persistent bottom dock for high-frequency routes plus a complete drawer for the long tail;
- active mobile navigation gets a restrained pill/blob treatment and small vertical lift;
- visual effects must never hide current route state or reduce accessibility;
- no decorative charts with fake data;
- responsive behavior is verified in Chrome at 1440px, 390px and 320px widths.

## Maintenance

### Grashjs/cmms (Atlas CMMS)
License: AGPL-3.0
Use for: preventive maintenance concepts, recurring schedules, work-order lifecycle, responsibility, maintenance history, operational KPIs.
Policy: CONCEPTS ONLY. Do not copy source code into this project.

For our V1, preferred concepts are:
- recurring preventive schedules;
- clear next due date;
- generated/executed maintenance occurrences;
- assigned responsible person;
- completion history rather than overwriting the only record;
- overdue/upcoming operational views;
- supplier/cost fields only when useful, without overbuilding inventory/asset management.

## Finance

### actualbudget/actual
License: MIT
Use for: transaction/category model, budget vs actual concepts, filtering, totals, reconciliation-style UX.
Policy: adapt concepts to condominium finance, not personal-finance semantics.

### microrealestate/microrealestate
License: MIT
Use for: property/resident/contract/payment relationships and real-estate financial workflows.
Policy: useful bridge between property data and finance; avoid importing rental-specific complexity unless needed.

## Assemblies and voting

### Chensokheng/next-supabase-vote
License: MIT
Use for: voting flow concepts with Supabase, vote persistence and UI patterns.
Policy: voting authorization and condominium quorum rules must be designed independently for our domain and enforced in Postgres/RLS.

## Documents

### paperless-ngx/paperless-ngx
License: GPL-3.0
Use for: document classification, metadata, archive/search concepts, retention and document-centric UX.
Policy: CONCEPTS ONLY. Do not copy source code into this project.

## Audit

### supabase/supa_audit
License: Apache-2.0, archived
Use for: generic database-audit concepts and immutable change-history ideas.
Policy: reference only where still appropriate for current Supabase/Postgres; do not assume archived implementation is current best practice.

## Tests

### microsoft/playwright
License: Apache-2.0
Use for: browser E2E testing framework and test architecture.
Policy: use Playwright itself or equivalent patterns when automated browser tests are added.

## Current selection by roadmap

1. Architecture / condominium domain: Open Condo
2. Tenant isolation / roles / RLS: supabase-tenant-rbac + current Supabase documentation
3. Condominium/resident relationships: Open Condo + MicroRealEstate
4. Calls/service requests: domain design + our existing service_requests model
5. Maintenance: Atlas CMMS concepts
6. Communication: our existing modules + domain research as needed
7. Documents: Paperless-ngx concepts
8. Finance: Actual Budget + MicroRealEstate
9. Assemblies/voting: next-supabase-vote concepts + condominium-specific rules
10. Audit: Supa Audit concepts + native Postgres triggers/history
11. Visual dashboard system: Tabler + TailAdmin + Tremor concepts; daisyUI for mobile dock ergonomics
12. Final E2E testing: Playwright