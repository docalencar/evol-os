# Evol OS — Próxima entrega

## MVP-PR1 Phase 9 — PR 9E Membership Management UI

### Objetivo

Permitir que owner/admin autorizado altere role e desative memberships existentes,
e que owner transfira ownership, usando exclusivamente a projeção v2 e as RPCs
trusted existentes.

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
- PR 9E implementada e aguardando aprovação;
- progresso funcional do MVP: 96%;
- emissão, persistência, delivery e aceite continuam nas fronteiras existentes.

### Gate atual

Validar e aprovar a PR 9E:

1. app consome `get_people_access_state_v2(uuid)` com parser estrito;
2. role change e deactivation respeitam a matriz owner/admin;
3. ownership transfer é apresentada somente a owner e exige escolha explícita
   sobre a role posterior do ator;
4. estado esperado, último owner e autoridade continuam revalidados pelas RPCs;
5. nenhum SELECT direto, client Supabase, migration, RPC, RLS ou grant novo.

### Próximo passo após 9E

PR 9F — Multiuser E2E Validation + UX/Compatibility Polish, confirmando os fluxos
com múltiplos usuários e tenants antes do fechamento do MVP-PR1.
