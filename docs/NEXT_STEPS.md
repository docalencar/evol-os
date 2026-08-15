# Evol OS — Próxima entrega

## MVP-PR1 Phase 9 — PR 9B Tenant Switcher

### Objetivo

Exibir a empresa atual no app, permitir a troca explícita entre memberships
ativas e fazer todos os consumers server-side diretos usarem a mesma resolução
preference-aware.

### Estado confirmado

- Phases 1–8 concluídas;
- PR 9A — Functional Tenant Selection — concluída no merge `b4aae86`;
- seleção inicial já persiste a preferência por `select_active_tenant_v1`;
- PR 9B implementada e aguardando aprovação;
- nenhuma migration, nova RPC, alteração de RLS ou grants.

### Gate atual

Validar e aprovar a PR 9B:

1. empresa atual visível no header;
2. single-tenant sem seletor ambíguo;
3. multi-tenant com troca explícita e reconstrução em `/app`;
4. resolução preference-aware compartilhada por current company, Tenant Access,
   Activity e Notifications;
5. membership ativa e `auth.uid()` preservados como autoridade.

### Próximo passo após 9B

PR 9C — Invitation Issuance UI para Person existente, reutilizando a Action e a
Trusted Persistence atuais.
