# Evol OS — Próxima entrega

## MVP-PR1 Phase 9 — PR 9C Invitation Issuance UI

### Objetivo

Permitir que owner/admin autorizado emita, pela experiência de People, um convite
real para uma Person existente usando a Action e a Trusted Persistence atuais.

### Estado confirmado

- Phases 1–8 concluídas;
- PR 9A concluída no merge `b4aae86`;
- PR 9B concluída no merge `3070855`;
- emissão, persistência e delivery de convite já existem no servidor;
- PR 9C implementada e aguardando aprovação;
- nenhuma migration, nova RPC, alteração de RLS ou grants.

### Gate atual

Validar e aprovar a PR 9C:

1. ação contextual somente para owner/admin e Person obviamente elegível;
2. e-mail visível e não editável;
3. roles permitidas projetadas conforme o ator server-side;
4. envio exclusivo de `personId` e `intendedRole` à Action existente;
5. pending, proteção contra double submit e feedback acessível.

### Próximo passo após 9C

PR 9D — read model autenticado seguro de convites/memberships e UI de status,
reenvio e revogação.
