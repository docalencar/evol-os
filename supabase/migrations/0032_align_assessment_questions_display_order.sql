alter table public.assessment_questions
  add column if not exists display_order integer;

update public.assessment_questions
set display_order = 0
where display_order is null;

alter table public.assessment_questions
  alter column display_order set default 0;

alter table public.assessment_questions
  alter column display_order set not null;

create index if not exists
assessment_questions_section_display_order_idx
on public.assessment_questions(
  assessment_section_id,
  display_order
);

notify pgrst, 'reload schema';
