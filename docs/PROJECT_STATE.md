# Evol OS — Project State

> **Fotografia do estado atual.** Não cria prioridade, produto nem arquitetura, e
> não substitui as fontes normativas. Não narra história: o histórico detalhado
> vive no Git (`git log -p docs/PROJECT_STATE.md` recupera as narrativas de
> reconciliação anteriores), no [CHANGELOG](./CHANGELOG.md), nos closure docs de
> `Execution/` e nas ADRs.
>
> Método de trabalho: [`../CLAUDE.md`](../CLAUDE.md) e
> [`engineering/OPERATING-METHOD.md`](./engineering/OPERATING-METHOD.md).
> Slice ativo: [`NEXT_STEPS.md`](./NEXT_STEPS.md).

## Snapshot

| Campo | Valor |
| --- | --- |
| `CURRENT_DOMAIN` | Development (Jornada 4) |
| `CURRENT_SLICE` | D-R3 — promoção governada de `0134` para Review — `CLOSED / PASS` |
| `LAST_CANONICAL_MAIN` | D-R3 fechado; autoridade factual = `git rev-parse origin/main` |
| `LATEST_COMMITTED_MIGRATION` | `0134` — Development ledger direct-read closure |
| `LATEST_REVIEW_DB_VERSION` | `0134` — `APPLIED / VERIFIED` (promoção governada D-R3) |
| `HOSTED_E2E_STATE` | E2E-0…E2E-5 `CLOSED / PASS`. `E2E-6` não definido; contrato hosted de Development **não congelado**; próxima run hosted **não autorizada** |
| `NEXT_GATE` | Definição do próximo slice pelo Product Architect; nenhuma promoção adicional autorizada |

AI Context Protocol v1 e D-SEC1 estão publicados em `main`; `0134` está promovida
e verificada em Review.

## Precedência

1. Product Decisions;
2. ADRs;
3. Implementation Plans versionados;
4. este documento;
5. código incorporado ao repositório;
6. conversas — contexto não normativo.

Quando documentação e código divergirem, a implementação para até a reconciliação.
Para **estado factual do repositório**, o Git vence; ver `OPERATING-METHOD.md` §1.

## Slices majores fechados

| Slice | Escopo | Estado |
| --- | --- | --- |
| D-P0 | Development privacy, atores e lifecycle — contrato congelado | CLOSED / PASS |
| D-DB1 | Development trusted read/mutation boundary | CLOSED / PASS |
| D-P1/D-P2 | Development reads autorizadas e progresso canônico | CLOSED / PASS |
| D-DB2 | Historical plan origin read boundary (`0133`) | CLOSED / PASS |
| D-R2 | Tooling governado de promoção + promoção de `0133` para Review | CLOSED / PASS |
| D-P3 | Jornada de template authoring + integração da origem histórica | CLOSED / PASS |
| D-SEC0 | Discovery e contrato do hardening do ledger de Development | CLOSED / PASS |
| D-SEC1 | Fechamento do SELECT direto no ledger de Development (`0134`) | CLOSED / PASS |
| D-R3 | Tooling governado + promoção/verificação de `0134` em Review | CLOSED / PASS |
| AI-CTX-1 | Método permanente de execução governada | CLOSED / PASS |

O contrato de cada um está no respectivo documento de `Execution/`; os commits e
os runs de CI estão no Git. **Não reexecutar slices fechados** sem evidência nova
que os invalide.

## Product Decisions e ADRs

| Catálogo | Estado |
| --- | --- |
| PD-001 … PD-022 | Vigentes. Conteúdo normativo em [`Product/PRODUCT_DECISIONS.md`](./Product/PRODUCT_DECISIONS.md) |
| ADR-0001 … ADR-0018 | Vigentes. Estado individual e conteúdo no [índice de ADRs](./adr/README.md) |

Os dois catálogos são a autoridade; este documento não replica o status
individual para não criar uma segunda verdade.

## Open findings

| Finding | Estado |
| --- | --- |
| **Development ledger privacy** — membros autenticados do tenant tinham `SELECT` direto nas quatro relações do ledger de aplicação de template | `CLOSED / PASS` — D-SEC1 publicada e `0134` aplicada/verificada em Review por D-R3 |
| **Plan detail sem origem histórica** — a página de detalhe do PDI não exibe "Template de origem" | `DEFERRED_PRODUCT_ENHANCEMENT` — não é regressão |
| **`getPublishedDevelopmentTemplateCatalog`** — sem consumidor ativo após o cutover da origem histórica | `RETAINED_CAPABILITY` — semântica distinta (catálogo atual ≠ origem histórica); preservado para a jornada de aplicação |
| **App smoke remoto autenticado (Slice 0115-B2-C)** | `NOT DEMONSTRATED (gated)` — dívida aceita; registro em [CHANGELOG](./CHANGELOG.md) |
| Itens abertos anteriores ao D-P0 (hardening `0084`, writes MVP-PR1, matriz de transições de Feedback, gates de privacidade People) | **Não readjudicados.** Narrativa recuperável por `git log -p docs/PROJECT_STATE.md` e pelo CHANGELOG |

## Open decisions

| Decisão | Dono |
| --- | --- |
| Momento de congelar o contrato hosted de Development e atribuir `E2E-6` | Depende de readiness, não de calendário |

O escopo do D-SEC1 permanece congelado e fechado; qualquer evolução futura exige
novo slice.

## Arquitetura consolidada

Clean Architecture por camadas; DDD; Composition Roots e Server Factories; Server
Actions como fronteiras finas; Trusted Persistence; Secure Administrative Read;
autorização capability-based; autoridade humana separada do executor técnico;
Global Competency Concepts com versionamento imutável; Tenant Mapping; snapshots e
lineage; Development Templates híbridos; integridade tenant-owned por FKs
compostas; RLS e defesa em profundidade.

Detalhe em [`../ARCHITECTURE.md`](../ARCHITECTURE.md) e [`adr/`](./adr/).

## Princípios arquiteturais invioláveis

- snapshots são imutáveis e o histórico nunca é reescrito;
- IA apenas sugere; confirmação e decisão pertencem ao humano;
- operações privilegiadas são server-only, de menor privilégio e fail-closed;
- ator humano e executor técnico são identidades distintas;
- operações privilegiadas e decisões humanas são auditáveis;
- resolução e aplicação são determinísticas;
- `company_members` nunca concede autoridade global;
- `service_role` nunca representa autoria humana;
- nenhum identificador tenant-owned atravessa empresas;
- documentação e código divergentes interrompem a implementação.

## Referências oficiais

[Product Vision](./Product/PRODUCT_VISION.md) · [ROADMAP](./ROADMAP.md) ·
[MVP_PLAN](./MVP_PLAN.md) · [EPICS](./EPICS.md) · [CHANGELOG](./CHANGELOG.md) ·
[ADRs](./adr/README.md) · [Environment Governance](./Execution/ENVIRONMENT-GOVERNANCE.md) ·
[Environment Identity](./Execution/ENVIRONMENT-IDENTITY.md)
