# F-GATE1 — Foundation sweeps: detector validado sobre baseline RED

> Registra um **detector**, não uma correção. Não fecha a capacidade Fundação,
> não corrige nenhum offender ADR-0012 e não autoriza migration, promoção ou
> acesso remoto.

| | |
| --- | --- |
| Canonical main do fechamento original | `c90581b9785be050ab41d51e9e10c9fe6a3dcac2` |
| Canonical main desta reconciliação | `3bce00a88dff89ee0be23059f46e0fb889dd5907` |
| Runner | `scripts/local/verify-f-gate1-foundation-sweeps.sh` |
| Veredicto do slice | **`F_GATE1_DETECTOR=PASS`** |
| Baseline ADR-0012 original | **37 offenders** — `ADR_0012_FK_SWEEP=FAIL`, RED por desenho |
| Baseline executável atual | **32 offenders** — redução de 5 por F-DB1b, mantendo o sweep RED por desenho |
| Baseline efetivo em Review | **NÃO VERIFICADO COMO 32** — migrations `0143`/`0144` não foram promovidas |
| Production / Legacy / Review | `NOT_ACCESSED` |
| Turnover | `NOT_TOUCHED` |

## 1. Por que existe

ADR-0012 foi aplicada em quatro slices — `0064` (Organization/People/
Competencies), `0065` (Recruitment), `0066` (Development operacional) e `0128`
(Feedback) — cada uma com suíte própria asseverando **as próprias tabelas**.
Ninguém fazia a pergunta globalmente, então uma tabela que nenhuma lista
mencionava era silenciosamente conforme: passava em todas as suítes porque
nenhuma suíte falava dela. `MVP_PLAN.md:23` marca Fundação como **Bloqueada** por
"integridade relacional dos domínios consumidores ainda pendente", e nada media
isso.

## 2. A regra é derivada, não inventada

ADR-0012 §"FK composta" torna a FK composta obrigatória quando origem e destino
são Tenant-Owned (Root ou Child). §"FK simples" permite FK simples em exatamente
quatro casos — `company_id → companies(id)`, destino Global Entity, System Entity
global (`auth.users`), e Derived Entity → pai quando o filho **não possui**
`company_id`.

**Todos os quatro têm um lado sem `company_id`.** Logo o teste operacional que a
própria ADR dá para "tenant-owned" — presença de `company_id` — faz a lista de
exceções cair fora da regra. A varredura não carrega **nenhuma** allow-list
escrita à mão e não pode ser enfraquecida acrescentando um nome a uma.

Ordem de coluna não é asseverada: a ADR diz que constraints compostas
pré-existentes em outra ordem permanecem válidas (caso de Notifications,
`(company_id, id)`), então o invariante é pertinência de `company_id` nas duas
listas de chave, nunca posição.

## 3. Evidência preservada da execução real

```
DB_RESET=PASS
NO_MIGRATION_ALTERS_DEFAULT_PRIVILEGES=PASS
ACL_POSTURE_BASELINE=PASS
F_GATE1_EXCLUDING_KNOWN_ADR_0012_GAP=PASS
ADR_0012_FK_SWEEP=FAIL          ← único vermelho, 37 offenders preexistentes
```

O `DB_RESET` só passou depois de **E-DB1-GATE1**: 32 arquivos untracked
`" 2.sql"`/`" 3.sql"` em `supabase/migrations`, byte-idênticos aos canônicos,
faziam o CLI aplicar 16 versions duas ou três vezes e violar
`schema_migrations_pkey` — o CLI enumera o **diretório**, não o git. Quarentena
reversível em `~/Desktop/evol-docs/quarantine-migration-duplicates-20261007/`,
com `DIAGNOSIS.md` provando identidade byte a byte de cada um. O histórico
versionado estava limpo: 142 arquivos tracked, 142 versions distintas.

## 4. Três defeitos do próprio gate, corrigidos antes do fechamento

Nenhum foi resolvido afrouxando asserção.

