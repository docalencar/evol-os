<!--
Descrição da PR = handoff da implementação (docs/engineering/agent-protocol.md §4).
Preencha o que for aplicável; remova o que não for. Não use "N/A" decorativo.
Especificação da mudança: docs/engineering/pr-template.md
-->

## Objetivo
<!-- O que esta PR entrega (objetivo único). -->

## Escopo implementado
<!-- O que foi feito. -->

## Fora de escopo
<!-- O que explicitamente não foi feito. -->

## Arquivos / áreas principais
<!-- Onde a mudança acontece. -->

## Decisões relevantes
<!-- Escolhas de implementação e padrões reutilizados (onde já existiam). -->

## Contratos ou arquitetura afetados
<!-- index.ts, contratos públicos, camadas. Se alterou, houve aprovação? (AGENTS.md §5) -->

## Validações executadas
<!-- Marque apenas o que REALMENTE executou. -->
- [ ] `npm run check` (testes + build)
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run lint`

### Comandos NÃO executados
<!-- OBRIGATÓRIO declarar. Liste cada validação não executada e o motivo.
     A ausência de teste nunca deve ficar oculta. -->

### Resultado
<!-- Saída/resumo dos comandos executados acima. -->

## Testes adicionados ou atualizados
<!-- Quais, e o que cobrem (engine/regra/cálculo/inteligência/projeção). -->

## Documentação atualizada
<!-- Documentos tocados, ou "nenhuma alteração relevante". -->

## Riscos e limitações

## Pendências
<!-- Itens em aberto ou dúvidas para o próximo papel. -->

## Próximo papel responsável
<!-- Quem recebe o handoff. Ex.: Quality Reviewer | Human Reviewer (AGENTS.md). -->

---

## Checklist de revisão
<!-- Referências, não reprodução. Fonte da checklist: CLAUDE.md §8. -->
- [ ] Definition of Done atendida (checklist do `CLAUDE.md` §8)
- [ ] Arquitetura, contratos e padrões preservados (`CLAUDE.md` §4–§6)
- [ ] Sem duplicação de regra; reuso verificado (`CLAUDE.md` §5)
- [ ] Papéis e fronteiras respeitados (`AGENTS.md`)
- [ ] Handoff e validações declarados com honestidade (`agent-protocol.md` §4, §8)
