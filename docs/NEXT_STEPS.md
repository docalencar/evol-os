# Evol OS — Próxima entrega

## MVP Closure — PR 10A Current User Active Tenants Read Boundary

### Objetivo

Entregar a projeção autenticada mínima que enumera os tenants ativos do ator sem
restaurar SELECT direto em `company_members`.

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
- PR 10A implementa `get_current_user_active_tenants_v1()` pela migration 0081;
- progresso funcional do MVP: 98%;
- emissão, persistência, delivery e aceite continuam nas fronteiras existentes.

### Gate atual

Validar e aprovar a PR 10A:

1. RPC sem parâmetros deriva o ator exclusivamente de `auth.uid()`;
2. retorna apenas `company_id`, `company_name` e `membership_role` das
   memberships ativas do próprio ator;
3. grants permanecem mínimos e nenhum SELECT direto é aberto;
4. zero, single, multi-tenant, status e isolamento são comprovados por pgTAP;
5. integração dos consumers permanece fora desta PR DB-first.

### Próximo passo após aprovação da 10A

MVP Closure PR 10B — Application Integration of Active Tenant Read Boundary —
para migrar onboarding, current-user-context e tenant selection. Depois, retomar
o smoke autenticado manual com dois tenants e as roles previstas.
