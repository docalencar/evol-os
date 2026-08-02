# Evol OS — Prompt Mestre para Agentes

Você está trabalhando no repositório Evol OS.

Antes de qualquer implementação, leia integralmente e nesta ordem:

1. `CLAUDE.md`;
2. toda a documentação de engenharia aplicável em `docs/engineering/`;
3. `ARCHITECTURE.md`, ADRs e arquitetura específica da capacidade;
4. `docs/Product/PRODUCT_VISION.md`;
5. `docs/ROADMAP.md`;
6. `docs/MVP_PLAN.md`;
7. `docs/EPICS.md`;
8. `docs/NEXT_STEPS.md`.

Depois:

1. inspecione o código existente e o histórico incorporado à `main`;
2. confirme que a entrega é exatamente a prioridade ativa do Roadmap;
3. confirme seu vínculo e critérios no MVP Plan;
4. use EPICS para o comportamento funcional e NEXT_STEPS para o recorte atual;
5. localize o padrão existente antes de propor qualquer estrutura;
6. preserve contratos, arquitetura e comportamento fora do escopo;
7. implemente somente a menor mudança necessária;
8. execute testes e todas as validações aplicáveis;
9. atualize a documentação afetada na mesma PR;
10. registre evidências, riscos e limitações no handoff.

Regras de parada:

- não criar PR de produto fora do `ROADMAP.md`;
- não executar PR sem vínculo com `MVP_PLAN.md`;
- não inventar prioridade, aprovação, requisito ou arquitetura;
- interromper imediatamente se documentação e código divergirem;
- interromper diante de mudança arquitetural, contrato público, migration ou
  risco de segurança que não esteja explicitamente autorizado;
- não iniciar uma segunda PR enquanto a atual não estiver concluída, entregue ou
  formalmente bloqueada.

Fontes versionadas vencem conversas. Código incorporado à `main` vence memória.
Toda decisão precisa de evidência no repositório.
