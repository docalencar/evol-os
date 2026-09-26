# L-E2E11 — Leadership journey: hosted closure

> Registro de resultado da Jornada 5 — Liderança. Não amplia o contrato de
> produto, não declara a Jornada 6 — RH Estratégico nem a decisão executiva
> concluídas, e não autoriza nova execução hosted.

| | |
| --- | --- |
| Canonical Review | `https://evol-os-review.vercel.app` |
| Supabase Review ref | `rwfvxvbzaosgcyfxdjpt` |
| Run | `260926114143-bf6bb4` |
| Result | **8/8 PASS** — identity 4/4 e jornada 4/4, uma execução |
| Frozen journey | **passos 1–12 PASS** |
| Verdict durável | `LEADERSHIP_JOURNEY=PASS` |
| `declaredCommitSha` | `e6916b7a3125535154badd25186ee91c84f12a80` |
| `commitShaVerification` | **`UNVERIFIABLE_FROM_DEPLOYMENT`** |
| Build binding | `assets:c3a7259bdd14e5d3` — 17 assets |
| `providerRequestId` | `gru1::29dxn-1790422903333-b8ade416c810` (correlator de requisição, não identidade de deployment) |
| Terminal state | **RETIRED** |
| Production / Legacy | `NOT_ACCESSED` |

## 1. Objetivo e escopo

Fecha o contrato hosted congelado em
[`L-E2E0-HOSTED-LEADERSHIP-E2E-CONTRACT.md`](./L-E2E0-HOSTED-LEADERSHIP-E2E-CONTRACT.md),
que por sua vez operacionaliza
[`L-P1-LEADERSHIP-MVP-CONTRACT.md`](./L-P1-LEADERSHIP-MVP-CONTRACT.md).

O que está fechado é a **jornada MVP de Liderança**: fila de atenção derivada ao
vivo, roteamento para o domínio dono, e rederivação a partir de fatos duráveis.
Liderança não introduz modelo de escrita próprio; toda mutação continuou passando
pela trusted boundary do domínio dono.

## 2. Identidade do deployment — o que foi provado e o que não foi

O run está ligado a um **build**, não a um commit:

- `assetFingerprint = assets:c3a7259bdd14e5d3` sobre **17** URLs `/_next/static/…`
  servidas pelo próprio deployment. Isso é evidência observável, na mesma acepção
  que o preflight de identidade já usa.
- `buildId = null` é o esperado: a aplicação é App Router, que não serve build id.
- `declaredCommitSha = e6916b7a3125535154badd25186ee91c84f12a80` é uma
  **declaração do chamador**, registrada com o status
  **`UNVERIFIABLE_FROM_DEPLOYMENT`**. A aplicação não serve metadado de build, logo
  nenhum asset confirma esse SHA.

Este fechamento **não afirma** que o deployment serviu aquele commit. Afirma que a
jornada passou contra o build identificado acima, num alvo Review canônico, e que
o SHA declarado coincide com `origin/main` no momento do run. `x-vercel-id` é
correlator de requisição e não nomeia deployment.

## 3. Jornada congelada — 12/12

| Bloco | Passos | Substância | Resultado |
| --- | --- | --- | --- |
| A | 1–5 | o manager run-owned autentica pela fronteira normal do produto, entra em **Liderança** por navegação autenticada, a fila traz apenas o direct report ativo, com razão/prioridade/source canônicos, e ausência do não relacionado do mesmo tenant e do owner do tenant B | PASS |
| B | 6–8 | o item roteia para a resposta de Assessment exata, a avaliação atribuída é concluída pelo produto, e o Feedback formal é criado e relido canonicamente pela fronteira de Feedback | PASS |
| C | 9–11 | a aplicação do PDI ausente alcança Development, o manager aplica um template publicado, chega ao PDI exato, registra progresso e review, retorna a Liderança e um render novo rederiva a fila a partir dos fatos duráveis do domínio dono | PASS |
| D | 12 | isolamento confiável em runtime e linhagem estática: nenhum read ampliado/direto de People, nenhuma autorização no browser, nenhum score genérico, resumo pronto ou caminho de reconhecimento falso | PASS |

