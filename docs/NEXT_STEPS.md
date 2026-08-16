# Evol OS — Próxima entrega

## MVP Closure — PR 10C Legacy Tenant Consumer Cleanup

### Objetivo

Eliminar os consumers browser-side legados de tenant sem criar uma fronteira
paralela ao contexto canônico já integrado pela PR 10B.

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
- progresso funcional do MVP: 98%;
- emissão, persistência, delivery e aceite continuam nas fronteiras existentes.

### Gate atual

Validar e aprovar a PR 10C:

1. `/app/people/new` deriva tenant no servidor e reutiliza o fluxo canônico de
   criação de People;
2. `createEmployeeAction` não aceita `companyId` do browser como autoridade;
3. não há leitura browser-side de `company_members` nem fallback de primeira
   membership nesses consumers;
4. `companies.service.ts` permanece removido sem quebrar imports/barrels;
5. nenhuma migration, RPC, policy, grant ou autoridade nova é introduzida.

### Próximo passo após aprovação da 10C

Retomar o smoke autenticado a partir de signup → onboarding → criação da primeira
empresa → `/app`, seguindo depois a matriz single tenant, multi-tenant,
`/select-company`, A → B → A, People, invitations, gestão de roles, desativação,
transferência de ownership, mobile, teclado e session/logout.
