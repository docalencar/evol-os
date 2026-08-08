# MVP-PR1 — Ativação multiusuário do tenant — Discovery

**Status:** Discovery concluído; implementação bloqueada por decisões normativas

## 1. Contexto e objetivo

Este documento descreve o estado versionado e as lacunas para o primeiro recorte
de MVP Closure:

> Owner convida usuário → usuário aceita → membership é criada → pessoa existente
> é vinculada → role correta é aplicada → login resolve o tenant correto → RLS
> confirma isolamento.

O Discovery não autoriza implementação, migration, alteração de RLS ou criação de
contrato. Propostas abaixo são hipóteses para decisão do Product Architect.

## 2. Fontes consultadas

Foram lidos integralmente o
[Master Prompt](../prompts/MASTER_PROMPT.md),
[Project State](../PROJECT_STATE.md), [Roadmap](../ROADMAP.md),
[Next Steps](../NEXT_STEPS.md), [Changelog](../CHANGELOG.md),
[Product Decisions](../Product/PRODUCT_DECISIONS.md) e o
[índice de ADRs](../adr/README.md).

Também foram confrontados:

- [ADR-0010 — Assessment Authorization](../adr/0010-assessment-authorization.md);
- [ADR-0012 — Tenant-Owned Referential Integrity Strategy](../adr/0012-tenant-owned-referential-integrity-strategy.md);
- [ADR-0013 — Platform Global Authority and Trusted Execution](../adr/0013-platform-global-authority-and-trusted-execution.md);
- [padrão de integridade tenant-owned](../Architecture/patterns/tenant-owned-referential-integrity.md);
- schema, migrations, policies, Auth, onboarding, middleware, contexto corrente,
  catálogo de permissões e precedentes server-only incorporados à `main`;
