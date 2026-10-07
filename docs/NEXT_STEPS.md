# Evol OS — Próximo passo operacional

> Fonte curta do slice ativo. Método permanente em
> [`engineering/OPERATING-METHOD.md`](./engineering/OPERATING-METHOD.md).
> Estado canônico em [`PROJECT_STATE.md`](./PROJECT_STATE.md).

```
SLICE = T-E2E0D — reconciliação documental pós-bootstrap de Turnover
PATH  = GOVERNED
STATE = AGUARDANDO PUBLICAÇÃO
```

O contrato mínimo de Turnover está congelado em
[`Execution/T-P1-MINIMUM-TURNOVER-CONTRACT.md`](./Execution/T-P1-MINIMUM-TURNOVER-CONTRACT.md).
T-P1 e a precisão MTD estão publicados; T-DB1 está fechado; T-DB2, seu tooling
de promoção e a correção de evidência estão publicados; a migration `0142` está
`APPLIED_AND_VERIFIED` na Review canônica; e T-P2 está `PUBLISHED / MERGED /
POST-MAIN CI PASS` na canonical main
`07d5d021282ba723c04d344439018fc9610c73e8`. Nenhuma prova hosted de Turnover foi
executada, portanto Turnover ainda não é `HOSTED-PROVEN` nem `CLOSED`.

A discovery read-only encontrou `106` companies e zero rows no accumulator de
Turnover. A decisão de produto/governança aprovou uma única fixture sintética,
isolada e durável na Review canônica, com coverage amadurecida apenas por tempo e
observações canônicas. Seu lifecycle está congelado em
[`Execution/T-E2E0A-DURABLE-TURNOVER-FIXTURE-LIFECYCLE.md`](./Execution/T-E2E0A-DURABLE-TURNOVER-FIXTURE-LIFECYCLE.md).
O lifecycle T-E2E0A, o runner T-E2E0B e o transport/comando T-E2E0C estão
publicados. O bootstrap Review-only foi executado **uma única vez** e terminou em
`COVERAGE_STARTED`: existe exatamente uma fixture durável, coverage começou por
observação canônica e nada mais foi autorizado. Evidência e findings em
[`Execution/T-E2E0C-TURNOVER-BOOTSTRAP-COVERAGE-STARTED.md`](./Execution/T-E2E0C-TURNOVER-BOOTSTRAP-COVERAGE-STARTED.md).

## KNOWN_STATE

- Development permanece fechado em
  [`Execution/E2E-6-DEVELOPMENT-JOURNEY-CLOSURE.md`](./Execution/E2E-6-DEVELOPMENT-JOURNEY-CLOSURE.md);
- a jornada operacional de **Organization Planning** está `CLOSED / PASS /
  HOSTED-PROVEN`: run `260924115952-39d810`, `main`
  `71c0df749d92ad64a34349774a41b6dae3d3bd7e`, **9/9 PASS**, passos **1–19
  PASS**, sem retry, terminal **RETIRED**. Fechamento em
  [`Execution/PLN-P6-HOSTED-PLANNING-JOURNEY-CLOSURE.md`](./Execution/PLN-P6-HOSTED-PLANNING-JOURNEY-CLOSURE.md);
- Planning não equivale à Jornada 6: Turnover está implementado, publicado e
  promovido até Review, mas ainda aguarda prova hosted; clima, desempenho
  agregado, potencial, sucessão e planos estratégicos não foram promovidos a
  concluídos;
- o contrato MVP de Liderança está congelado em
  [`Execution/L-P1-LEADERSHIP-MVP-CONTRACT.md`](./Execution/L-P1-LEADERSHIP-MVP-CONTRACT.md);
- L-DB1 publicou e promoveu para Review a boundary
  `get_manager_leadership_attention_v1(uuid)` pela migration `0140`; L-P2 publicou
  o cutover de `/app/manager`, rotas donas e navegação na `main`
  `800ceb2282a4c9d6b58533455bc93d8bc4818ac1`;
- a **Jornada 5 — Liderança** está `CLOSED / PASS / HOSTED-PROVEN`: run
  `260926114143-bf6bb4`, **8/8 PASS**, passos **1–12 PASS**, uma execução, terminal
  **RETIRED**, build binding `assets:c3a7259bdd14e5d3` (17 assets). O SHA declarado
  `e6916b7a…` permanece `UNVERIFIABLE_FROM_DEPLOYMENT`. Fechamento em
  [`Execution/L-E2E11-LEADERSHIP-JOURNEY-CLOSURE.md`](./Execution/L-E2E11-LEADERSHIP-JOURNEY-CLOSURE.md).
  O run é terminal e não deve ser repetido;
- o contrato mínimo Executive está congelado em
  [`Execution/E-P1-MINIMUM-EXECUTIVE-DECISION-CONTRACT.md`](./Execution/E-P1-MINIMUM-EXECUTIVE-DECISION-CONTRACT.md),
  e o contrato/harness hosted está congelado em
  [`Execution/E-E2E0-HOSTED-EXECUTIVE-E2E-CONTRACT.md`](./Execution/E-E2E0-HOSTED-EXECUTIVE-E2E-CONTRACT.md);
- E-DB1 e E-DATA1 estão publicados. A leitura governada de Review confirmou
  `E_DB1_REVIEW_PRESENCE=PASS`, migration `0141` presente exatamente uma vez,
  `authenticated` com o `EXECUTE` contratado e nenhuma mutação remota;
