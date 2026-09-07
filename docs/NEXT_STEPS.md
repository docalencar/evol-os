# Evol OS — Próxima entrega

```
MAIN=4a0e4c250c80f486a00d23e8445b1fd4d25e0086   (merge do PR #90)
E2E-3=CLOSED/PASS   run 260907195352-b20ffd   39/39   RETIRED
PRÓXIMO=E2E-4 — Ciclo completo de Avaliação
```

## 1. Estado canônico

**E2E-3 — Career / Seniority / Competencies: CLOSED / PASS.** Provado em hosted
Canonical Review pelo run `260907195352-b20ffd` (39/39 PASS, 6.1 min, terminal
state `RETIRED`), sem regressão de produto nem de segurança. A cadeia
Competency → Seniority → Position×Seniority → expectativa contextual → Person
Seniority → evidência → gap canônico → transição de status está provada ponta a
ponta pela UI real. Evidência completa em
[`Execution/E2E-3-CAREER-COMPETENCY-CLOSURE.md`](./Execution/E2E-3-CAREER-COMPETENCY-CLOSURE.md).

**Não rerodar E2E-3.** Um rerun só se justifica com mudança invalidante:
alteração nas migrations `0120`–`0125`, no boundary
`get_tenant_person_competency_expectations_v1`, em
`deriveCanonicalPersonCompetencyCoverage`, ou nas superfícies que as specs 08/09/10
dirigem. Fora disso o run é custo sem informação.

## 2. Orientação anterior — SUPERSEDED

> **SUPERSEDED (2026-09-07, autoridade `main`/`4a0e4c2`).** A revisão anterior
> deste documento apontava a **Career Slice 4B — Competency Matrix + Scale
> Semantics (UI)** como próximo gate "ainda não iniciada", e proibia criar a
> migration `0122`. Ambas as afirmações deixaram de descrever o produto: a UI da
> matriz existe e foi dirigida por navegador em hosted Review (spec 08), e as
> migrations `0122`–`0126` já estão em `main`. **Não reimplementar Career 4B.**
> O histórico permanece em
> [`Execution/CAREER-SENIORITY-POSITION-TAXONOMY-IMPLEMENTATION-PLAN.md`](./Execution/CAREER-SENIORITY-POSITION-TAXONOMY-IMPLEMENTATION-PLAN.md)
> como registro, não como direção. O **Position Uniqueness audit gate** (plano §9)
> segue sendo um gate separado de decisão humana, read-only.

Dívidas documentais correlatas, registradas e não corrigidas aqui: a revisão
anterior linkava `docs/execution/` em minúscula (o caminho tracked canônico é
`docs/Execution/`), e `apps/web/e2e/README.md` ainda descreve apenas as specs 00
e 01.

## 3. Próximo journey — E2E-4: ciclo completo de Avaliação

**Escolhido:** template → seção → pergunta vinculada a competência → ciclo →
participantes → ativação → geração → resposta → submit → resultado pontuado, com
isolamento de tenant e autorização por ator.

**Por que este, e não a hipótese Assessment → Feedback → Development.** A
discovery mediu os três domínios no código de `main` e a cadeia está partida em
dois dos três elos:

| Elo | Situação real |
| --- | --- |
| Assessment (template → submit → resultado) | **IMPLEMENTED_AND_WIRED** ponta a ponta, RPCs `0110`–`0118`, rotas `/app/assessments/**`, sem `service_role` no caminho |
| Assessment → Feedback | **schema-only.** `feedback_threads.assessment_id` existe (`0043`) mas nenhum RPC de leitura o retorna e nada no submit abre thread |
| Feedback (autoria) | **sem superfície.** `createFeedbackConversationAction` não é chamada por nenhum componente; o módulo é inbox de leitura/resposta |
| Gap → Development | **inexistente.** Nenhum caminho cria PDI a partir do gap canônico; a única origem de plano é aplicação de template |
| Development (execução) | ações nascem congeladas — não há caminho para concluir uma ação, então o progresso é estruturalmente 0% |

Provar a cadeia completa exigiria **implementar produto** (superfície de criação
de feedback, boundary de leitura do vínculo, caminho de criação de PDI) dentro de
um gate cujo propósito é produzir evidência. Avaliações também é a dependência
normativa correta: no `MVP_PLAN.md`, Desenvolvimento depende de Avaliações **e**
Feedback, e o Gate do MVP nomeia a jornada de avaliação explicitamente.

## 4. Propriedades a provar

Cada uma exige sinal primário de sucesso do produto **antes** do readback
durável, conforme a lição de E2E-3.

