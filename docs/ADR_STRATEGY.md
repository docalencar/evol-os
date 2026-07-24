# Evol OS — Estratégia de Architecture Decision Records

**Status:** Canonical

## Propósito

ADRs registram contexto, problema, decisão, alternativas, consequências, estado e impacto de decisões estruturais.

## Quando criar

Criar ADR quando a decisão:

- afeta múltiplas features;
- cria fronteira;
- introduz Engine;
- modifica domínio, persistência, multi-tenancy ou segurança;
- define integração, eventos ou pacote compartilhado;
- altera camadas;
- possui custo relevante de reversão;
- substitui decisão aceita.

Não criar para correções simples, mudanças visuais pequenas, tarefas operacionais, refatorações locais ou listas de próximos passos.

## Diretório

```text
docs/adr/
```

## Numeração

Novas ADRs usam:

```text
NNNN-kebab-case-title.md
```

Exemplos:

```text
0007-organization-sync-engine.md
0008-projection-engine.md
0009-monorepo-package-boundaries.md
```

Os arquivos históricos não serão renomeados nesta PR.

## Estados

- Proposed
- Accepted
- Rejected
- Deprecated
- Superseded

Quando substituída, a ADR antiga informa `Superseded by` e a nova informa `Supersedes`.

## Template

```markdown
# ADR NNNN — Título

## Status
Proposed

## Date
YYYY-MM-DD

## Context
## Problem
## Decision
## Alternatives Considered
## Consequences
### Positive
### Negative
### Risks
## Implementation Notes
## Related Documents
## Review Triggers
```

## Linguagem

A documentação pode ser escrita em português. Conceitos do código podem permanecer em inglês para preservar consistência.

## Escopo

Cada ADR registra uma decisão central. Decisões independentes devem ser separadas.

## Relação com arquitetura e código

A ADR explica a mudança. A arquitetura consolidada explica o estado atual.

Após aceitar e implementar:

1. atualizar arquitetura;
2. atualizar padrões;
3. atualizar playbooks;
4. atualizar experiências;
5. atualizar código;
6. manter a ADR como histórico.

## Placeholders

ADRs vazias não representam decisões formalmente documentadas. Devem ser preenchidas, renumeradas ou removidas em PR específica.

## Checklist

- [ ] Contexto claro
- [ ] Problema real
- [ ] Decisão explícita
- [ ] Alternativas consideradas
- [ ] Consequências registradas
- [ ] Riscos claros
- [ ] Escopo único
- [ ] Documentos relacionados
- [ ] Compatibilidade com o Platform Blueprint
- [ ] Gatilhos de revisão
- [ ] Validação da implementação

## Princípio final

ADRs impedem que decisões importantes dependam apenas da memória de quem participou da implementação.
