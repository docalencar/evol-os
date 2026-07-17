-- O modelo inicial vinculava respostas às tabelas legadas:
-- assessment_id e question_id.
--
-- O modelo atual utiliza:
-- assessment_response_id e assessment_question_id.
--
-- Também substituímos o índice único parcial por um índice único
-- completo, para que o PostgreSQL consiga utilizá-lo no
-- ON CONFLICT gerado pelo Supabase.

alter table public.assessment_answers
  alter column assessment_id drop not null;

alter table public.assessment_answers
  alter column question_id drop not null;

drop index if exists
  public.assessment_answers_response_question_idx;

create unique index
  assessment_answers_response_question_idx
on public.assessment_answers(
  assessment_response_id,
  assessment_question_id
);

comment on column public.assessment_answers.assessment_id is
  'Vínculo legado com public.assessments. Novos registros usam assessment_response_id.';

comment on column public.assessment_answers.question_id is
  'Vínculo legado com assessment_questions. Novos registros usam assessment_question_id.';

notify pgrst, 'reload schema';
