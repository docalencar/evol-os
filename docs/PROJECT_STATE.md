# Evol OS — Project State

## 1. Objetivo

O Evol OS é um copiloto de gestão de pessoas e desenvolvimento organizacional.
Sua missão é tornar práticas modernas de RH simples, inteligentes e acessíveis,
preservando a decisão humana. A definição completa está na
[Product Vision](./Product/PRODUCT_VISION.md).

Este documento é apenas a fotografia do estado atual do programa. Ele não cria
prioridade, produto ou arquitetura e não substitui as fontes normativas.

## 2. Como trabalhar neste projeto

Toda entrega segue o fluxo oficial:

```text
Discovery
  → Product Decision
  → ADR
  → Reconciliação
  → Implementation Plan
  → Implementação
  → Validação
  → Commit
```

As regras, gates e condições de parada estão no
[MASTER_PROMPT](./Prompts/MASTER_PROMPT.md). Cada etapa só ocorre quando as
dependências anteriores estiverem documentadas e aprovadas.

## 3. Fonte de verdade

Conversas não são normativas. Para intenção e decisões, a precedência é:

1. Product Decisions;
2. ADRs;
3. Implementation Plans versionados;
4. PROJECT_STATE.md;
5. código incorporado ao repositório;
6. conversas, apenas como contexto não normativo.

O PROJECT_STATE.md é uma fotografia oficial do estado do programa. Ele não cria decisões nem substitui Product Decisions, ADRs ou Implementation Plans; sua função é consolidar o estado atual do projeto e orientar a navegação pela documentação.

## 4. Estado atual

### Product Decisions

| Decisões | Status oficial |
| --- | --- |
| PD-001 a PD-015 | Vigentes no catálogo permanente; sem campo de status individual |
| PD-016 — Assessment Authorization Policy | ✅ Approved |
| PD-017 — Notification Domain Policy | ✅ Approved |
| PD-018 — Global Competency Concepts and Tenant Mapping | ✅ Approved |
| PD-019 — Tenant Multiuser Activation Policy | ✅ Approved |

### ADRs

| ADRs | Estado |
| --- | --- |
| ADR-0001 a ADR-0006 | Arquitetura-base vigente |
| ADR-0007 a ADR-0009 | Planejamento, snapshots, projeções e IA vigentes |
| ADR-0010 — Assessment Authorization | Implementada |
| ADR-0011 — Notification Domain Architecture | Implementada |
| ADR-0012 — Tenant-Owned Referential Integrity Strategy | Programa em andamento |
| ADR-0013 — Platform Global Authority and Trusted Execution | ✅ Accepted e implementada na PR 3B |
| ADR-0014 — Deterministic Development Template Application and Snapshots | ✅ Accepted e implementada; PR 3C encerrada em `5c2675b` |
| ADR-0015 — Tenant Multiuser Activation Architecture | ✅ Accepted; MVP-PR1 em andamento |
| ADR-0016 — Invitation Delivery Architecture | ✅ Accepted e implementada nas Phases 5/6 |

O status normativo e o conteúdo completo permanecem no
[índice de ADRs](./adr/README.md).

### Roadmap e execução

- [ROADMAP](./ROADMAP.md): Phase 9 Multiuser UI/UX é a execução vigente.
- [NEXT_STEPS](./NEXT_STEPS.md): validação e aprovação da PR 9D1 — secure People access-state read boundary.
- [MVP Plan](./MVP_PLAN.md): jornada completa até o MVP.
- [EPICS](./EPICS.md): estado funcional das capacidades.
- [Implementation Plan do MVP-PR1](./Execution/MVP-PR1-TENANT-MULTIUSER-ACTIVATION-IMPLEMENTATION-PLAN.md):
  Phases 1–8 e PRs 9A–9C concluídas; PR 9D dividida em 9D1/9D2 e 9D1 implementada.

## 5. Programa ADR-0012

