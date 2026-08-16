# Evol OS — Próxima entrega

## MVP Closure — PR 10B Application Integration of Active Tenant Read Boundary

### Objetivo

Integrar a projeção autenticada de tenants ativos no onboarding e na resolução,
seleção e troca de tenant sem restaurar SELECT direto em `company_members`.

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
- PR 10B migra os consumers centrais para a nova read boundary;
- progresso funcional do MVP: 98%;
- emissão, persistência, delivery e aceite continuam nas fronteiras existentes.

### Gate atual

Validar e aprovar a PR 10B:

1. adapter server-only chama somente `get_current_user_active_tenants_v1()` sem
   selectors;
2. current-user-context, tenant selection, onboarding e switcher não leem mais
   `company_members` diretamente;
3. zero, single, multi-tenant, preferência e role inválida permanecem fail-closed;
4. onboarding com membership existente redireciona ao fluxo normal;
5. nenhuma migration, RPC ou autoridade nova é introduzida.

### Próximo passo após aprovação da 10B

MVP Closure PR 10C — Legacy Tenant Consumer Cleanup — para avaliar
`/app/people/new` e `companies.service.ts`. Depois, retomar o smoke autenticado a
partir de signup → onboarding → criação da primeira empresa.
