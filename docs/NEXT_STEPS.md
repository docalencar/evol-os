# Evol OS — Próxima entrega

## Definição do próximo recorte de integridade tenant-owned

### Objetivo

Revalidar o inventário remanescente da ADR-0012 após a migration 0066 e obter do
Product Architect um único recorte explícito para a próxima entrega. O PR 3A
concluiu exclusivamente o agregado operacional de Development; Global Competency
Concepts, Tenant Mapping e Application Snapshot permanecem fora desse recorte.

### Vínculo

- Roadmap: Fundação confiável, item 1, ainda em andamento.
- MVP Plan: Fundação, operação segura dos dados.
- Épicos: Fundação e Governança de Dados; Desenvolvimento.
- Evidência: `HCOS_DOMAIN_AUDIT.md` (HCOS-002 parcialmente mitigado).
- Produto: PD-018, quando o recorte envolver templates globais.
- Arquitetura: ADR-0012 e o padrão tenant-owned.

### Critérios objetivos de aceite

- as relações concluídas pelas migrations 0064, 0065 e 0066 são excluídas do
  inventário;
- relações restantes são classificadas por ownership, agregado e estratégia da
  ADR-0012;
- a proposta contém um único recorte, relações exatas, dependências, preflight,
  riscos e validações;
- nenhum trabalho de templates globais é iniciado sem respeitar a PD-018;
- o Product Architect aprova explicitamente o recorte antes de migration ou
  código.

### Fora de escopo

- criar migration, código, testes ou schema;
- escolher automaticamente o próximo agregado ou antecipar o recorte de
  templates globais;
- redefinir PD-018 ou ADR-0012;
- inventar mapping para conteúdo legado;
- alterar RLS, papéis ou regras funcionais.

### Estratégia de rollout

1. consultar o schema após a migration 0066;
2. excluir do inventário os agregados já concluídos;
3. classificar as relações tenant-owned restantes conforme ADR-0012;
4. propor um único recorte com dependências e riscos de rollout;
5. aguardar aprovação explícita do Product Architect.

## Débito técnico conhecido — validação global

Este registro não altera a prioridade operacional acima.

- desacoplar o teste `create-employee-intelligence.test.ts` dos barrels que
  carregam `server-only`, preservando a execução pelo runner `tsx`;
- corrigir a resolução de `digest` em `save_approval_request`, definida na
  migration `0046_create_approval_foundation.sql`, e tornar
  `supabase db lint --local` integralmente limpo.

Critério de conclusão: a suíte TypeScript completa e o lint local do banco passam
sem dispensas.
