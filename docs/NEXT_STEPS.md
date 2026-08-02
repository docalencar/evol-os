# Evol OS — Próxima entrega

## Integridade relacional cross-tenant

### Objetivo

Endurecer as relações company-owned para impedir referências entre tenants nos
domínios organizacionais que usam pessoas, cargos, times, departamentos e
competências.

### Vínculo

- Roadmap: Fundação confiável, item 1.
- MVP Plan: Fundação, operação segura dos dados.
- Épico: Fundação e Governança de Dados.
- Evidência: `HCOS_DOMAIN_AUDIT.md` (HCOS-029) e
  `docs/database/database_blueprint.md`.

### Critérios objetivos de aceite

- todas as relações company-owned do recorte são inventariadas antes da migration;
- FKs compostas ou validação equivalente impedem referências cross-tenant;
- preflight identifica registros incompatíveis sem corrigi-los silenciosamente;
- constraints preservam os contratos e dados válidos existentes;
- pgTAP comprova referências permitidas no mesmo tenant e nega referências entre
  tenants;
- migration, testes, TypeScript, lint e build passam;
- documentação registra o recorte efetivamente endurecido e o backlog restante.

### Fora de escopo

- alterar comportamento funcional dos módulos;
- ampliar papéis, policies ou contratos públicos;
- corrigir dados inválidos automaticamente;
- refatorar application code sem necessidade para a integridade relacional;
- antecipar capacidades funcionais posteriores ao gate de Fundação confiável.

### Estratégia de rollout

1. inventário resolve o recorte exato e as dependências entre migrations;
2. preflight interrompe a aplicação quando houver referências incompatíveis;
3. constraints são adicionadas incrementalmente e validadas no banco local;
4. pgTAP adversarial comprova isolamento antes da aplicação humana;
5. falha exige migration compensatória; migrations aplicadas não são editadas.

## Débito técnico conhecido — validação global

Este registro não altera a prioridade operacional acima.

- desacoplar o teste `create-employee-intelligence.test.ts` dos barrels que
  carregam `server-only`, preservando a execução pelo runner `tsx`;
- corrigir a resolução de `digest` em `save_approval_request`, definida na
  migration `0046_create_approval_foundation.sql`, e tornar
  `supabase db lint --local` integralmente limpo.

Critério de conclusão: a suíte TypeScript completa e o lint local do banco passam
sem dispensas.
