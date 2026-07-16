-- assessment_questions nasceu vinculada diretamente ao template.
-- O modelo atual vincula a pergunta à seção, e a seção ao template.
-- Mantemos a coluna legada para compatibilidade com registros antigos,
-- mas ela não pode continuar obrigatória para novas perguntas.

alter table public.assessment_questions
  alter column template_id drop not null;

comment on column public.assessment_questions.template_id is
  'Vínculo legado direto com assessment_templates. Novos registros usam assessment_section_id.';

notify pgrst, 'reload schema';
