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
| `CURRENT_DOMAIN` | Liderança (Jornada 5) — `CLOSED / PASS / HOSTED-PROVEN`; próximo domínio normativo ainda não aberto |
| `CURRENT_SLICE` | L-E2E11 — fechamento canônico da jornada Liderança · `DOCUMENTATION-ONLY` |
| `LAST_CANONICAL_MAIN` | `e6916b7a3125535154badd25186ee91c84f12a80`; autoridade factual = `git rev-parse origin/main` |
| `LATEST_COMMITTED_MIGRATION` | `0140` — trusted Leadership attention read boundary |
| `LATEST_REVIEW_DB_VERSION` | `0140` — `APPLIED / VERIFIED` |
| `HOSTED_E2E_STATE` | E2E-0…E2E-6, PLN-P6 e Liderança `CLOSED / PASS`. Liderança: run `260926114143-bf6bb4`, **8/8 PASS**, passos **1–12 PASS**, build binding `assets:c3a7259bdd14e5d3` (17 assets), SHA declarado `e6916b7a…` com `commitShaVerification = UNVERIFIABLE_FROM_DEPLOYMENT`, terminal **RETIRED**. Fechamento em `Execution/L-E2E11-LEADERSHIP-JOURNEY-CLOSURE.md` |
| `NEXT_GATE` | readiness discovery do próximo domínio normativo — Executive / decisão executiva, `Parcial` em `MVP_PLAN.md`. Nenhuma implementação autorizada; a ordem canônica pede discovery antes de contrato, boundary e cutover |

Congelar o contrato **não equivale** a um PASS hosted: o D-E2E0 fixa o que precisa
ser provado. O PASS correspondente existe e está registrado em
`Execution/E2E-6-DEVELOPMENT-JOURNEY-CLOSURE.md`, contra `main`
`44b61e613c7e0ae4386670103bbea8fce627e425`, alvo Review canônica.

### Prontidão da jornada Development

Verificada diretamente do repositório, não de um resumo: das dezoito capacidades
da jornada D-P0 sondadas no código da aplicação, **dezessete estão presentes** —
autoria de template, publicação, obsolescência, aplicação pelo manager com
readiness e confirmação, start/complete/skip de ações, registro e leitura de
reviews, ativação e conclusão de plano, origem histórica e o serviço de
capabilities derivado no servidor.

`cancel_development_plan_v1` **não possui chamador na aplicação**; cancelamento
permanece fora da jornada hosted congelada. Ausência registrada para que um slice
futuro não a confunda com regressão.

### Fechamento de Organization Planning

PLN-P6 provou em Review o fluxo operacional de autoria, concorrência sem
overwrite, lifecycle com rejeição durável, readiness, publicação, snapshot
imutável, organização viva inalterada, terminalidade, isolamento entre tenants e
aposentadoria dos caminhos legados/DML direto. Isso fecha Planning, não toda a
Jornada 6: as capacidades estratégicas enumeradas em `Product/USER_JOURNEYS.md`
continuam abertas.

### Fechamento de Liderança

A Jornada 5 está `CLOSED / PASS / HOSTED-PROVEN`. O run `260926114143-bf6bb4`
provou, numa execução, os doze passos congelados por L-E2E0: fila derivada ao vivo
restrita aos direct reports atuais, roteamento para a resposta de Assessment exata,
conclusão da avaliação, criação e releitura canônica do Feedback formal, aplicação
do PDI ausente com reautorização do domínio dono, progresso e review, rederivação
da fila a partir de fatos duráveis, e isolamento entre tenants não-oracular.

A identidade provada é de **build**, não de commit: `assets:c3a7259bdd14e5d3` sobre
17 assets servidos. O SHA `e6916b7a…` é declarado e permanece
`UNVERIFIABLE_FROM_DEPLOYMENT` — a aplicação não serve metadado de build. Liderança
fechada **não** fecha a Jornada 6 nem a decisão executiva.

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
| D-P4A | Cutover de execução e reviews; remoção do setter genérico de status | CLOSED / PASS |
| D-P4B | Consumo/aplicação de template publicado pelo manager | CLOSED / PASS |
| D-E2E0 | Contrato do hosted Development E2E — congelado e canônico | CLOSED / PASS |
| D-E2E1 | Spec hosted da jornada Development contra o contrato congelado | CLOSED / PASS |
| D-E2E2 | Execução hosted da jornada Development em Review — E2E-6 | CLOSED / PASS |
| PLN-P1…P6 | Lifecycle, trusted boundaries, editor e execução hosted de Organization Planning | CLOSED / PASS |
| L-P1 | Contrato MVP de Liderança — atenção derivada, direct reports e reuso de Assessment/Feedback/Development | CLOSED / PASS |
| L-DB1 | Trusted Leadership attention read boundary (`0140`) e promoção para Review | CLOSED / PASS |
| L-P2 | Cutover application/UI/navigation para a boundary canônica | CLOSED / PASS |
| AI-CTX-1/2/3 | Método permanente, estado condensado e reconciliação de contexto | CLOSED / PASS |

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
| **Plan detail sem origem histórica** | `CLOSED` — D-P4A passou a resolver a origem no detalhe do PDI |
| **`getPublishedDevelopmentTemplateCatalog` sem consumidor ativo** | `CLOSED` — D-P4B lhe deu consumidor ativo na superfície de aplicação pelo manager, exatamente a jornada para a qual a capacidade havia sido preservada |
| **App smoke remoto autenticado (Slice 0115-B2-C)** | `NOT DEMONSTRATED (gated)` — dívida aceita; registro em [CHANGELOG](./CHANGELOG.md) |
| Itens abertos anteriores ao D-P0 (hardening `0084`, writes MVP-PR1, matriz de transições de Feedback, gates de privacidade People) | **Não readjudicados.** Narrativa recuperável por `git log -p docs/PROJECT_STATE.md` e pelo CHANGELOG |
| **Drift global de ACL em Review fora de Planning** | `OPEN / SEPARATE SECURITY DEBT` — não bloqueia nem é fechado por PLN-P6; requer slice próprio |

## Open decisions

| Decisão | Dono |
| --- | --- |
| — | Nenhuma decisão aberta registrada aqui. O gate hosted de Development foi congelado, numerado `E2E-6` e fechado |

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