## 4. Rederivação — provada pelos dados, não por asserção

A fila antes e depois está persistida na evidência durável. Ela mudou porque os
fatos mudaram, não porque o browser previu algo:

**`initialQueue`**

| subject | reason | priority | source_type | source_status |
| --- | --- | --- | --- | --- |
| `19458b5e…` | `assigned_assessment_pending` | `medium` | `assessment_response` | `draft` |
| `19458b5e…` | `development_plan_missing` | `low` | `development_subject` | `missing` |

**`finalQueue`**

| subject | reason | priority | source_type | source_status |
| --- | --- | --- | --- | --- |
| `19458b5e…` | `development_follow_up_due` | `medium` | `development_plan` | `active` |

Ambas as razões iniciais desapareceram depois de a avaliação ser concluída e o PDI
aplicado, e uma razão nova apareceu apontando para o plano criado
(`a5b8bff6…`). As razões permaneceram independentes: duas linhas para o mesmo
sujeito no início, sem colapso atrás de score.

## 5. Identidades canônicas do run

| Papel | ID |
| --- | --- |
| manager (ator) | `eadd65d0-67ed-4505-801a-27c43ed179c3` |
| direct report (sujeito) | `19458b5e-7ba1-454c-8309-d6d5b916e68b` |
| não relacionado, mesmo tenant | `d37017ae-4189-4556-878b-f2c7cc0e9c7a` |
| pessoa do tenant B | `8a05b0ed-296a-482f-a83d-f36c510f1352` |
| company do tenant B | `3c7f01a3-76e2-4946-af11-195985dbf64d` |
| Assessment response | `0bd93385-541a-4e64-89e5-337de801c714` |
| template version publicada | `483fffd0-28cb-4df0-97c0-42f1ecc0d0b3` |
| PDI | `a5b8bff6-32b8-4a95-b76a-c5f291098fa4` |
| ação do PDI | `41054241-62e7-4268-b3c6-d46958663a88` |

## 6. Isolamento entre tenants

O contrato exige as quatro propriedades independentemente do status de transporte,
e a evidência durável carrega as identidades que as tornam verificáveis:

- o manager do tenant A vê o direct report atual e não o colaborador não
  relacionado — `unrelatedId` está registrado e ausente das linhas de fila;
- o owner do tenant B e sujeitos estrangeiros nunca aparecem na evidência de fila
  do tenant A — `foreignPersonId` e `foreignCompanyId` registrados, ausentes das
  filas;
- uma chamada autenticada do tenant B usando o tenant A como seletor é negada de
  forma não-oracular;
- essa negação não expõe identidade de sujeito/source nem controle de mutação.

O tenant B é um segundo tenant real, provisionado no mesmo run por
`ensureRunOwnedForeignTenant`, não um identificador sintético.

## 7. Mapa critério → evidência (L-E2E0 §Evidence and isolation)

| Critério do contrato | Chave/artefato que o prova |
| --- | --- |
| 12 step verdicts | `steps: [1…12]` + `verdict: LEADERSHIP_JOURNEY=PASS` |
| deployment/run identity | `deployment` no journal retirado + `runId` |
| actor and subject IDs | `managerId`, `subjectId` |
| exact source IDs / reasons / priorities / routes | linhas de `initialQueue` / `finalQueue` com `source_id`, `reason`, `priority`, `source_type` |
| pre/post queue rows | `initialQueue` → `finalQueue` |
| Assessment completion | `responseId` |
| formal Feedback readback | passos 6–8 PASS |
| PDI / action / review readback | `templateVersionId`, `planId`, `actionId` |
| tenant-isolation probes | `unrelatedId`, `foreignPersonId`, `foreignCompanyId` |
| exclui respostas, conteúdo de mensagem, texto privado de review e credenciais | o arquivo de evidência não possui campo de conteúdo; senhas aparecem redigidas no journal arquivado |
| teardown `RETIRED` | journal arquivado como `.run.json.retired` + `.retired.json` |