**(a) Checks de regressão por tabela — `HARNESS_DEFECT`.** A primeira versão
asseverava "estas TABELAS têm zero violações" por slice, e `0066` e `0128`
ficaram vermelhos. Uma slice só responde pelo que criou: `0066` nunca tocou
`development_plans.template_id` (`0011:5-8`), e `0128` nunca tocou as colunas de
origem legadas `feedback_threads.assessment_id`/`.development_plan_id`/
`.competency_id` (`0043:36,40,44`). Ambas são **dívida real** — o teste
overclaimava. Regressão passou a ser **por constraint**, nomeando as constraints
que cada slice efetivamente criou.

**(b) `count = 32` cego — `HARNESS_DEFECT`.** A contagem falhava informando só um
número, e a causa teve de ser reconstruída à mão do histórico:
`0125:69` **retirou a tabela `position_competencies`** inteira (expectativas
canônicas de Position migraram para `position_seniority_competencies`; a retirada
é terminal, nenhuma migration posterior recria), levando consigo duas das 32
constraints de `0064`. Esperado correto: **30**. A asserção virou diferença de
conjunto que **nomeia o que falta**, mais a asserção recíproca de que o conjunto
esperado tem 30 entradas — sem ela, apagar um nome da lista faria o teste passar
pelo motivo errado. Um gate que não imprime a própria evidência é defeito por si.

**(c) Duas asserções ACL eram hipótese, não contrato — retiradas.** O gate
asseverava zero default ACL em `public` e zero `TRUNCATE` de cliente; ambas
ficaram vermelhas. A proibição canônica (`0121:18`, `0126:36`, `0127:76`,
`promotion-tooling-guards-0129.test.mjs:56`) é sobre **o SQL que nós escrevemos**
não usar `ALTER DEFAULT PRIVILEGES` — nunca sobre o estado do banco. A plataforma
instala os próprios default privileges: `CHANGELOG.md:27` e
`ENVIRONMENT-MIGRATION-STATUS.md:187` dizem que os grants que `0121` revogou foram
*"inherited from the Supabase environment's default privileges"*. `TRUNCATE` vem
no mesmo pacote. Manter as asserções seria afirmar que a plataforma é configurada
de outro jeito — inventar política para virar vermelho em verde. Ambas foram
retiradas, o assunto virou censo, e a proibição migrou para onde é verdadeira:
check estático sobre o **texto** das migrations, no runner.

De brinde, a primeira versão desse check estático marcou `0121`, `0126` e `0127`
— pelos **comentários** que prometem não usar `ALTER DEFAULT PRIVILEGES`.
Reproduzi o defeito clássico deste repo, guard casando com a própria prosa; agora
julga a superfície executável.

## 5. Onde as varreduras moram, e por quê

Em **`supabase/gates/`**, não em `supabase/tests/`.

A varredura ADR-0012 é vermelha por desenho. Um arquivo permanentemente vermelho
sob `supabase/tests` tornaria `supabase test db` vermelho para sempre, e **todo
outro gate em `scripts/local` assevera `FULL_DB_SUITE=PASS`** — uma baseline
honesta derrubaria a frota inteira de harness e destruiria o significado daquele
sinal em todos os lugares. `supabase/historical-tests` é o precedente existente
para pgTAP fora da execução padrão; `supabase/gates` o segue. A asserção **não**
foi enfraquecida, pulada nem marcada `TODO` — ela roda integralmente, só não pelo
runner da frota.

## 6. O que a postura ACL deliberadamente **não** decide

`ACL_POSTURE_BASELINE` é censo e fingerprint, não veredito. "Tabela CLOSED" nunca
é definida como conjunto no repo (três menções, nenhuma definição), e os
precedentes commitados encodam **três posturas distintas**: revoke total sem
reconcessão (`0063`, `0069`, `0114`, `0121`, `0131`, `0135`, `0136`, `0142`);
revoke total com `grant select` de volta (`0076`, `0130`); e revoke parcial
(`0112`, só `INSERT`). Uma regra "zero privilégio de cliente" reprovaria as duas
últimas por um contrato que nunca assinaram. **STOP registrado, não resolvido.**

