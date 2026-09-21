# Evol OS — Active Slice

> Este documento descreve **um slice por vez**. Não contém história, não repete
> contrato de domínio e não narra slices fechados — esses vivem em `Execution/`,
> nas ADRs e no Git. Estado geral: [`PROJECT_STATE.md`](./PROJECT_STATE.md).
> Método: [`engineering/OPERATING-METHOD.md`](./engineering/OPERATING-METHOD.md).

```
SLICE = D-SEC1 — Development Ledger Privacy Hardening (implementação)
PATH  = GOVERNED
```

## GOAL

Fechar o `SELECT` direto de `authenticated` sobre **as quatro relações** do ledger
de aplicação de template de Development — `applications`, `attempts`, `snapshots`
e `lineage` — preservando integralmente o acesso purpose-bound já existente.

### Intenção congelada

Estas decisões estão **fechadas**; não reabrir durante a implementação:

- o revoke cobre **as quatro relações**, não apenas `lineage`/`snapshots`;
- as policies de `SELECT` existentes **permanecem**, como defesa em profundidade,
  mesmo ficando inalcançáveis após o revoke;
- RLS permanece habilitada;
- o acesso trusted purpose-bound permanece;
- o comportamento de `0133` permanece;
- o contrato de retenção de quatro relações permanece;
- nenhuma mudança de UI ou de produto.

## WHY

D-SEC0 provou que o ledger é **evidência interna**, não API de produto, e que a
exposição atual é pré-existente e mais ampla que o contrato D-P0 de PDI: qualquer
membro ativo do tenant lê hoje, por `SELECT` direto, o snapshot que carrega a
identidade do employee e os níveis de competência avaliados dele.

D-SEC0 também provou que fechar essa leitura **não custa capacidade nenhuma**:
toda função que toca essas relações é `SECURITY DEFINER`, o caminho vivo de
aplicação usa apenas RPC, a retenção passa por boundary privilegiada, e `0133` já
entrega a origem histórica sem exigir privilégio de tabela do chamador.

## IN_SCOPE

- migration nova revogando `SELECT` de `authenticated` nas quatro relações do
  ledger, sem tocar em policies nem em RLS;
- suíte pgTAP dedicada provando fechamento e continuidade;
- re-ancoragem das duas asserções `STALE_TEST` que hoje codificam a exposição;
- gate local em PostgreSQL real;
- runner versionado de PRE/POST para a futura promoção.

## OUT_OF_SCOPE

- qualquer mudança de UI, produto ou comportamento de aplicação;
- alteração de `0133`, do tooling D-R2 ou do contrato de retenção;
- remoção ou alteração das policies de `SELECT` e do estado de RLS;
- promoção para Review (gate separado, autorização separada);
- remoção do `getPublishedDevelopmentTemplateCatalog`;
- origem histórica no detalhe do PDI;
- readjudicação de D-SEC0.

## KNOWN_STATE

- classificação do ledger: **INTERNAL_EVIDENCE**;
- postura atual: `revoke all` seguido de `grant select to authenticated` mais
  policy de `is_company_member(company_id)`; `service_role` já revogado;
- RLS habilitada e **não** forçada — o owner ignora policy, que é o que mantém as
  funções `SECURITY DEFINER` funcionando após o revoke;
- consumidores diretos ativos na aplicação: **zero** (o único arquivo que os
  referencia é adaptador morto, sem referência externa);
- contrato de retenção: **quatro** relações, imutável neste slice;
- duas asserções pgTAP hoje afirmam a exposição como comportamento esperado.

Números de migration, SHAs, ACLs e contagens de teste são **descobertos**, não
transcritos aqui.

## GATES

- diff contém apenas migration, testes e tooling — nenhuma mudança de produto;
- gate em PostgreSQL real: `db reset`, suíte dedicada, suíte completa, retenção;
- PRE prova a exposição antes de removê-la; POST prova o fechamento;
- fingerprints de ACL/RLS/policy/retenção: **somente** o ACL do ledger pode mudar;
- `0133` continua íntegra — assinatura, grants e provas comportamentais;
- caminho de aplicação de template continua funcional;
- staging explícito; `git diff --check` PASS; estado protegido intacto.

## STOP_CONDITIONS

- qualquer consumidor legítimo exigir `SELECT` direto → `PRODUCT_DECISION_REQUIRED`;
- fechamento quebrar capacidade sem substituto purpose-bound → `DB_CONTRACT_DEFICIENCY`;
- fingerprint mudar além do ACL do ledger → parar e classificar;
- contradição com D-P0, D-DB1 ou D-DB2 → `CONTRACT_CONFLICT`;
- necessidade de tocar produto, `0133` ou retenção → parar e reportar.

## EXPECTED_NEXT

Gate de publicação do D-SEC1 e, em seguida, promoção governada para Review em
slice próprio — publicar código de migration não autoriza aplicá-la remotamente.

---

### Antes disto

O AI Context Protocol (AI-CTX-1, AI-CTX-2) precisa ser publicado. Enquanto isso
não ocorrer, o slice ativo funcional continua sendo D-SEC1, ainda não iniciado.
