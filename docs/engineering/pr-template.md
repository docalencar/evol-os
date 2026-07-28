# PR Specification Template — Especificação de uma PR

> Modelo que o **Product Architect** usa para especificar uma PR **antes** da
> implementação. É o combinado que o Implementation Agent recebe e o Quality
> Reviewer usa como referência de aderência.
>
> Este é o template de **especificação** (o que fazer). O template de **descrição**
> da PR no GitHub (o que foi feito) é `.github/PULL_REQUEST_TEMPLATE.md`. A
> Definition of Done canônica é a do `CLAUDE.md` (§8).

Uma boa especificação cabe em uma leitura rápida e descreve **uma** mudança
pequena e verificável. Campos sem conteúdo são removidos, não preenchidos com "N/A".

---

```markdown
# [ID] Título curto e específico

## Contexto
Por que esta mudança existe agora; o estado atual relevante.

## Problema
O que está errado, faltando ou bloqueado — em uma ou duas frases.

## Objetivo (único)
O resultado que esta PR entrega. Se precisar de "e", provavelmente são duas PRs.

## Escopo
O que será feito.

## Fora de escopo
O que explicitamente NÃO será feito nesta PR.

## Fontes canônicas
Documentos/decisões que fundamentam a mudança (ARCHITECTURE.md, ADRs, CLAUDE.md,
padrões de engenharia). Referenciar, não copiar.
Em caso de conflito, prevalecem os documentos canônicos definidos pela arquitetura
do projeto.

## Arquitetura e padrões a preservar
Camadas, fluxos e feature de referência a espelhar; padrões existentes a reutilizar.

## Contratos envolvidos
Contratos públicos / `index.ts` tocados. Alterá-los é gatilho de escalonamento
(AGENTS.md §5–6).

## Critérios de aceitação
Condições objetivas e verificáveis para considerar a PR correta.

## Testes esperados
Que testes devem existir/passar (engine, regra, cálculo, inteligência, projeção —
CLAUDE.md §7).

## Documentação afetada
Documentos a atualizar, se houver.

## Riscos
O que pode dar errado ou exigir atenção.

## Pontos de escalonamento
Situações em que o Implementation Agent deve parar e escalar (AGENTS.md §6;
agent-protocol.md §7).

## Restrições
Limites rígidos desta PR. Exemplos:
- não alterar contrato público;
- não criar migration;
- não modificar UI;
- não instalar dependência;
- não ampliar o escopo.

## Definition of Done
Referência à checklist do CLAUDE.md (§8) + qualquer critério específico desta PR.

## Relatório final esperado
O handoff que a descrição da PR deve conter ao final (agent-protocol.md §4):
escopo entregue, decisões, validações executadas e resultados, comandos não
executados e motivo, riscos e pendências.
```

---

## Uso

Preencher os campos aplicáveis, remover os demais e anexar a especificação à
issue/PR. A partir daí a PR entra no estado *Ready for Implementation*
(`agent-protocol.md` §6). O objetivo do template é **habilitar PRs pequenas e
verificáveis** — se o preenchimento estiver ficando longo e burocrático, o escopo
provavelmente está grande demais e deve ser dividido.