Mais: após `supabase db reset` os privilégios locais **são** o efeito líquido das
migrations, logo o banco local não pode discordar do repo sobre a própria
postura. O drift é diferencial local-versus-Review, nascido do ambiente
hospedado. O artefato útil é portanto a `CLIENT_PRIVILEGE_FINGERPRINT` — md5
determinístico sobre as triplas ordenadas `tabela:grantee:privilégio` — contra a
qual uma leitura read-only **autorizada** da Review pode ser comparada byte a
byte. Igual = sem drift; diferente = o ambiente concedeu o que nenhuma migration
concedeu. Essa comparação é slice própria.

## 7. O gate também é detector prospectivo

No fechamento original, o runner fixava `BASELINE_OFFENDERS=37`. Esse valor é a
evidência histórica inicial e não deve ser reescrito. Após F-DB1b, o runner fixa
`BASELINE_OFFENDERS=32`, com a proveniência `F-DB1b: 37 -> 32`, e continua
falhando se a contagem se mover em **qualquer** direção:

- **para cima** — nova dívida ADR-0012 entrou; classificar antes de qualquer coisa;
- **para baixo** — dívida foi corrigida; atualizar a baseline **citando a slice**
  que a moveu.

Nunca ajustar a baseline para silenciar um vermelho. Os offenders são
classificados pelo próprio sweep em três censos, por discriminador mecânico e não
editorial: destino **tem** `unique (id, company_id)` → dívida simples, FK composta
aplicável hoje; destino **não tem** → a correção precisa criar a chave candidata
primeiro; `company_id` nullable em algum lado → listado, mas **não é desculpa**,
porque `0067:207,223` já constrói FK composta para `development_templates`, cujo
`company_id` é nullable pelo check híbrido de `0009:40`.

## 8. Limites do fechamento original

O fechamento original registrou o detector sobre 37 offenders. Naquele estado,
ele **não**:

- corrige nenhum dos 37 offenders — isso é F-DB1, slice própria, deliberadamente
  não misturada aqui;
- conclui a capacidade **Fundação**, que segue `Bloqueada` em `MVP_PLAN.md`;
- resolve a postura de privilégio de cliente, que segue `STOP`;
- fecha o drift global de ACL em Review, que segue
  `OPEN / SEPARATE SECURITY DEBT` e exige leitura remota autorizada;
- toca a fixture durável de Turnover, que segue em `COVERAGE_STARTED` aguardando
  a virada UTC real.

## 9. Reconciliação pós-F-DB1b

