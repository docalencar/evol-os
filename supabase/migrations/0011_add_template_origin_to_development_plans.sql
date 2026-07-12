-- =====================================================
-- Development plan template origin
-- =====================================================

alter table public.development_plans
add column if not exists template_id uuid
  references public.development_templates(id)
  on delete set null;

create index if not exists development_plans_template_id_idx
on public.development_plans(template_id);
