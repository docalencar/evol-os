# Evol OS — Próxima entrega

## MVP-PR1 Phase 9 — PR 9E1 Secure Membership Management Target Identity

### Objetivo

Adicionar uma projeção DB-first, tenant-safe e retrocompatível que permita à
futura UI de gestão identificar a membership alvo sem liberar SELECT direto nas
tabelas protegidas.

### Estado confirmado

- Phases 1–8 concluídas;
- PR 9A concluída no merge `b4aae86`;
- PR 9B concluída no merge `3070855`;
- PR 9C concluída no merge `4d7b037`;
- PR 9D1 concluída no merge `02168b9`;
- PR 9D2 concluída no merge `3f13bbc`;
- PR 9E descobriu que as mutações existentes exigem `membership_id`, ausente na
  projeção segura v1;
- PR 9E1 implementada e aguardando aprovação;
- progresso funcional do MVP permanece em 93%; esta PR habilita o próximo recorte
  sem antecipar a UI;
- emissão, persistência, delivery e aceite continuam nas fronteiras existentes.

### Gate atual

Validar e aprovar a PR 9E1:

1. migration 0080 cria `get_people_access_state_v2(uuid)` sem alterar a v1;
2. v2 acrescenta somente `membership_id` à projeção aprovada;
3. owner/admin ativo continua sendo revalidado no banco;
4. nenhum SELECT de tabela, policy, RLS ou grant de tabela é ampliado;
5. a suíte pgTAP prova isolamento tenant e paridade da projeção v1/v2.

### Próximo passo após 9E1

Retomar a PR 9E — Membership Management UI: mudança de role, desativação de
membership e transferência de ownership sobre as operações trusted existentes.
