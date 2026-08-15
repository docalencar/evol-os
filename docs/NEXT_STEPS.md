# Evol OS — Próxima entrega

## MVP-PR1 Phase 9 — PR 9D1 Secure People Access-State Read Boundary

### Objetivo

Disponibilizar uma projeção DB-first segura de People, membership e invitation
state para owner/admin ativo, sem abrir leitura direta da tabela de invitations.

### Estado confirmado

- Phases 1–8 concluídas;
- PR 9A concluída no merge `b4aae86`;
- PR 9B concluída no merge `3070855`;
- PR 9C concluída no merge `4d7b037`;
- 9D dividida em 9D1 (read boundary) e 9D2 (consumer app/UI);
- emissão, persistência, delivery e aceite continuam nas fronteiras existentes.

### Gate atual

Validar e aprovar a PR 9D1:

1. RPC `get_people_access_state_v1(uuid)` autorizada por `auth.uid()` e
   membership owner/admin ativa;
2. projeção mínima, tenant-scoped e sem secrets, e-mail ou Auth IDs;
3. expiration efetiva calculada sem escrita;
4. tabela `company_member_invitations` ainda fechada a SELECT autenticado;
5. pgTAP completo sem `service_role` no caminho humano.

### Próximo passo após 9D1

PR 9D2 — People Access-State UI + Invitation Resend/Revoke, consumindo a RPC
segura da 9D1 sem leitura direta da tabela de invitations.
