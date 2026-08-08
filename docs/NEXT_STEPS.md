# Evol OS — Próxima entrega

## Execução da Fase 7 da PR 3C

### Objetivo

Executar testes, observabilidade e cutover controlado do fluxo V2, provando o
fluxo antes e depois do cutover. A Fase 6 — Actions e experiência mínima foi
implementada em `3cc8c38`, validada, aprovada e incorporada à `main` pelo merge
`ca2f173`.

### Vínculo

- Roadmap: Fundação confiável, item 1, ainda em andamento.
- MVP Plan: Fundação, operação segura dos dados.
- Épicos: Fundação e Governança de Dados; Desenvolvimento.
- Dependências concluídas: PD-018 aprovada; ADR-0012, ADR-0013 e ADR-0014
  aceitas; Discovery da PR 3C aprovada; PRs 3A e 3B concluídas.
- Plano aprovado: `Execution/ADR-0012-SLICE-3-DEVELOPMENT-IMPLEMENTATION-PLAN.md`.
- Fase 1 — Infrastructure: incorporada à `main` em `53b12ec`, incluindo a
  migration 0068 e seus testes.
- Fase 2 — Deterministic Resolver: incorporada à `main` em `ed15eca`, incluindo
  seus testes determinísticos.
- Fase 3 — Trusted Persistence: concluída e incorporada à `main` em `fe08394`.
- Fase 4 — Application Layer e composição: concluída e incorporada à `main` em
  `5c1d12f`.
- Fase 5 — contrato retrocompatível: concluída e incorporada à `main` em
  `08bd7cf`.
- Fase 6 — Actions e experiência mínima: concluída e incorporada à `main` em
  `ca2f173`.
- Fase 7 — testes, observabilidade e cutover: autorizada e ativa.
- Fase 8 — reconciliação final: não iniciada.
- Produto: PD-018.
- Arquitetura: ADR-0003, ADR-0012, ADR-0013, ADR-0014 e o padrão tenant-owned.

### Critérios objetivos de aceite

- o estado incorporado das Fases 1–6 permanece confirmado no Git;
- V2 é provado e observado antes do cutover e provado novamente depois;
- smoke/regressão cobrem readiness, confirmação, retry, conflitos e falhas;
- compatibilidade legada só é removida com evidência suficiente;
- inventário final dos consumidores do contrato público e preflight read-only
  são tratados como dependências, sem transformação automática de dados;
- a Fase 8 não começa sem nova autorização explícita;
- escopo, ordem e critérios do Implementation Plan aprovado são preservados.

### Fora de escopo

- iniciar a Fase 8 ou remover legado sem evidência suficiente;
- alterar código, migrations, testes ou contratos durante este gate documental;
- alterar `apply_development_template`;
- inferir prioridade ou iniciar nova migration.

### Regra de parada

Não considerar o cutover concluído sem evidência pré e pós-cutover. Não iniciar a
Fase 8 automaticamente.

### Gates técnicos

- Implementation Plan aprovado e IRR tecnicamente concluído;
- Fases 1–6 concluídas; Fase 6 incorporada em `ca2f173`;
- worktree e ausência de implementação posterior confirmados;
- testes direcionados, TypeScript, lint, build, smoke e `git diff --check`;
- revisão do Product Architect antes da Fase 8.
