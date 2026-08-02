# Evol OS — Mapa da documentação

## Governança

| Assunto | Fonte oficial |
| --- | --- |
| Como trabalhar | [`../CLAUDE.md`](../CLAUDE.md) |
| Visão do produto e limites do MVP | [`Product/PRODUCT_VISION.md`](./Product/PRODUCT_VISION.md) |
| Próxima prioridade | [`ROADMAP.md`](./ROADMAP.md) |
| Jornada completa até o MVP | [`MVP_PLAN.md`](./MVP_PLAN.md) |
| Estado funcional das capacidades | [`EPICS.md`](./EPICS.md) |
| Próxima entrega operacional | [`NEXT_STEPS.md`](./NEXT_STEPS.md) |
| Grandes entregas incorporadas | [`CHANGELOG.md`](./CHANGELOG.md) |
| Arquitetura | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) e [`adr/`](./adr/) |
| Integridade tenant-owned | [`Architecture/patterns/tenant-owned-referential-integrity.md`](./Architecture/patterns/tenant-owned-referential-integrity.md) |
| Engenharia | [`engineering/`](./engineering/) |
| Produto | [`Product/`](./Product/) |
| Domínio de Notifications | [`domain/NOTIFICATION_DOMAIN.md`](./domain/NOTIFICATION_DOMAIN.md) |
| Prompt padrão para agentes | [`prompts/MASTER_PROMPT.md`](./prompts/MASTER_PROMPT.md) |

## Regra de precedência

Código incorporado à `main` comprova o estado implementado. Documentação oficial
governa intenção, prioridade, processo e contratos. Quando os dois divergirem, a
implementação para até que a documentação seja reconciliada com evidências.

Documentos históricos e auditorias preservam contexto, mas não substituem as
fontes oficiais da tabela acima.