- E-E2E2, E-E2E4 e E-E2E6 corrigiram somente o harness Executive. A correção
  E-E2E6 está na canonical main `1ade489eba49df607b450d3b74ce91adad7360d1`;
- o contrato mínimo Executive está `CLOSED / PASS / HOSTED-PROVEN`: run
  `260930023107-6e005e`, canonical main declarada
  `5c348c88adcd9800e4eb601380705d3e1f200e15`, 8/8 testes, passos 1–12 PASS em
  uma execução sem retry, build binding `assets:a6412db926663e75` sobre 17 assets,
  SHA declarado `UNVERIFIABLE_FROM_DEPLOYMENT` e terminal `RETIRED`. Fechamento em
  [`Execution/E-E2E1-HOSTED-EXECUTIVE-MINIMUM-CONTRACT-CLOSURE.md`](./Execution/E-E2E1-HOSTED-EXECUTIVE-MINIMUM-CONTRACT-CLOSURE.md);
- Turnover continua fora do contrato mínimo Executive já fechado. Sua boundary
  `get_company_turnover_v1` e o consumo exclusivo por Analytics estão publicados,
  mas a capacidade ainda não possui prova hosted;
- T-P1 congelou Turnover company-total para `owner/admin/hr`: desligamentos são
  apenas transições canônicas para `terminated`; headcount inclui `active` e
  `on_leave`; janela é mês UTC atual + anterior; histórico incompleto permanece
  indisponível e rehire/causa do desligamento ficam fora do MVP;
- o mês anterior é fechado; o mês atual é explicitamente MTD e usa
  `headcount_as_of` com `generated_at/headcount_as_of_at`, sem confundir o instante
  factual observado com `period_end_exclusive`;
- o drift global de ACL em Review permanece `OPEN / SEPARATE SECURITY DEBT`, fora
  do fechamento Planning. Production segue `UNKNOWN / REVERIFY BEFORE USE` e
  Legacy fora dos alvos.

## EXPECTED_NEXT

Publicar esta reconciliação documental. Depois, **esperar a virada UTC real**: a
fixture está em `COVERAGE_STARTED` e o próximo passo do lifecycle é a observação
de rollover, que só é autorizada após 2026-11-01 UTC e exige observação canônica
— esperar não é evidência de rollover. Fato positivo, a execução única de T-E2E0
e retirement continuam depois disso, cada um com gate temporal e autorização
própria.

Não fazer backfill, escrever diretamente no accumulator, alterar coverage,
produto, migration/RPC ou simular passagem do tempo.

Nenhum slice de Development está aberto. `cancel_development_plan_v1` continua
sem chamador na aplicação, deliberadamente fora da jornada congelada; reabrir
isso exige decisão de produto, não um slice técnico.

## Follow-ups registrados e não fechados

Nenhum deles bloqueia o Gate do MVP; nenhum foi misturado às correções do
D-E2E2.

| Finding | Origem | Natureza |
| --- | --- | --- |
| O journal arquivado `*.run.json.retired` mantém senhas sintéticas **não redigidas**, enquanto o irmão `*.retired.json` as redige | D-E2E2B | Higiene de credenciais. O diretório não é versionado e as identidades já foram banidas, mas a assimetria parece não intencional |
| O `<summary>` de um goal não expõe semântica de disclosure na árvore de acessibilidade | D-E2E2B | Acessibilidade de produto. Alcançável funcionalmente |
| O arquivo de run não persiste as contagens de retenção, apenas identidade, propriedade e estado terminal | D-E2E2B | Evidência: contagens não são re-verificáveis após o fato |
| O guard de publicação do D-E2E1 não está versionado sob `scripts/local/publish/guards/` | D-E2E1 | Governança de ferramenta |
| `PROMOTION_EVIDENCE_PERSISTENCE` — o tooling de promoção não persiste evidência PRE/POST durável no repositório | D-R2 | Governança de promoção |
| `TURNOVER_PIN_STALE_VS_MAIN` — com os dois checks de identidade agora reais, `EXPECTED_MAIN = c30ab3c9…` está desatualizado em relação à canonical main, então um bootstrap hoje seria corretamente recusado por `TURNOVER_BOOTSTRAP_STALE_MAIN`. Inócuo porque o bootstrap está consumido; rollover e fato positivo precisarão de pin próprio | T-E2E0E | Governança de identidade. **Repinar é decisão de governança, não efeito colateral de um fix** |
| `TURNOVER_SNAPSHOT_FIELD_NAMING` — `canonicalMain` e `migration0142Sha256` continuam dentro de `RemoteSnapshot`, embora sejam fatos **locais** do repositório. Os valores passaram a ser medidos, mas o tipo ainda sugere origem remota | T-E2E0E | Clareza de contrato. Renomear/separar o tipo ripple no schema de evidência durável já gravado |
| `NEXT_STEPS_SYNC_LAG` — o slice ativo ficou desatualizado em quatro slices consecutivos, chegando a declarar como não publicado um tooling que o Git provava mergeado | T-E2E0C | Governança de contexto. Endereçado em OPERATING-METHOD §12 por esta slice |

## STOP_CONDITIONS

O bootstrap está consumido e não se repete. `COVERAGE_STARTED` não torna o
período corrente elegível, não autoriza prova hosted e não permite retirement.
Observação de rollover, fato positivo, a execução única de T-E2E0 e retirement
são fases separadas, cada uma com gate temporal e autorização própria. Não
autoriza mudança de produto, DB, migration, RPC, backfill, alteração artificial
de coverage, Production ou Legacy.