| Slice | Escopo | Status | Commit |
| --- | --- | --- | --- |
| Slice 1 | Organization, People e Competencies | ✅ Concluído | `7271f49117a2ac376614b95d765f8cc3d4874479` |
| Slice 2 | Recruitment | ✅ Concluído | `9c6695819850ddb69237e9bec7688d0a8864b908` |
| Slice 3A | Operational Development Integrity | ✅ Concluído | `fe3d8914ce4da54e85f94794b367582971403ffa` |
| Slice 3B | Global Concepts and Tenant Mappings | ✅ Concluído e versionado | `f4a1a5d94afa0ef76132f18ac6b1ade5636ffda1` |
| Slice 3C | Deterministic Template Application and Snapshots | ✅ Concluído | `5c2675b` |

## 6. Próxima etapa

A execução vigente é a Phase 9 — Multiuser UI/UX. As Phases 1–8 estão
concluídas: a fundação persistente, Trusted Persistence, delivery/aceite,
preferência de tenant e o cutover de autorização já estão incorporados. A Phase
8 foi encerrada pela caracterização 8A e pelas migrations 0077/0078.

A PR 9A foi concluída no merge `b4aae86`, a PR 9B no merge `3070855` e a PR 9C
no merge `4d7b037`. A PR 9D foi dividida em dois recortes. O recorte ativo é a
PR 9D1: migration 0079 e RPC `get_people_access_state_v1`, uma projeção
`SECURITY DEFINER` mínima para owner/admin ativo. A tabela de invitations segue
sem SELECT autenticado, sem policy de leitura e sem `service_role` no caminho
humano.

Após a aprovação da 9D1, o próximo recorte é a PR 9D2 — People Access-State UI +
Invitation Resend/Revoke, consumindo a fronteira segura sem expor a tabela bruta.

Resumo de encerramento das fases anteriores:

- Phases 1/2: migrations 0070–0072 e invariantes persistentes;
- Phase 3: migration 0074, sete RPCs confiáveis e `ACTOR != EXECUTOR`;
- Phase 4: **Complete by Prior Delivery**;
- Phase 5: emissão, reenvio, revogação, token lifecycle e delivery;
- Phase 6: aceite, integração Auth e continuidade login/signup;
- Phase 7: resolver determinístico, preferência persistida e Action de seleção;
- Phase 8: caracterização de autorização e hardening 0077/0078.

As fronteiras vigentes continuam `SECURITY DEFINER`, `auth.uid()` como ator
humano, tenant revalidado no banco e nenhuma operação humana baseada em
`service_role`.

## 7. Arquitetura consolidada

- Clean Architecture e responsabilidades por camada;
- Domain-Driven Design;
- Composition Roots e Server Factories;
- Server Actions como fronteiras finas;
- Trusted Persistence;
- Secure Administrative Read;
- autorização capability-based;
- autoridade humana separada do executor técnico;
- Global Competency Concepts e versionamento imutável;
- Tenant Mapping;
- snapshots e lineage;
- Development Templates híbridos;
- integridade tenant-owned por FKs compostas;
- RLS e defesa em profundidade.

Detalhes permanecem em [Arquitetura](../ARCHITECTURE.md),
[ADRs](./adr/README.md) e [padrões](./Architecture/patterns/).

## 8. Princípios arquiteturais invioláveis

Alteração destes princípios exige nova Product Decision ou ADR, conforme a
natureza da mudança:

- snapshots são imutáveis;
- histórico nunca é reescrito;
- IA apenas sugere; confirmação e decisão pertencem ao humano;
- operações privilegiadas são server-only;
- menor privilégio e fail-closed são obrigatórios;
- ator humano e executor técnico são identidades distintas;
- operações privilegiadas e decisões humanas são auditáveis;
- resolução e aplicação são determinísticas;
- `company_members` nunca concede autoridade global;
- `service_role` nunca representa autoria humana;
- nenhum identificador tenant-owned atravessa empresas;
- documentação e código divergentes interrompem a implementação.

## 9. Histórico resumido

Este resumo oferece orientação; o registro oficial de entregas é o
[CHANGELOG](./CHANGELOG.md).

