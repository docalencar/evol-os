# Próximos passos — Organization Planning

## Estado atual

Scenario Execution está integrado à `main`.

Entregas consolidadas:

- Projection Pipeline e Projection Engine;
- ordenação determinística;
- Scenario Executor e Scenario Execution Result;
- métricas reutilizadas do Projection Engine;
- identificação dos Change Sets realmente executados;
- continuação controlada após erros;
- rejeição antecipada de IDs duplicados;
- imutabilidade defensiva;
- contrato `generatedAt: Date` preservado;
- testes, build e `git diff --check` aprovados;
- revisão P0/P1 aprovada.

## Próxima unidade: Scenario Comparison

**Objetivo:** comparar o snapshot base com o estado produzido pela execução da
projeção.

Resultados esperados:

- resumo estrutural;
- colaboradores adicionados, alterados, movidos, arquivados ou removidos;
- departamentos, times e posições criados, alterados ou arquivados;
- variação de headcount e de métricas;
- dados adequados para dashboard, aprovação, auditoria e exportação.

Fora do escopo inicial:

- UI;
- persistência do resultado;
- aprovação e publicação;
- PDF e planilha;
- recomendações generativas por IA.

## Ordem prevista

1. Scenario Comparison
2. Planning Indicators
3. Planning Dashboard
4. Scenario Approval
5. Scenario Publication
6. Audit Trail
7. Exportação

## Continuidade entre agentes

Ao trocar de conversa ou agente, fornecer apenas:

- objetivo da próxima PR;
- branch atual;
- documentos canônicos;
- arquivos diretamente relacionados;
- último resultado de validação.

Não copiar o histórico completo do projeto.
