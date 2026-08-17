# Evol OS — Próxima entrega

## MVP Closure — retomar smoke autenticado após PR 10G

### Objetivo

Validar em browser real o dashboard `/app` após a integração das read boundaries
tenant-scoped aprovadas nas PRs 10F1 e 10F2.

### Estado confirmado

- Phases 1–8 concluídas;
- PR 9A concluída no merge `b4aae86`;
- PR 9B concluída no merge `3070855`;
- PR 9C concluída no merge `4d7b037`;
- PR 9D1 concluída no merge `02168b9`;
- PR 9D2 concluída no merge `3f13bbc`;
- PR 9E descobriu que as mutações existentes exigem `membership_id`, ausente na
  projeção segura v1;
- PR 9E1 concluída no merge `1e4ccbb`;
- PR 9E concluída no merge `f10d116`;
- PR 9F concluída no merge `a6188dd`;
- o smoke autenticado comprovou que onboarding e resolução de tenant ainda tentam
  ler diretamente `company_members`;
- `authenticated` intencionalmente não possui SELECT nessa tabela;
- PR 10A concluída no merge `9d2a7ec`, com
  `get_current_user_active_tenants_v1()` pela migration 0081;
- PR 10B mergeada em `fb4ae6f1c6c71337c5d28be77c88e01bae561fe8`;
- PR 10C migra `/app/people/new` para o `EmployeeForm`, queries server-side e
  `getCurrentCompanyContext()`, e remove `companies.service.ts` após confirmar
  que não possuía consumers;
- o smoke real após a PR 10C encontrou reads diretos bloqueados de Company e
  Person: Company já está projetada pela 0081 e o Person ID por
  `current_person_id(company_id)`, mas o e-mail de emissão não possuía boundary;
- PR 10D adiciona pela migration 0082 somente `person_id` e `email`, autorizados
  por membership owner/admin ativa;
- PR 10D concluída no merge `06622e2`;
- PR 10E integra Company por 0081, Person ID por `current_person_id(company_id)`
  e contato de emissão pela 0082;
- resend preserva o e-mail retornado pela operação trusted existente, sem novo
  SELECT em Company ou People;
- não resta SELECT direto crítico de Company/People nesses consumers;
- o smoke chegou a `/app`, mas `getOrganizationSummary()` falha primeiro em
  `getTeams()` porque `authenticated` não possui SELECT em Organization/People;
- PR 10F1 cria pela migration 0083 os diretórios tenant-scoped de Organization e
  People, autorizados por `auth.uid()` e membership ativa;
- PR 10F1 concluída no merge `003e0b8`;
- PR 10F2 cria pela migration 0084 quatro projections tenant-scoped para
  Development, Competencies, Recruitment e Activity;
- replay integral local e 28 arquivos/732 testes DB validam a cadeia 0001–0084;
- progresso funcional do MVP: 98%;
- emissão, persistência, delivery e aceite continuam nas fronteiras existentes.

### Gate atual

A PR 10F2 foi incorporada no merge `bebfa2f`. A PR 10G integra `/app` com as
projections 0083/0084 por um read model server-only, valida todas as respostas e
remove do grafo inevitável do dashboard os SELECTs diretos nas tabelas protegidas.
Nenhum grant, RLS, policy, RPC ou migration é criado.

### Próximo passo

Revisar a integração da PR C: as rotas MVP de People e Organization consomem as
boundaries 0085 sem fallback para SELECT direto. A migration forward-only 0086
preserva a 0085 e normaliza para `person` eventos persistidos como `employee`,
desbloqueando a timeline de People sem reescrever histórico. Writes e Human
Review permanecem suspensos; o MVP continua em 98%.

Gate adicional: obter sign-off de privacidade para o management profile de People
e planejar hardening forward-only da timeline tenant-wide 0084, sem alterar a
migration já publicada.

A PR F consome as sete boundaries DB-first da migration 0087 nas rotas de
Competencies e Development, com validação estrita e sem fallback direto. Os
writes continuam `WRITE_BOUNDARY_MISSING`; o hardening da 0084 e os privacy
gates de People e Development permanecem pendentes. Human Review continua
suspenso e o MVP em 98%.

Gate adicional: **PRIVACY SIGN-OFF REQUIRED BEFORE PRODUCTION — DEVELOPMENT**.
A leitura histórica de plans/goals/actions por qualquer membro ativo, inclusive
employee, foi preservada pela 0087 e precisa de confirmação explícita de Produto.

A PD-020 e a migration 0088 fecham o contrato DB-first de leitura para
Assessments e Feedback. O próximo passo é integrar as sete rotas navegáveis por
adapters server-only e validação estrita, sem fallback direto. Isso ainda não
torna writes ou CRUD seguros; Human Review permanece suspenso e o MVP em 98%.