1. Template criado como `active` e lido de volta no catálogo.
2. Seção criada dentro do template e lida de volta na estrutura.
3. Pergunta criada **vinculada a uma competência** do catálogo do tenant.
4. Preview renderiza a estrutura persistida.
5. Ciclo criado em `draft` sobre o template ativo.
6. Participante adicionado ao ciclo.
7. Ciclo transicionado `draft → active`.
8. Geração produz as avaliações e o snapshot de execução.
9. Avaliador responde e a resposta sobrevive a reload (autosave + readback).
10. Submit é aceito e a resposta fica imutável.
11. Resultado pontuado é **derivado pelo servidor** — a spec lê o valor renderizado, nunca recalcula.
12. Avaliado vê o próprio resultado no diretório "Meus resultados".
13. Isolamento: tenant B não vê template, ciclo nem resultado de A; id estrangeiro indistinguível de inexistente.
14. Autorização: ator sem papel administrativo não obtém superfície administrativa do ciclo.
15. Teardown alcança estado terminal saudável com auditoria preservada.

## 5. Gaps conhecidos

**REQUIRED_FOR_JOURNEY**

- *HARNESS_GAP* — `assessment_questions`, `assessment_answers` e as três tabelas
  de snapshot da `0114` não estão **nem** em `COMPANY_RETENTION_TABLES` **nem** em
  `COMPANY_SCOPED_TABLES` (`apps/web/e2e/lifecycle/retention-registry.ts`). O
  inspetor residual não as sonda e as postconditions de retirement não as
  fotografam. Hoje isso fica mascarado porque `activity_events` já força `RETIRED`
  em qualquer run que crie organização e pessoas — é lacuna de observabilidade e
  de completude do registro, não uma falha iminente.
- *WIRING_GAP* — o único controle `draft → active` de ciclo vive no diálogo de
  edição da tabela na home, não na página de detalhe onde o operador está. A spec
  consegue navegar; registrar para não parecer defeito quando aparecer no trace.

**BLOCKER** — nenhum para E2E-4.

**DEFERRED_DEBT**

- *DOMAIN_GAP* — a resolução de template de PDI lê `competencies.expected_level`
  (catálogo global), não `position_seniority_competencies`. O `expected_level`
  gravado em `development_goals` diverge do gap canônico sempre que a expectativa
  contextual difere do default. O dashboard executivo de Development **já** usa o
  boundary canônico (`0124`); o caminho que produz conteúdo de PDI não.
- *DOMAIN_GAP* — a sugestão de PDI por IA na página da Pessoa usa a fórmula legada
  de sinal invertido (`currentLevel - expectedLevel`) via adaptador de
  compatibilidade, e não persiste nada.
- *PRODUCT_GAP* — Development: sem criação manual de plano, sem conclusão de ação,
  sem revisões periódicas, sem superfície do próprio colaborador; `/app/development/templates`
  fora da navegação e nenhuma UI publica versão de template, o que torna a
  aplicação inalcançável a partir de um template novo.
- *PRODUCT_GAP* — Feedback: sem CTA de criação; a tier de visibilidade `management`
  existe na RLS mas é inalcançável pelo RPC de listagem.
- *SECURITY_GAP (contido)* — anonimato de direct report vale na superfície
  agregada da `0119`, mas a visão administrativa do ciclo lista o avaliador
  nominalmente, inclusive em respostas `direct_report`. Não bloqueia E2E-4; a
  spec 14 não deve assumir anonimato fora da superfície `0119`.
- *POLISH* — `/app/assessments/cycles/[id]` chama leitura administrativa sem guarda
  e cai em `error.tsx` para não-administrador, em vez de estado de negação;
  `DevelopmentMonthlyEvolutionCard` é renderizado duas vezes.

## 6. Primeiro slice recomendado

**E4-S1 — prontidão de teardown para o domínio de Avaliações.** Somente harness:
completar o registro de retenção/inspeção com as cinco tabelas ausentes, com
evidência de migration por linha, e estender o guard que hoje só verifica um dos
sentidos da relação entre as duas listas. Sem produto, sem migration, sem hosted
run. É o menor passo que torna o run seguinte auditável.

Depois: **E4-S2** catálogo + ciclo (propriedades 1–7), **E4-S3** geração,
execução, submit e resultado (8–12), **E4-S4** isolamento e autorização (13–14).

## 7. Fora de escopo

Implementar criação de feedback; criar PDI a partir de gap ou de avaliação;
migrar a resolução de template para o boundary canônico; conclusão de ação e
revisões de PDI; corrigir o anonimato na visão administrativa; qualquer migration
nova; reabrir Career 4B; rerodar E2E-3.

## 8. Invariantes de ambiente

- Production `gzrrwyiqfbnyprkdeqvm` — **UNKNOWN / REVERIFY BEFORE USE.**
- Legacy `oudngmrdtgengilpqqnz` — **NOT A PROMOTION TARGET.**

## 9. Regra de parada

Não iniciar E4-S1 sem autorização explícita. Não implementar produto sob cobertura
de gate de teste. Não criar migration. Não rodar hosted Review sem gate próprio.
Não promover Production/Legacy. Sem push sem autorização.
