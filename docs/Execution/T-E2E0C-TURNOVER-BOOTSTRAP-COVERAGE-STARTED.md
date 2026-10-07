# T-E2E0C — Durable Turnover fixture: bootstrap executado, `COVERAGE_STARTED`

> Registro de uma mutação Review consumida. Não autoriza rollover, fato positivo,
> prova hosted, retirement nem nova execução do bootstrap.

| | |
| --- | --- |
| Canonical main | `32753a83f49e3e21e8c0a49eaa6b6908c9d35f8b` |
| Review ref | `rwfvxvbzaosgcyfxdjpt` |
| Comando | `npm --workspace apps/web run e2e:turnover:bootstrap-review` |
| Invocações | **1** — autorizada, consumida, sem retry |
| Resultado | `TURNOVER_BOOTSTRAP_RESULT=COVERAGE_STARTED` |
| Lifecycle | `PLANNED` → `BOOTSTRAPPED` → **`COVERAGE_STARTED`** |
| Production / Legacy | `NOT_ACCESSED` |

## 1. O que existe agora

Exatamente uma fixture durável, conforme o invariante de instância única de
[`T-E2E0A`](./T-E2E0A-DURABLE-TURNOVER-FIXTURE-LIFECYCLE.md):

| Papel | UUID |
| --- | --- |
| company sintética | `3d88eaa1-2e68-44fe-bbde-97943c6e54a7` |
| actor `owner` | `32e07116-dab0-47cc-a273-acf7e63eae74` |
| employee `owner` | `416a688e-c65a-4d58-ac20-9b4824995b2a` |
| employee `employee` | `4a21ed7e-81b5-4cae-a895-111bac90d277` |

Marker `evol-turnover-durable-fixture-v1`, owner slice `T-E2E0A`, journal
`revision 4`. O journal e a evidência vivem fora do Git, em
`apps/web/.turnover-fixture/` (modo `0600`, diretório `0700`, ignorado por
`.gitignore:20`), e não contêm senha nem chave.

## 2. PRE e TOCTOU — a instância única foi provada, não presumida

PRE e TOCTOU foram capturados separadamente e ambos registram
`markerCompanyIds = []`: **nenhuma** company marcada existia antes da mutação, de
modo que o bootstrap não adotou tenant preexistente e não criou a segunda
instância que o contrato proíbe. Ambos registram também `migration0142Count = 1`
e `migration0142Sha256 = 17a8d02f8fdf915122d68666ca8714ba5ba2ea62ebebd759b9a81e32b558a4c9`,
idêntico ao hash do payload em `supabase/migrations/0142_create_company_turnover_boundary.sql`
na canonical main — a metade de payload da identidade da mutação fecha.

## 3. Mutações canônicas

Quatro tentativas, todas `VERIFIED`, nenhuma repetida:

| # | Kind | Target | Instante |
| --- | --- | --- | --- |
| 1 | `actor` | `32e07116…` | `2026-10-07T21:04:27.126Z` |
| 2 | `company` | `3d88eaa1…` | `2026-10-07T21:04:29.594Z` |
| 3 | `employee` | `4a21ed7e…` | `2026-10-07T21:04:32.078Z` |
| 4 | `first-observation` | `3d88eaa1…` | `2026-10-07T21:04:32.833Z` |

Os receipts no journal são `people-created` (`4a21ed7e…`) e
`turnover-boundary-observed` (`3d88eaa1…`). Coverage começou em
`2026-10-07T21:04:31.099156+00:00` — pelo caminho canônico de People e pela
leitura autorizada do boundary, não por escrita em
`company_turnover_monthly_facts`, não por backfill e não por manipulação de
timestamp de coverage.

## 4. O boundary respondeu indisponível — e isso é o resultado correto

```
currentAvailability     = unavailable
currentUnavailableReason = incomplete_coverage
observedPeriods          = []
```

T-E2E0A §Canonical observations and time prevê exatamente isto: um bootstrap em
outubro de 2026 inicia coverage no instante real da observação, não em 1º de
outubro, logo **outubro é permanentemente incompleto**. A ausência de fato não é
falha do bootstrap nem lacuna de produto: é a propriedade que torna o fato
positivo futuro confiável. Nenhuma porcentagem foi calculada pelo harness e
nenhum fato foi inferido fora do que o boundary retornou.

## 5. O que esta slice **não** prova

- nenhum período virou; `MTD_ELIGIBLE` continua inalcançado;
- a observação de rollover só é autorizada **após 2026-11-01 UTC** e exige
  observação canônica — esperar não é evidência de rollover;
- nenhum fato positivo de turnover existe; nenhum employee foi transicionado;
- o run único de T-E2E0 **não** foi consumido; credenciais hosted não foram
  carregadas;
- Turnover não é `HOSTED-PROVEN` nem `CLOSED`, e a Jornada 6 segue parcial.

## 6. Findings registrados, não corrigidos aqui

### `TURNOVER_BOOTSTRAP_STALE_MAIN` — o guard é tautológico

`bootstrap-runner.ts:80` recusa uma main stale:

```ts
if (snapshot.canonicalMain !== EXPECTED_MAIN) throw new Error("TURNOVER_BOOTSTRAP_STALE_MAIN")
```

mas `operational-transport.ts:52` monta o snapshot com
`canonicalMain: EXPECTED_MAIN`. A comparação é da constante contra si mesma, logo
**o guard não pode falhar** e não é load-bearing. A consequência visível é que
`bootstrap-evidence.json` registra `canonicalMain = c30ab3c96fead374c5e334c3e56e345764d5924c`
— o pin — e não a main real `32753a83…` contra a qual o bootstrap correu.

Impacto nesta execução: **nenhum**, porque a identidade foi conferida fora do
runner antes da invocação: `c30ab3c9…` é ancestral de `32753a83…` por quatro
commits, e esses quatro commits são exatamente T-E2E0B e T-E2E0C — o próprio
tooling. O payload de `0142` é byte-idêntico ao pin. A identidade da mutação
(§6 — *(commit canônico de origem, SHA256 do payload)*) está portanto coerente.

Por que não corrigir aqui: esta é uma slice documental. Reparar o guard altera
tooling capaz de mutar ambiente canônico, o que exige slice própria, publicação
antes de receber credencial, e uma decisão sobre reemitir ou anotar a evidência
durável já gravada com o pin. Fica em follow-ups.

### `NEXT_STEPS_SYNC_LAG`

O slice ativo ficou desatualizado em quatro slices consecutivos, chegando a
declarar `LOCAL IMPLEMENTATION READY FOR PUBLICATION` um tooling que o Git
provava mergeado (`ab79ec4` → `785c35c` → `a1aedf1`). Nenhuma execução foi
tomada a partir do documento obsoleto — a reconstrução foi sempre feita pelo Git,
conforme §1 — mas o próximo executor começa pelo slice ativo, então a defasagem é
defeito de governança por si. Endereçado por esta slice em
[`OPERATING-METHOD`](../engineering/OPERATING-METHOD.md) §12, que passa a exigir
prompt mínimo, fatos descobríveis não recopiados, e reconciliação de
`NEXT_STEPS`/`PROJECT_STATE` **dentro** da slice que mudou o estado.

## 7. Próximo passo

Publicar esta reconciliação. Depois aguardar a virada UTC real e autorizar
separadamente a observação de rollover. Não repetir o bootstrap.
