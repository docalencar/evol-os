# Evol OS — Fontes Canônicas

**Status:** Canonical

## Princípio

Um assunto pode aparecer em vários documentos, mas deve possuir apenas uma fonte oficial. Documentos secundários resumem e apontam para ela; não redefinem a decisão.

## Matriz

| Assunto | Fonte canônica |
|---|---|
| Visão geral | `docs/VISION.md` |
| Constituição arquitetural | `docs/PLATFORM_BLUEPRINT.md` |
| Visão do produto | `docs/Product/PRODUCT_VISION.md` |
| Manifesto | `docs/Product/MANIFESTO.md` |
| Princípios de produto | `docs/PRODUCT_PRINCIPLES.md` |
| Princípios de interface | `docs/Product/DESIGN_PRINCIPLES.md` |
| Glossário | `docs/Product/GLOSSARY.md` |
| Arquitetura consolidada | `docs/architecture/ARCHITECTURE.md` |
| Decisões arquiteturais | `docs/adr/` |
| Estratégia de ADRs | `docs/ADR_STRATEGY.md` |
| Evolução do monorepo | `docs/MONOREPO_EVOLUTION.md` |
| Experiências | `docs/experiences/` |
| Domínio | `docs/domain/` e código de domínio |
| Banco | `docs/database/` e migrations |
| Engenharia | `docs/engineering/` |
| Procedimentos | `docs/playbooks/` |
| Roadmap | `docs/roadmap/` |
| Contexto global de IA | `docs/AI_CONTEXT.md` |
| Próximos passos globais | `docs/NEXT_STEPS.md` |
| Contexto local da web | `apps/web/AI_CONTEXT.md` |
| Próximos passos da web | `apps/web/NEXT_STEPS.md` |

## Sobreposições

### Arquitetura

`docs/architecture/ARCHITECTURE.md` será canônico. Um arquivo na raiz pode funcionar como ponte após validação das referências.

### Visão

- `VISION.md`: direção global;
- `PRODUCT_VISION.md`: usuários, problemas e valor;
- `MANIFESTO.md`: crenças e posicionamento.

### Princípios

- `PRODUCT_PRINCIPLES.md`: princípios globais;
- `decisions/product-principles.md`: registro histórico;
- `DESIGN_PRINCIPLES.md`: experiência e interface.

### IA e próximos passos

Arquivos em `docs/` são globais. Arquivos em `apps/web/` são locais e operacionais.

## Regras

1. Não copiar seções inteiras entre documentos.
2. Usar links relativos.
3. ADR registra a decisão; arquitetura registra o estado consolidado.
4. Roadmap registra intenção futura.
5. Código representa o comportamento executável atual.
6. Divergências devem ser resolvidas explicitamente.

## Documentos incompletos

Arquivos vazios ou com “Em construção” devem receber status `Planned`. A existência do arquivo não representa uma decisão completa.

## Remoção

Antes de remover um documento, comparar conteúdos, migrar informações exclusivas, corrigir referências e preservar o histórico no Git.

## Critério final

A pergunta “onde está a decisão oficial?” deve possuir uma resposta única neste documento.
