# ADR-0016 — Invitation Delivery Architecture

**Status:** Proposed

## 1. Context

A [PD-019](../Product/PRODUCT_DECISIONS.md) e a
[ADR-0015](./0015-tenant-multiuser-activation-architecture.md) definem o convite
multiusuário, sua validade de sete dias, a separação entre ator e executor e a
entrega externa server-only. As migrations 0070 e 0074 já persistem somente o
digest SHA-256 e oferecem operações idempotentes de issue, resend e revoke.

A Phase 5 precisa entregar e-mail transacional real sem acoplar a Application
Layer a um fornecedor e sem transformar a chamada externa em parte da transação
do banco.

## 2. Problem

O sistema precisa transportar um segredo utilizável ao convidado sem persisti-lo,
logá-lo ou confundi-lo com identidade/autorização. Também precisa separar retry
técnico da mesma intenção, resend humano e idempotência do provider.

## 3. Decision

O fluxo será **persist-then-deliver**:

```text
server-only token generation
  → canonical token + SHA-256 digest
  → authenticated Tenant Access Application Service
  → Trusted Persistence RPC
  → server-only Invitation Delivery Port
  → transactional email provider
```

O provider será escolhido em gate humano posterior. `auth.uid()` continua sendo
o ator; `service_role` não participa do caminho funcional.

## 4. Token canonicalization

- o token possui no mínimo 256 bits de entropia criptograficamente segura;
- a representação canônica é base64url, sem transformação posterior;
- o digest persistido é `SHA-256(canonicalBase64UrlToken)`;
- a persistência recebe o digest hexadecimal de 64 caracteres já previsto pela
  RPC;
- normalização alternativa, re-encoding ou hash do byte array original não são
  equivalentes ao contrato canônico.

## 5. Raw token trust boundary

O raw token pode existir somente em memória dentro de boundaries server-only, no
input efêmero do Delivery Port, no link entregue e na request futura de aceite.
Ele não entra em banco, audit metadata, logs, telemetry, analytics, mensagens de
erro ou respostas administrativas.

## 6. Persist-then-deliver consistency

O convite é persistido antes da chamada externa. O provider nunca participa da
transação PostgreSQL. Falha de entrega não desfaz nem revoga o convite: ele
permanece `pending` e a recuperação funcional ocorre por resend autorizado.

## 7. No generic outbox in the MVP

O MVP não cria outbox genérica. Notifications é atualmente in-app e a outbox de
Approval é específica daquele domínio. Generalizá-las aumentaria escopo sem
eliminar a impossibilidade de armazenar o raw token. Durabilidade de delivery,
workers e outbox ficam adiados.

## 8. Persistence idempotency

Para uma intenção lógica de issue ou resend, `rawToken` e
`persistenceIdempotencyKey` são gerados uma única vez e mantidos juntos durante
retries técnicos.

```text
retry técnico válido = mesma key + mesmo raw token + mesmo digest
```

A mesma key com digest diferente não é retry válido e deve resultar em conflito
de fingerprint. A idempotência persistente permanece escopada e decidida pela
Trusted Persistence.

## 9. Delivery idempotency

Idempotência de delivery é independente da idempotência persistente. O adapter
deriva uma `providerIdempotencyKey` estável da identidade não secreta
`invitationId + generation`. O provider não recebe a persistence key como fonte
de autorização e seu resultado não altera o resultado transacional já concluído.

Timeout ambíguo pode ser repetido somente conforme a política aprovada do
provider usando a mesma provider key. Nenhuma garantia de exactly-once é
declarada sem suporte comprovado do fornecedor.

## 10. Resend semantics

Resend é nova decisão humana:

```text
nova persistence key + novo raw token + novo digest + nova generation
```

A RPC rotaciona digest, incrementa generation, renova a validade por sete dias e
invalida o token anterior. Retry técnico do mesmo resend reutiliza key e token
originais. Revoke não envia e-mail no MVP.

## 11. Failure handling

- falha persistente: nenhuma entrega é tentada;
- falha de delivery: convite permanece `pending` e retorna resultado externo
  seguro e recuperável;
- erro público não revela se o e-mail possui conta global;
- retry automático só ocorre quando classificado como seguro e idempotente pelo
  adapter/provider;
- recuperação humana usa resend, nunca reconstrução do raw token perdido.

## 12. Delivery Port boundary

O port é server-only, vendor-neutral e conhece apenas dados necessários à
entrega: invitation ID, generation, e-mail destinatário, URL/token efêmero,
expiração, correlation ID e provider idempotency key. Ele retorna resultado
discriminado de sucesso, falha retryable ou falha permanente.

O port não conhece Supabase, `auth.uid()`, memberships, autorização, mutations,
RLS, digest persistido ou regras de owner/admin.

## 13. Invitation URL contract

O link canônico usa `/invite/[token]` sobre uma base URL permitida por ambiente.
GET apenas apresenta/encaminha o fluxo e nunca aceita ou consome o convite. O
aceite exige POST/Action autenticada da Phase 6. Redirects e `returnTo` usam
allowlist e não aceitam destino arbitrário.

## 14. Logging and secret restrictions

Raw token e URL completa são secrets. São proibidos em logs, telemetry, traces,
errors, audit metadata, provider metadata não necessária e ferramentas de
analytics. Logs podem conter apenas invitation ID, generation, correlation ID,
provider message ID opaco, outcome e código seguro.

## 15. Phase 6 compatibility

A Phase 6 recebe o raw token na boundary server-only, calcula o mesmo digest
canônico e chama a Application Layer existente. Esta ADR não cria acceptance
route, Auth integration ou Action e não altera a atomicidade da RPC de aceite.

## 16. Rejected alternatives

- persistir raw token, URL completa ou token reversivelmente cifrado;
- hash de representação diferente da string base64url canônica;
- entregar antes de persistir;
- incluir provider dentro da transação PostgreSQL;
- usar link manual como fluxo funcional principal;
- criar outbox genérica no MVP;
- reutilizar Notifications in-app ou Approval Outbox por acoplamento;
- usar a mesma persistence key com token/digest diferente;
- tratar resend humano como retry técnico;
- escolher provider nesta ADR;
- usar `service_role` ou actor vindo do client para autorizar convite.

## 17. Consequences

O desenho mantém fornecedor substituível, segredo fora da persistência e domínio
independente de transporte. Em contrapartida, entrega e persistência não são
atômicas; convite pending após falha é um estado esperado, e o MVP depende de
resend para recuperação. A disponibilidade e idempotência efetiva da entrega
dependem das garantias do provider escolhido.

## 18. Security invariants

- ator humano é sempre `auth.uid()` na fronteira persistente;
- nenhuma API pública aceita `actorUserId` como autoridade;
- `service_role` permanece fora do caminho funcional;
- somente digest SHA-256 é persistido;
- raw token e URL completa nunca são observáveis em logs ou auditoria;
- tenant, role, People, invitation e grantor são revalidados pelas RPCs;
- respostas preservam anti-enumeration;
- geração anterior, convite expirado/revogado e replay falham fechado;
- persistence e delivery possuem identidades idempotentes distintas;
- delivery nunca altera membership, People, role ou ownership.

## 19. Deferred items

- seleção do provider, credenciais, domínio e remetente;
- templates, localização, bounce e complaint handling;
- política concreta de timeout, retry e rate limit;
- observabilidade avançada e métricas;
- delivery status durável, worker e outbox;
- acceptance route e Auth integration da Phase 6;
- tenant resolver/preference/switch da Phase 7;
- UI, RLS cutover e demais fases do Implementation Plan.