- documentação oficial do Supabase sobre
  [convites](https://supabase.com/docs/guides/auth/users#inviting-users) e
  [`inviteUserByEmail`](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail).

## 3. Baseline confirmado

Na abertura deste Discovery:

- branch: `docs/mvp-pr1-tenant-multiuser-activation-discovery`;
- `HEAD`: `5c2675b`, merge final da PR 3C;
- `main` e `origin/main`: `5c2675b`;
- worktree: limpo;
- não havia implementação do MVP-PR1 na branch.

Há divergência documental preexistente: `PROJECT_STATE`, `ROADMAP` e
`NEXT_STEPS` ainda descrevem a aprovação final da PR 3C como pendente, embora o
merge final esteja em `main`. Esta entrega não reconcilia esses arquivos porque
seu escopo permite criar somente este Discovery.

## 4. Estado atual e inventário técnico

### 4.1 Identidade e autenticação

- `auth.users.id` é a identidade humana canônica, conforme ADR-0013.
- Cadastro atual usa `supabase.auth.signUp` no cliente com e-mail, senha e
  `full_name`; login usa senha.
- O middleware renova a sessão, protege `/app` e redireciona usuários autenticados
  de `/login` e `/signup` para `/app`.
- Não existe rota de aceite, callback de convite, tela para definição de senha nem
  tratamento de convite pendente.
- A configuração local habilita signup, usa `site_url` local, possui lista local de
  redirects e deixa o template de convite comentado. `otp_expiry` está em 3.600
  segundos.
- Segundo o Supabase, convite é operação administrativa server-only, exige secret
  key/service role, cria usuário não confirmado quando o e-mail ainda não existe,
  falha para usuário já confirmado e só respeita `redirectTo` permitido.

### 4.2 `company_members`

O modelo atual contém:

| Campo | Regra atual |
| --- | --- |
| `id` | UUID, chave primária |
| `company_id` | obrigatório, FK para `companies`, `ON DELETE CASCADE` |
| `user_id` | obrigatório, FK para `auth.users`, `ON DELETE CASCADE` |
| `role` | `owner`, `admin`, `hr`, `manager` ou `employee` |
| `status` | `active`, `inactive` ou `invited`; padrão `active` |
| `created_at` | timestamp de criação |
| unicidade | `unique(company_id, user_id)` |

Não existem no modelo: identidade própria de convite, e-mail convidado,
expiração, token hash, remetente, data de envio/aceite/revogação, contador de
reenvio, motivo, versão da role ou trilha de transição.

### 4.3 Pessoa e usuário

`people.user_id` é nullable, referencia `auth.users(id)` e usa `ON DELETE SET
NULL`. Portanto, uma pessoa pode existir sem usuário. Não há constraint única
sobre `people.user_id` nem sobre `(company_id, user_id)`; o contexto corrente usa
`limit(1)` para encontrar a pessoa do usuário no tenant.

`people.email` também é nullable e não é identidade autenticada nem possui
unicidade normalizada por tenant. O banco não garante hoje que uma pessoa
vinculada a um usuário tenha uma membership da mesma empresa.

### 4.4 Roles e autoridades observadas

| Role | Autoridade versionada relevante |
| --- | --- |
| `owner` | todas as permissões do catálogo atual; RLS permite administrar empresa e memberships |
| `admin` | igual ao `owner` no catálogo atual; RLS permite administrar empresa e memberships |
| `hr` | permissões administrativas do catálogo atual e gestão de People em RLS; não administra memberships pela policy atual |
| `manager` | leitura de planejamento; não é administrador segundo PD-016 |
| `employee` | leitura de planejamento |

O catálogo de permissões é pequeno e não define capabilities de convite,
atribuição de role, transferência de ownership ou revogação. A policy atual
permite `owner` e `admin` executarem `ALL` em `company_members`, mas isso é
evidência de implementação legada, não uma Product Decision completa para o novo
fluxo.

### 4.5 Tenant corrente e múltiplas empresas

O schema permite que o mesmo `user_id` tenha uma membership por empresa. Porém:

- `create_company_with_owner` rejeita qualquer usuário que já possua membership
  ativa, com `USER_ALREADY_HAS_COMPANY`;
- `loadCurrentUserContext` consulta memberships ativas e aplica `.limit(1)` sem
  seletor, preferência persistida ou ordenação;
- login e middleware não selecionam empresa;
- não existe switcher de tenant nem estado de “última empresa”.

Logo, múltiplas empresas são representáveis fisicamente, mas não são um
comportamento suportado e determinístico pela aplicação atual.

### 4.6 RLS e integridade

- somente membership `active` satisfaz `is_company_member` e
  `has_company_role`;
- membros ativos leem empresa, memberships e pessoas do próprio tenant;
- `owner` e `admin` administram memberships pela policy atual;
- `owner`, `admin` e `hr` administram pessoas;
- `unique(company_id, user_id)` impede duas memberships do mesmo usuário na mesma
  empresa;
- ADR-0012 exige tenant derivado de contexto confiável e integridade física além
  de RLS.

A associação `people → auth.users` não carrega proteção física que a conecte à
membership do mesmo tenant. Uma operação com service role também ignora RLS;
portanto, o fluxo futuro precisa validar e persistir o vínculo de forma atômica e
tenant-aware.

### 4.7 Precedentes server-only

Global Competencies, Notifications e Trusted Persistence possuem clientes
server-only com service role, sessão não persistida e separação entre ator humano
e executor técnico. ADR-0013 determina que service role execute somente uma
operação já autorizada e nunca represente decisão humana.

## 5. Fluxo atual

O único fluxo completo existente é:

1. usuário realiza signup;
2. usuário autentica;
3. sem membership ativa, é direcionado ao onboarding;
4. `create_company_with_owner`, executada como usuário autenticado, cria empresa,
   membership `owner/active` e pessoa vinculada na mesma função;
5. em acessos seguintes, a primeira membership ativa encontrada define o tenant.

Não há fluxo atual para um owner convidar outro usuário. O valor `invited` é
infraestrutura isolada, sem produtor ou consumidor identificado no código.

## 6. Respostas obrigatórias

1. **Modelo de `company_members`:** associação entre empresa e identidade global,
   com role, status e unicidade por empresa/usuário; não modela o convite.
2. **Roles e autoridades:** existem `owner`, `admin`, `hr`, `manager` e
   `employee`. Owner/admin administram memberships na RLS atual; HR administra
   People; manager não é administrador; não há matriz normativa específica para
   convite e atribuição de roles.
3. **`people.user_id`:** UUID nullable para `auth.users`, `ON DELETE SET NULL`, sem
   unicidade.
4. **Pessoa sem usuário:** sim, é suportada explicitamente pelo schema e pela
   PD-017.
5. **Usuário em múltiplas empresas:** o schema permite; onboarding e resolução do
   tenant não oferecem suporte determinístico. O produto ainda não decidiu.
6. **Tenant corrente:** primeira membership ativa devolvida por consulta com
   `limit(1)`; não há seleção explícita.
7. **Fluxo de convite:** não existe; há somente o status `invited` e suporte
   genérico do provedor de Auth.
8. **Quem pode convidar:** não decidido. A RLS legada sugere owner/admin, mas não
   basta para normatizar o fluxo.
9. **Quem pode definir role:** não decidido. Também faltam limites como impedir
   admin de criar owner ou alterar o último owner.
10. **Vínculo ou criação posterior:** não decidido. O objetivo informado pede
    pessoa existente, mas falta decidir se isso é pré-condição exclusiva.
11. **E-mail divergente da pessoa:** não decidido. E-mail não deve ser tratado
    silenciosamente como prova de identidade.
12. **Prevenção cross-tenant:** tenant deve vir do ator; pessoa deve ser carregada
    no mesmo tenant; a ativação deve verificar membership e pessoa conjuntamente
    no banco. A constraint exata ainda requer desenho arquitetural.
13. **Expirado/revogado:** não modelado nem decidido; membership possui apenas
    `invited`, sem datas ou transições.
14. **Reenvio:** não modelado. O Supabase recomenda novo convite após expiração,
    mas idempotência, rate limit e auditoria do produto estão indefinidos.
15. **Membership duplicada:** a unicidade atual bloqueia duplicação na mesma
    empresa, mas falta semântica para retry, convite pendente e usuário já
    confirmado.
16. **Ator e executor:** `auth.uid()` é o ator humano; service role é somente o
    executor técnico e ambos devem ser registrados separadamente.
17. **Operações com service role:** envio pelo Auth Admin API e qualquer consulta
    administrativa a `auth.users`; uma eventual persistência privilegiada também
    deve ficar server-only, após autorização humana explícita.
18. **Operações sob authenticated/RLS:** autenticar ator, ler contexto,
    memberships e pessoas do próprio tenant e verificar papel podem permanecer
    sob sessão autenticada/RLS. A ativação pode usar RPC autenticada se o desenho
    revalidar ator e tenant no banco.
19. **Auditoria necessária:** solicitado, enviado, reenviado, aceito, expirado,
    revogado e falho; ator, executor, tenant, pessoa, usuário alvo, role anterior e
    pretendida, timestamps, motivo/código, correlation/idempotency key e resultado.
    Não persistir token em claro.
20. **Estados mínimos de UI futura:** lista vazia/carregando; formulário com
    pessoa, e-mail e role; pendente, enviado, aceito, expirado, revogado e falho;
    reenvio/revogação; duplicidade; divergência de identidade; permissão negada;
    aceite, definição de senha/login e escolha de tenant quando aplicável. Erros
    não devem revelar outro tenant nem a existência global de um e-mail.

## 7. Lacunas e riscos

### Lacunas funcionais

- política de tenants múltiplos e tenant padrão;
- autoridade para convidar, reenviar, revogar e atribuir cada role;
- regra para owner, transferência de ownership e último owner;
- seleção da pessoa e correspondência entre e-mails;
- tratamento de usuário Auth já existente;
- lifecycle, expiração, reenvio e idempotência do convite;
- política de criação de pessoa quando não existir;
- eventos, retenção e acesso à auditoria;
- mensagens que não permitam enumeração de usuários.

### Riscos técnicos

- tenant arbitrário no login quando houver mais de uma membership ativa;
- vínculo de um `auth.users.id` a pessoa errada ou a mais de uma pessoa no tenant;
- estado dividido entre Auth e banco quando o e-mail for enviado mas a persistência
  falhar, ou vice-versa;
- service role usado como autoridade em vez de executor;
- convite aceito após revogação ou com role alterada;
- corrida entre envio, aceite, reenvio e revogação;
- bypass cross-tenant em operação privilegiada;
- enumeração de contas por mensagens diferentes;
- redirects de convite ausentes da allowlist de produção.

## 8. Decisões cobertas e faltantes

### Cobertas

- `auth.users.id` é a identidade humana canônica;
- `company_members` concede autoridade somente no tenant;
- pessoa sem usuário não recebe notificação;
- empresa, pessoa e usuário resolvidos devem pertencer ao mesmo tenant;
- manager não é administrador implícito;
- tenant não vem do cliente;
- RLS e integridade física são complementares;
- service role é executor técnico server-only, separado do ator humano.

### Faltantes — Rule of Stop

A implementação deve parar até o Product Architect decidir:

1. se múltiplas memberships ativas são suportadas no MVP e como o tenant corrente
   é escolhido;
2. matriz de autoridade para convite, role, reenvio, revogação e ownership;
3. se o convite exige pessoa existente e como selecionar essa pessoa;
4. regra de normalização/correspondência de e-mail e comportamento em divergência;
5. comportamento para usuário Auth inexistente, não confirmado e já confirmado;
6. lifecycle, expiração, reenvio, revogação, retry e concorrência;
7. eventos de auditoria, retenção e visibilidade;
8. comportamento de recuperação quando Auth e persistência divergirem.

## 9. Classificação de governança

| Artefato | Necessidade | Justificativa |
| --- | --- | --- |
| Product Decision nova | **Necessária** | define identidade pessoa–usuário, multi-tenancy, autoridade, ownership, lifecycle, mensagens e auditoria |
| ADR nova | **Necessária, após a Product Decision** | define fronteira Auth/banco, modelo do convite, transação de ativação, idempotência, trusted execution e tenant selection |
| Reconciliação documental | **Necessária, separadamente** | documentos de estado ainda não registram o fechamento da PR 3C nem este novo gate |
| Implementation Plan | **Necessário, após PD e ADR** | o slice atravessa Auth, schema, RLS, Application Layer, server-only, UI e testes |

Nenhuma dessas classificações cria ou aprova automaticamente o artefato.

## 10. Proposta condicionada de slice técnico

Após aprovação normativa, um plano pode decompor o slice vertical em:

1. modelo persistente de convite tenant-owned e auditoria, com estados e
   invariantes aprovados;
2. constraints e policies que protejam pessoa, membership e tenant;
3. Application Service que autorize o ator e coordene ports sem regra duplicada;
4. adapter server-only para Supabase Auth Admin, mantendo ator e executor
   separados;
5. aceite transacional e idempotente que vincule pessoa, usuário e membership;
6. seleção determinística do tenant corrente, ou bloqueio explícito de múltiplos
   tenants conforme a Product Decision;
7. Server Actions e experiência mínima de envio, aceite, reenvio e revogação;
8. testes unitários, de integração/RLS e E2E do caminho completo e dos ataques
   cross-tenant.

Essa ordem é uma proposta de planejamento, não autorização para iniciar qualquer
item.

## 11. Critérios objetivos de aceite propostos

- somente papel aprovado convida e atribui roles permitidas;
- tenant e ator são derivados de contexto autenticado, nunca do payload;
- convite identifica tenant, pessoa, e-mail normalizado, role e lifecycle;
- aceite válido cria ou ativa exatamente uma membership no tenant correto;
- pessoa existente do mesmo tenant recebe o `user_id` correto, sem vínculo
  cross-tenant ou ambíguo;
- retry de envio e aceite é idempotente; payload divergente falha fechado;
- convite expirado ou revogado não ativa membership;
- reenvio preserva a identidade funcional definida e registra nova tentativa;
- usuário já existente segue comportamento aprovado sem enumerar contas;
- login com uma membership resolve o tenant; múltiplas memberships seguem regra
  determinística aprovada;
- RLS nega leitura e escrita por usuário de outro tenant;
- service role permanece server-only e não substitui autorização humana;
- auditoria registra ator e executor separadamente, sem segredo em claro;
- falha entre Auth e banco é recuperável e observável;
- fluxo completo possui testes de sucesso, retry, concorrência, expiração,
  revogação, roles e isolamento cross-tenant.

## 12. Próximo gate

**Gate oficial proposto:** Product Architect aprovar uma Product Decision para a
política de convite, identidade pessoa–usuário, roles/ownership, múltiplos tenants
e auditoria. Depois, elaborar e aprovar a ADR correspondente. Somente então deve
ser produzido o Implementation Plan do MVP-PR1.

Até esses gates, o MVP-PR1 está **BLOCKED FOR IMPLEMENTATION**.