F-DB1b substituiu cinco FKs simples da execução de Assessment por FKs compostas
tenant-aware, preservando nomes canônicos, `MATCH SIMPLE`, `ON UPDATE NO ACTION`
e `ON DELETE CASCADE`. A mudança foi publicada pelo PR
[#207](https://github.com/docalencar/evol-os/pull/207), candidate
`a9ca2e68c268eba76f54d5aaf7916b8030b08df4`, merge
`3bce00a88dff89ee0be23059f46e0fb889dd5907`.

Evidência local e de publicação:

- CI do candidate: run `37979789567`, `SUCCESS`;
- CI pós-main: run `37980078515`, `SUCCESS`;
- workspace DB suite: `4835/4835 PASS`;
- verifier/shared probe: `28/28 PASS`;
- embeddings PostgREST employee/evaluator: HTTP 200, com controle negativo
  `PGRST200`;
- Foundation: 37 PRE, 32 POST, sem offender novo;
- fingerprint RLS/ACL/RPC PRE/POST:
  `62a89ab96bfc36037ed442e5ab664a38`;
- fingerprint das FKs fora do escopo PRE/POST:
  `085bd0f33b035a4a2fb0ac0a403ab53e`;
- drift rejection, rollback integral, teardown e ausência de resíduos: `PASS`.

Esse é o **baseline executável do Git/local**. Não é prova do estado efetivo da
Review: `0143` e `0144` estão publicadas no Git, mas não foram promovidas ao
ambiente. A promoção continua separada e bloqueada pelo contrato operacional de
Turnover; este registro não autoriza acesso remoto nem promoção de banco.

## 10. Próxima correção proposta: F-DB1c

A próxima slice mínima proposta cobre somente:

- `assessment_responses.assessment_cycle_id` →
  `assessment_cycles(id, company_id)`;
- `assessment_answers.assessment_response_id` →
  `assessment_responses(id, company_id)`.

Ambos os destinos já possuem candidate key `(id, company_id)`. A implementação
deve depender da sequência `0143` → `0144`, preservar os nomes públicos das FKs,
provar a semântica nullable de `assessment_answers.assessment_response_id` e
reutilizar o verifier PostgREST isolado de F-DB1b. Se aprovada e comprovada, a
redução esperada do detector é 32 → 30. Esta seção registra desenho para revisão;
não autoriza migration ou implementação.

O catálogo já contém índices cujo primeiro campo é `assessment_cycle_id` em
`assessment_responses` e `assessment_response_id` em `assessment_answers`. Planos
locais usam esses índices e filtram `company_id`; como os ids dos pais são UUIDs
globalmente únicos, não há evidência atual para acrescentar índices compostos.
Qualquer índice novo exige prova separada por catálogo/planner.

O verifier isolado é reutilizável, mas sua função compartilhada hoje fixa o
recurso HTTP em `assessment_responses`. F-DB1c precisa de uma extensão genérica e
retrocompatível que permita selecionar `assessment_answers`, mantendo a mesma
classificação HTTP e os consumidores F-DB1b intactos. Isso é evolução de harness,
não mudança de produto. O caso answers → responses já possui duas relações no
schema; a prova deve usar explicitamente
`assessment_responses!assessment_answers_assessment_response_id_fkey`, exigir
HTTP 200/array e manter `PGRST201` como falha e `PGRST200` apenas como controle
negativo deliberado.

## 9. Movimentos governados da baseline

| Slice | Movimento | O que mudou |
| --- | --- | --- |
| F-GATE1 | — | baseline original **37**, detector validado sobre RED |
| F-DB1b | 37 → **32** | cinco FKs da execução de Assessment viraram compostas |
| F-DB1c | 32 → **30** | as duas FKs do lifecycle: `assessment_responses.assessment_cycle_id` e `assessment_answers.assessment_response_id` |

Restam **30** offenders — superfície de autoria de Assessment, filhos de Feedback
e as tabelas legadas. O sweep segue RED por desenho, e isso continua correto.

### Baseline e migration viajam juntas

A baseline só é factualmente verdadeira depois que a migration que a reduz está
na main. Publicar `30` antes de `0145` abriria uma janela em que o runner espera
um número que o schema ainda não entrega.

O guard passou a asseverar o par, não cada metade: um candidate que carrega
`0145` **tem** de pinar `30` citando F-DB1c, e um candidate que **não** o carrega
não pode pinar `30`. A janela deixa de ser curta e passa a ser impossível — e
`F_GATE1_PUBLICATION_SEQUENCE_PROOF` demonstrou que o `publish-gate.sh` suporta
isso com dois commits numa só branch (`commits` é sequência ordenada, `candidate`
é o tip, `ancestors` pina o commit anterior), dispensando a reconciliação por
merge que uma ordem invertida exigiria.

### Allow-list em lugar de igualdade

O bloco 9 do guard exigia que o escopo de migration do candidate fosse
**exatamente** `0144`. Correto para F-DB1b, errado para a slice seguinte: recusou
`0145` legitimamente autorizada. Virou allow-list fechada com SHA pinado por
entrada. Não é relaxamento — migration fora da lista reprova, payload alterado de
entrada listada reprova, e escopo vazio reprova, de modo que a lista não degenera
em "qualquer coisa".

### O guard passou a ter teste

Ele não tinha nenhum: foi mutation-auditado à mão uma vez e, meses depois,
recusou um candidate correto. `guards/f-gate1-detector-integrity.test.mjs` traz
13 casos — 2 positivos e 11 negativos — rodando o guard real contra cópias
temporárias dos arquivos reais. Um deles merece registro: a primeira versão do
negativo "migration não autorizada" escrevia `0146` em disco e asseverava uma
falha **impossível**, porque arquivo untracked nunca aparece num diff de commit.
Testava nada. Agora usa um par real do histórico (`c90581b9..c625f24e`, que
carrega `0143`).
