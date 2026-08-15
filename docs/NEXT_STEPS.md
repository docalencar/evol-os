# Evol OS — Próxima entrega

## MVP-PR1 Phase 9 — PR 9D2 People Access-State UI + Invitation Resend/Revoke

### Objetivo

Apresentar o estado de acesso na People UI e permitir resend/revoke autorizados,
consumindo exclusivamente a fronteira segura criada pela 9D1.

### Estado confirmado

- Phases 1–8 concluídas;
- PR 9A concluída no merge `b4aae86`;
- PR 9B concluída no merge `3070855`;
- PR 9C concluída no merge `4d7b037`;
- PR 9D1 concluída no merge `02168b9`;
- PR 9D2 implementada e aguardando aprovação;
- emissão, persistência, delivery e aceite continuam nas fronteiras existentes.

### Gate atual

Validar e aprovar a PR 9D2:

1. People carrega e apresenta a projeção segura de access-state;
2. issue/resend/revoke aparecem somente nos estados e roles permitidos;
3. generation stale falha fechado e exige refresh;
4. client chama apenas Server Actions e não recebe `companyId` como autoridade;
5. nenhuma migration/RPC/policy/grant e tabela de invitations ainda fechada.

### Próximo passo após 9D2

PR 9E — Membership Management UI: mudança de role, desativação de membership e
transferência de ownership sobre as operações trusted já existentes.
