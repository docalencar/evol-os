# Evol OS — Próxima entrega

## MVP-PR1 Phase 9 — PR 9A Functional Tenant Selection

### Objetivo

Tornar funcional a seleção explícita de empresa em `/select-company` para o
usuário com múltiplas memberships ativas e sem preferência válida.

### Estado confirmado

- Phases 1–7 do MVP-PR1 concluídas;
- Phase 8 encerrada pela caracterização 8A e migrations 0077/0078;
- autoridade tenant continua derivada de `auth.uid()` e membership ativa;
- `select_active_tenant_v1` e sua Action server-side já existem;
- preferência é persistida em `tenant_membership_preferences` e revalidada no
  SSR;
- a rota já trata zero, uma e múltiplas memberships, mas o estado multiempresa
  ainda não permite interação.

### Gate atual

Implementar exclusivamente a PR 9A:

1. apresentar as opções autorizadas carregadas no servidor;
2. enviar somente o `companyId` pretendido à Action existente;
3. persistir a escolha pela RPC confiável;
4. navegar para `/app` apenas após sucesso confirmado;
5. preservar feature flag, acessibilidade e comportamento single-tenant.

Não fazem parte deste gate: switcher no header, convites, administração de
memberships, novas RPCs, migration, RLS ou grants.

### Próximo passo após 9A

PR 9B — tenant switcher e resolução consistente da preferência ativa nas
Actions multiempresa.
