alter table public.assessment_cycles
  add column if not exists assessment_template_id uuid
  references public.assessment_templates(id)
  on delete restrict;

create index if not exists
assessment_cycles_template_idx
on public.assessment_cycles(
  assessment_template_id
);

notify pgrst, 'reload schema';
