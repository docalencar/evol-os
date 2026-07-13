# Database Blueprint v1.0
## Evol People / Evol Performance

## Entidades principais
- companies
- company_members
- people
- teams
- positions
- competencies
- assessment_templates
- assessment_questions
- assessments
- assessment_answers
- feedbacks
- development_plans
- development_actions
- events

## Decisões
- Supabase Auth será usado para autenticação.
- `auth.users` não será duplicado.
- `company_members` controla vínculo e papel do usuário em uma empresa.
- `people.manager_id` cria o organograma.
- Dashboards serão leituras, não tabelas próprias.
- IA será serviço, não tabela própria.
- `events` registra acontecimentos relevantes para auditoria, notificações e IA futura.

## Perfis
- owner
- admin
- hr
- manager
- employee

## positions

- id
- company_id
- name
- description

### Estrutura Organizacional

- department_id → departments.id
- hierarchical_level
- status

### Auditoria

- created_at
- updated_at
- deleted_at