-- =====================================================
-- Remove duplicated title from template goals
-- Single Source of Truth = competencies.name
-- =====================================================

alter table public.development_template_goals
drop column if exists title;
