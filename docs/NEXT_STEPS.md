# Evol OS — Próxima entrega

## MVP Closure — PR 10D Tenant-Scoped Person Contact Read Boundary

### Objetivo

Criar a projeção DB mínima que permite à emissão inicial de convite resolver o
e-mail tenant-scoped de uma Person sem SELECT direto em `people`.

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
- progresso funcional do MVP: 98%;
- emissão, persistência, delivery e aceite continuam nas fronteiras existentes.

### Gate atual

Validar e aprovar a PR 10D:

1. RPC `STABLE SECURITY DEFINER` deriva o ator de `auth.uid()`;
2. somente owner/admin ativo pode ler o contato da Person no tenant autorizado;
3. Person inexistente ou estrangeira falha fechada;
4. somente `person_id` e e-mail persistido são projetados;
5. nenhum grant/policy de tabela ou caminho `service_role` é introduzido.

### Próximo passo após aprovação da 10D

Executar a PR 10E — Current Company + Invitation Read Integration — e então
retomar o smoke em signup/login → onboarding → criar primeira Company → `/app`.