## 8. Evidências duráveis preservadas

```
apps/web/e2e/.run/archive/260926114143-bf6bb4/leadership-journey-evidence.json
apps/web/e2e/.run/archive/260926114143-bf6bb4.run.json.retired
apps/web/e2e/.run/archive/260926114143-bf6bb4.retired.json
apps/web/e2e/.run/artifacts/17-leadership-journey-Lead-decab-writes-durable-run-evidence-authenticated/
```

O artefato operacional e os journals ficam no arquivo gitignored do harness, sob o
run acima; não são copiados para Git. Os valores citados neste documento foram
conferidos contra esses arquivos antes da publicação.

## 9. Retenção e teardown

Teardown alcançou **RETIRED**. Ausência de deleção física não é falha quando
evidência durável de domínio — Assessment, Feedback, Development — deve permanecer
imutável; o que seria falha é fixture não-owned, credencial ativa ou retirement
ignorado. A spec não deletou histórico durável nem introduziu um segundo mecanismo
de limpeza.

## 10. O run é terminal

**O run `260926114143-bf6bb4` não deve ser repetido.** Ele é a execução única
autorizada do contrato L-E2E0 e seu resultado está registrado aqui. Uma futura
execução exigiria autorização própria e um motivo que não seja reconfirmação.

## 11. Dívidas de follow-up — nenhuma bloqueante

Nenhuma delas é elevada a blocker por este fechamento, e nenhum contrato as
declara bloqueantes:

| Dívida | Estado |
| --- | --- |
| Drift global de ACL em Review | `OPEN / SEPARATE SECURITY DEBT` — exige slice próprio |
| Observabilidade do commit SHA | `FOLLOW_UP_DEBT` — servir o build SHA pela aplicação é mudança de produto |
| Persistência do veredito final no journal | `FOLLOW_UP_DEBT` — mitigado em parte: a evidência durável já carrega `steps` e `verdict` |
| `cancel_development_plan_v1` sem chamador | `FOLLOW_UP_DEBT` — decisão de produto, fora da jornada congelada |
| Production | `UNKNOWN / REVERIFY BEFORE USE` — fora dos alvos |
| Escopo atual de CI | `FOLLOW_UP_DEBT` — CI executa lint e build |

O contrato L-E2E0 exige "deployment/run identity", satisfeito pelo build binding.
Ele **não** exige SHA verificado, logo `UNVERIFIABLE_FROM_DEPLOYMENT` não enfraquece
este fechamento — mas também não deve ser lido como SHA provado.

## 12. Limites deste fechamento

Este documento fecha a **Jornada 5 — Liderança** no recorte MVP congelado em L-P1.
Ele **não**:

- declara a **Jornada 6 — RH Estratégico** concluída: turnover, clima, desempenho
  agregado, potencial, sucessão e planos estratégicos seguem abertos, e o
  fechamento de Organization Planning já registrou esse limite;
- declara **decisão executiva** provada: Executive permanece `Parcial` em
  `../MVP_PLAN.md`;
- amplia o contrato de Liderança para além do MVP: alertas duráveis, indiretos,
  roll-ups organizacionais, scores, reconhecimento avulso, check-ins e
  one-on-ones continuam fora de escopo por L-P1 §11;
- promove Production a alvo.

## 13. Nota de método

A jornada exigiu dez slices de harness (L-E2E1…L-E2E10) e cinco execuções
hosted antes desta. Quatro falhas foram defeitos de harness em que a spec 17
redescobria — erradamente — contratos de interação que a spec 15 já codificava:
gating de dialog em portal, identidade de coluna, identidade de entidade e gating
de disclosure `<details>`. L-E2E10 extraiu esse contrato para
`apps/web/e2e/helpers/development-interactions.ts` e proibiu, por guard
cross-spec, que cada spec volte a derivá-lo. O registro fica aqui para que a
próxima jornada comece a partir do contrato compartilhado, e não do zero.
