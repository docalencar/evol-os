# Evol OS — Próxima entrega

## PR 3B — Global Concepts and Tenant Mappings

### Objetivo

Implementar a infraestrutura administrativa da PD-018 para conceitos globais,
versões, aliases e mappings tenant-owned, além de preparar os dois caminhos
exclusivos de Development Template Goals. A forma de aplicar templates permanece
inalterada.

### Vínculo

- Roadmap: Fundação confiável, item 1, ainda em andamento.
- MVP Plan: Fundação, operação segura dos dados.
- Épicos: Fundação e Governança de Dados; Desenvolvimento.
- Dependências concluídas: PD-018 aprovada; ADR-0012 e ADR-0013 aceitas; PR 3A
  concluída no commit `fe3d8914ce4da54e85f94794b367582971403ffa`.
- Plano: `Execution/ADR-0012-SLICE-3-DEVELOPMENT-IMPLEMENTATION-PLAN.md`.
- Produto: PD-018.
- Arquitetura: ADR-0003, ADR-0012, ADR-0013 e o padrão tenant-owned.

### Critérios objetivos de aceite

- conceitos, versões publicadas imutáveis, aliases e auditoria global obedecem à
  PD-018;
- mappings pertencem a uma empresa, resolvem somente competência do mesmo tenant
  e exigem confirmação humana por `owner`, `admin` ou `hr`;
- Development Template Goals possuem exatamente um caminho: conceito versionado
  global ou competência company-owned;
- conteúdo publicado e drafts respeitam a visibilidade prevista; nenhuma policy
  permite cross-tenant;
- preflight não infere nem corrige legado ambíguo;
- contracts administrativos, testes unitários e pgTAP são entregues sem alterar
  o contrato público de aplicação de templates;
- todos os gates técnicos do Implementation Plan são executados.
- autoridade global usa delegações capability-based revogáveis, contexto
  server-only e auditoria que separa ator humano, delegação e executor técnico;
- papéis tenant-owned não obtêm autoridade global e `service_role` não comprova
  aprovação humana.

### Fora de escopo

- Application Snapshot;
- cutover ou alteração de `apply_development_template`;
- PR 3C;
- IA confirmando mapping;
- inferência automática por nome ou alias;
- correção automática de legado ambíguo;
- funcionalidade não autorizada pela PD-018.

### Regra de parada

Interromper a implementação se o preflight encontrar legado ambíguo, se o schema
divergir da PD-018 ou do Implementation Plan, ou se a integridade exigir nova
decisão funcional ou arquitetural. Não inferir, reparar ou ampliar escopo.

### Gates técnicos

- migration autorizada e inspeção do catálogo;
- pgTAP isolado e completo;
- db lint;
- TypeScript, build e lint;
- `git diff --check`;
- compatibilidade dos contratos existentes comprovada.
