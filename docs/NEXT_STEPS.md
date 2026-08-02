# Evol OS — Próxima entrega

## Definição do terceiro slice de integridade tenant-owned

### Objetivo

Revalidar as relações tenant-owned ainda simples e obter do Product Architect um
recorte único e explícito para a próxima implementação. O primeiro slice de
Organization, People e Competencies foi concluído pela migration 0064, e o
segundo slice de Recruitment foi concluído pela migration 0065; a ADR-0012
classifica os domínios restantes, mas não prioriza automaticamente um deles.

### Vínculo

- Roadmap: Fundação confiável, item 1, ainda em andamento.
- MVP Plan: Fundação, operação segura dos dados.
- Épico: Fundação e Governança de Dados.
- Evidência: `HCOS_DOMAIN_AUDIT.md` (HCOS-002 parcialmente mitigado).
- Arquitetura: ADR-0012 e o padrão tenant-owned.

### Critérios objetivos de aceite

- o inventário remanescente é revalidado contra o schema posterior à migration
  0065;
- relações já compostas pelas migrations 0064 e 0065 não retornam ao backlog;
- relações Derived, híbridas ou polimórficas são classificadas antes de qualquer
  proposta de constraint;
- a proposta identifica um único agregado, relações exatas, preflight,
  dependências e riscos de rollout;
- o Product Architect aprova explicitamente o próximo recorte antes de migration
  ou código.

### Fora de escopo

- criar migration ou alterar código;
- escolher automaticamente Assessment, Development, Feedback, Activity ou
  qualquer outro consumidor;
- alterar RLS, papéis, optionalidade ou comportamento funcional;
- transformar relações polimórficas sem decisão específica;
- corrigir dados inválidos automaticamente.

### Estratégia de rollout

1. consultar o schema e as migrations incorporadas;
2. excluir do inventário as 14 relações concluídas na migration 0064 e as seis
   relações de Recruitment concluídas na migration 0065;
3. classificar ownership e dependências das relações restantes conforme ADR-0012;
4. propor um recorte pequeno, sem implementação;
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