| Entrega | Descrição | Commit ou referência |
| --- | --- | --- |
| Fundação inicial | Auth, empresas e primeiros domínios | Histórico anterior às PRs numeradas |
| PR #6 e #10–#14 | Workspaces e Engineering Foundation | [CHANGELOG](./CHANGELOG.md) |
| PRs #15–#45 | Organization Planning | [CHANGELOG](./CHANGELOG.md) |
| PRs #46–#57 | KPI Platform | [CHANGELOG](./CHANGELOG.md) |
| PRs #59–#76 | Executive Decision Center e Financeiro | [CHANGELOG](./CHANGELOG.md) |
| Assessment Hardening | PD-016 e ADR-0010 | `597ec0b` |
| Notification Hardening | PD-017 e ADR-0011 | `b9d51cd` |
| ADR-0012 Slice 1 | Núcleo tenant-owned | `7271f49` |
| ADR-0012 Slice 2 | Recruitment | `9c66958` |
| Executive Composition Root | Composição server do Executive Home | `bd96398` |
| ADR-0012 Slice 3A | Development operacional | `fe3d891` |
| Governança da PR 3B | PD-018, plano e ADR-0013 | `730dd29`, `11063e0`, `9a256fc` |
| ADR-0012 Slice 3B | Global Concepts e Tenant Mappings | `f4a1a5d` |
| PR 3C — Fase 3 | Trusted Persistence | `fe08394` |
| PR 3C — Fase 4 | Application Layer e composição | `5c1d12f` |
| PR 3C — Fase 5 | Contrato retrocompatível | `08bd7cf` |
| PR 3C — Fase 6 | Actions e experiência mínima | `ca2f173` |
| PR 3C — Fase 7 | Testes, observabilidade e cutover V2 | `95625d4` |
| PR 3C — encerramento | Validação final e encerramento histórico | `5c2675b` |
| MVP-PR1 — Phase 1 | Persistence Foundation | `48d71fa` |
| MVP-PR1 — Phase 2 | Persistent Invariants | `dbf592c` |
| Extension schema hardening | Migration 0073 e ambiente canônico alinhado | `f77b229` |
| MVP-PR1 — Phase 3 | Trusted Persistence / Actor != Executor | `3559a9b` |

## 10. Como iniciar uma nova conversa

1. Leia o [MASTER_PROMPT](./Prompts/MASTER_PROMPT.md) e este PROJECT_STATE.
2. Confirme o estado do worktree, ROADMAP e NEXT_STEPS.
3. Leia somente as Product Decisions, ADRs e planos relacionados à entrega atual.
4. Nunca use conversas anteriores como especificação.
5. Compare documentação e código e interrompa diante de divergência.
6. Somente proponha implementação quando prioridade, dependências e autorização
   estiverem explícitas nos documentos versionados.

## 11. Referências oficiais

- [MASTER_PROMPT](./Prompts/MASTER_PROMPT.md)
- [Product Decisions](./Product/PRODUCT_DECISIONS.md)
- [ADRs](./adr/README.md)
- [Implementation Plan do MVP-PR1](./Execution/MVP-PR1-TENANT-MULTIUSER-ACTIVATION-IMPLEMENTATION-PLAN.md)
- [ROADMAP](./ROADMAP.md)
- [NEXT_STEPS](./NEXT_STEPS.md)
- [MVP Plan](./MVP_PLAN.md)
- [EPICS](./EPICS.md)
- [CHANGELOG](./CHANGELOG.md)
- [Product Vision](./Product/PRODUCT_VISION.md)

## Regra de Ouro

Este documento é uma fotografia oficial do estado do projeto.

Ele nunca cria decisões.

Ele nunca substitui Product Decisions, ADRs ou Implementation Plans.

Quando houver divergência entre documentos, prevalece obrigatoriamente a seguinte ordem:

1. Product Decisions
2. ADRs
3. Implementation Plans
4. PROJECT_STATE.md
5. Código
6. Conversas

Toda divergência interrompe imediatamente a implementação até sua reconciliação.

Este documento existe para facilitar a continuidade do desenvolvimento, nunca para substituir a documentação normativa.
