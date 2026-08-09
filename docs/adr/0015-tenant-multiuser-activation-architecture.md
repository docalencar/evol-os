# ADR-0015 — Tenant Multiuser Activation Architecture

**Status:** Accepted

## Contexto

A [PD-019](../Product/PRODUCT_DECISIONS.md) define a política funcional para
ativação multiusuário: convite vinculado a uma pessoa existente, aceite humano,
membership tenant-owned, catálogo vigente de roles, múltiplos tenants com escolha
determinística, proteção de ownership e auditoria durável.

O schema atual possui `auth.users`, `people` e `company_members`, mas não possui
identidade durável de convite. `people.user_id` é nullable e não é único por
tenant. O contexto corrente escolhe uma membership ativa com `limit(1)`, sem
preferência ou seleção explícita. A policy histórica permite administração ampla
de memberships por owner/admin, mas não protege sozinha concorrência, último
owner, aceite único ou atomicidade.

Esta ADR define como materializar a PD-019 em defesa em profundidade. Ela não
autoriza implementação, migration ou mudança de RLS e não define UI.

## Decisão

O fluxo adota cinco identidades independentes:

1. **identidade humana global:** `auth.users.id`;
2. **pessoa tenant-owned:** `people.id` junto de seu `company_id`;
3. **membership tenant-owned:** associação entre empresa e usuário, com role e
   estado;
4. **convite tenant-owned:** intenção durável de vincular uma pessoa específica a
   uma identidade autenticada ainda não confirmada;
5. **tenant ativo:** escolha de navegação do usuário, que nunca concede acesso.

A Application Layer coordena casos de uso por ports. Operações simples de leitura
usam sessão `authenticated` e RLS. Operações administrativas ou multi-step usam
fronteiras estreitas de Trusted Persistence. Integrações administrativas com o
provedor de Auth ficam server-only. Constraints e transações do banco são a
garantia final dos estados persistidos.

## Modelo de identidade

### `auth.users`

`auth.users.id` é a identidade humana autenticável e global. Uma conta pode
existir sem vínculo em determinado tenant e pode participar de vários tenants.
Metadata de Auth, e-mail, domínio, payload e claims de role/tenant não são fontes
de autorização corporativa.

### `people`

People é uma Tenant-Owned Root conforme a ADR-0012. Pode existir antes de uma
conta. Seu vínculo autenticável permanece opcional até o aceite, mas, quando
presente, precisa ser único para `(company, user)` e coerente com a empresa.

A integridade persistente deve garantir simultaneamente:

- uma pessoa vinculada a no máximo um usuário por vez;
- um usuário vinculado a no máximo uma pessoa em cada tenant;
- toda pessoa vinculada possuir membership correspondente na mesma empresa;
- nenhum vínculo ser formado apenas por igualdade de e-mail.

O e-mail participa do bootstrap e da comprovação do aceite. Depois do vínculo,
consultas e autorização usam `auth.users.id`, `company_id` e a membership.

### `company_members`

Membership é a associação tenant-owned entre Company e a identidade global. Sua
identidade é diferente da pessoa e do convite. A combinação `(company, user)` é
única independentemente de estado. Role vem exclusivamente da membership e nunca
de People, metadata de Auth ou relação gestor–liderado.

Uma membership ativa só pode coexistir com exatamente um vínculo People válido no
mesmo tenant. Convite pendente não é membership ativa nem fonte de autorização.

### Convite

Convite é uma Tenant-Owned Root com identidade opaca e durável. Ele referencia a
empresa e a pessoa de forma tenant-aware e preserva e-mail normalizado, role
pretendida, ator humano, estado, validade, geração de entrega e identidades de
idempotência/correlação necessárias.

Convite, pessoa, usuário e membership nunca compartilham a mesma identidade nem
inferem uma à outra por texto.

## Modelo de convite e segredo de aceite

O aceite usa segredo aleatório, de alta entropia, específico do convite e da
geração de envio. O valor utilizável existe somente na fronteira server-only e no
canal de entrega; a persistência mantém apenas representação não reversível apta
a comparação segura. Segredos, links utilizáveis e credenciais não entram em
logs, auditorias ou respostas administrativas.

Cada envio ou reenvio cria uma nova geração e invalida todas as gerações
anteriores. A validade funcional é de sete dias a partir da geração mais recente.
Estado, geração, expiração e revogação são revalidados no instante do aceite,
dentro da transação.

### Criação e duplicidade

A criação do convite:

1. autentica o ator humano e deriva o tenant ativo confiável;
2. autoriza role pretendida conforme PD-019;
3. carrega a pessoa no mesmo tenant e valida seu estado e e-mail;
4. rejeita membership ativa, vínculo incompatível ou convite vigente concorrente;
5. persiste convite e `invite.created` atomicamente;
6. somente depois solicita a entrega pela fronteira server-only.

A integridade impede mais de um convite vigente para a mesma pessoa na empresa.
Também falha fechado quando outro convite vigente no tenant pretende vincular o
mesmo e-mail a pessoa diferente, pois ambos poderiam disputar a mesma identidade
global. Uma tentativa equivalente retorna a identidade e o estado do convite
existente sem criar outra intenção.

### Usuário existente ou inexistente

O convite de aplicação é canônico e não depende de a conta já existir. O adapter
server-only escolhe a operação suportada pelo provedor para entregar o acesso:

- se a conta não existir, o provedor pode iniciar sua ativação;
- se existir, o usuário autentica nessa identidade antes de aceitar;
- em ambos os casos, a resposta ao convidante é indistinguível quanto à existência
  global da conta.

O aceite exige sessão autenticada, e-mail verificado correspondente ao convite e
segredo válido. Criar ou confirmar uma conta no provedor não concede acesso ao
tenant; somente a transação de aceite cria o estado funcional.

### Entrega externa

Entrega de e-mail não participa da transação do banco. O convite durável é
persistido antes da chamada externa. Falha de entrega mantém estado recuperável,
registra resultado técnico seguro e permite reenvio autorizado. O reenvio gira o
segredo, renova a expiração, registra `invite.resent` e nunca duplica a intenção
funcional.

## Trusted execution

### `authenticated` com RLS

Podem permanecer sob sessão autenticada e RLS:

- autenticação e leitura da própria identidade;
- listagem de memberships ativas do próprio usuário;
- leitura do tenant selecionado após validação da membership;
- leitura administrativa tenant-scoped que não exija segredo nem mutação
  multi-step;
- submissão da intenção de aceitar com sessão autenticada.

### Server-only

Devem ficar server-only:

- geração, rotação e comparação do segredo de aceite;
- acesso às APIs administrativas do provedor de Auth;
- descoberta técnica de conta existente;
- entrega ou geração de links de convite;
- composição de operações confiáveis e de seus adapters;
- qualquer acesso a credencial técnica.

### Executor técnico privilegiado

Trusted Persistence usa executor privilegiado somente quando a operação não pode
ser realizada de modo seguro pela sessão autenticada/RLS ou precisa atravessar a
fronteira administrativa do Auth. Antes de executar, a fronteira:

1. autentica o usuário pelo provedor oficial;
2. deriva `actorUserId` da sessão, nunca do payload;
3. deriva ou revalida o tenant;
4. autoriza a capability tenant e a role alvo;
5. chama somente a operação técnica necessária;
6. registra ator humano e executor separadamente.

`service_role` não autoriza, convida, aceita, escolhe role nem representa autoria.
Seu uso não relaxa constraints, integridade tenant-owned ou auditoria.

## Aceite atômico

O aceite possui uma única fronteira transacional de Trusted Persistence. Ela
bloqueia os registros concorrentes relevantes e, no mesmo commit:

1. resolve o convite pela representação segura do segredo e geração atual;
2. verifica estado `pending`, expiração, revogação e aceite anterior;
3. compara o e-mail verificado da identidade Auth;
4. valida empresa, pessoa, usuário e role pretendida;
5. confirma que pessoa e usuário não possuem vínculos incompatíveis;
6. cria ou ativa exatamente uma membership com a role aprovada;
7. vincula a pessoa ao `auth.users.id`;
8. marca o convite como aceito;
9. persiste `invite.accepted`, `membership.created` quando aplicável e
   `person.linked` na auditoria.

Qualquer falha reverte membership, vínculo, estado do convite e auditorias do
aceite. A conta Auth pode existir antes da transação, pois conta sem membership é
um estado permitido; ela não constitui estado funcional parcial no tenant.

## Idempotência e concorrência

Idempotência é persistente e protegida na transação, não memória de processo nem
apenas lógica TypeScript.

- retry com a mesma intenção e mesmo resultado retorna o resultado canônico;
- reutilização da mesma identidade idempotente com intenção divergente falha;
- duas sessões aceitando a mesma geração serializam; uma conclui e a outra recebe
  o resultado já concluído somente se identidade e intenção coincidirem;
- convite aceito por usuário diferente, segredo antigo ou payload divergente
  falha fechado;
- convites concorrentes para a mesma pessoa ou identidade pretendida são
  impedidos pela integridade e pelo bloqueio transacional;
- membership/vínculo compatíveis já concluídos permitem resposta idempotente;
  estado apenas parcialmente compatível é conflito, nunca reparação silenciosa;
- reenvio serializa com reenvio, aceite e revogação; somente a geração mais nova
  pode ser aceita;
- revogação que vence a serialização impede aceite; aceite já commitado não pode
  ser convertido retroativamente em revogação do convite;
- alterações de role e ownership serializam por tenant e revalidam autoridade e
  estado no instante da escrita.

Relógio, correlation ID e identidade idempotente são dependências explícitas. O
cliente pode fornecer uma chave de retry, mas não define tenant, ator, convite ou
resultado.

## Ownership

Toda mutação de membership passa por operações estreitas de Trusted Persistence;
clientes não recebem escrita genérica capaz de contornar a PD-019.

Promoção a owner, rebaixamento, desativação e remoção bloqueiam a fronteira da
empresa ou o conjunto de owners ativos, revalidam a role do ator e calculam o
estado posterior dentro da mesma transação. O commit é rejeitado se deixaria zero
owners ativos.

A proteção do último owner também existe na fronteira persistente, de modo que
escrita alternativa, executor privilegiado ou corrida entre duas remoções não
consiga violá-la. Transferência é uma operação transacional explícita: promove o
novo owner e, quando solicitado pela intenção aprovada, rebaixa o anterior no
mesmo commit. Estados anterior/posterior e ator são auditados.

## Múltiplos tenants e tenant ativo

Tenant ativo é contexto, não autoridade. A autoridade continua sendo uma
membership ativa revalidada.

O resolver server-side retorna um resultado fechado:

- zero memberships ativas: `membership_required`;
- uma: seleciona deterministicamente essa empresa;
- várias e preferência válida: seleciona a empresa preferida;
- várias sem preferência válida: `tenant_selection_required`;
- role inválida ou estado inconsistente: erro fechado.

É proibido `limit(1)`, primeira linha, menor UUID ou qualquer ordenação como
fallback funcional. A troca de tenant exige usuário autenticado e membership
ativa no destino.

A última escolha pode ser persistida como preferência global do usuário ou em
estado server-side protegido. Ela contém somente a referência necessária, não
role nem autorização, e é revalidada contra memberships ativas em toda resolução.
Ao trocar de tenant, caches e contexto tenant-scoped são descartados. Se a
membership escolhida for desativada, a preferência deixa de ser válida
imediatamente e o resolver aplica novamente as regras acima.

## Responsabilidades por camada

### Constraints e integridade persistente

- unicidade de membership por empresa/usuário;
- unicidade do vínculo pessoa/usuário por tenant;
- coerência tenant entre convite, pessoa, membership e auditoria;
- convite vigente inequívoco;
- transições válidas e aceite único;
- proteção do último owner inclusive contra caminhos privilegiados;
- referências tenant-owned conforme ADR-0012.

### RLS

- restringe leitura e operação ao tenant e papel do ator;
- considera somente membership ativa como autoridade;
- impede leitura cross-tenant e exposição de convites/auditorias;
- não substitui uniqueness, FK, transação ou proteção de ownership;
- não concede escrita genérica sobre operações administrativas multi-step.

### Trusted Persistence

- revalida ator, tenant, role e estado na fronteira da escrita;
- serializa criação, aceite, reenvio, revogação, membership e ownership;
- persiste mutação funcional e auditoria atomicamente;
- traduz violações esperadas em códigos estáveis sem ocultar corrupção;
- falha antes do commit diante de ambiguidade.

### Application Layer

- recebe intenções, autentica por ports e deriva o contexto confiável;
- coordena repositories, provedor de Auth e Trusted Persistence;
- não decide novamente roles, estados ou ownership definidos pela PD-019;
- não persiste diretamente tabelas protegidas;
- normaliza respostas sem revelar conta ou tenant estrangeiro.

### UI e Actions

- coletam intenção e exibem estados;
- Actions são fronteiras finas e server-side;
- não recebem credenciais técnicas;
- não calculam autorização, tenant, aceite, último owner ou idempotência.

## Auditoria

Auditoria é append-only e faz parte da mesma transação da decisão interna que
registra. O contrato lógico mínimo possui:

- `eventType`;
- `companyId`;
- `actorUserId` humano;
- `executorType` e identidade técnica segura, quando aplicável;
- `targetInviteId`, `targetUserId`, `targetPersonId` e `targetMembershipId`,
  quando aplicáveis;
- `correlationId` e identidade idempotente não secreta;
- timestamp confiável;
- resultado e reason code seguro;
- estado anterior e posterior mínimos quando houver transição.

O catálogo inicial contém:

- `invite.created`;
- `invite.resent`;
- `invite.revoked`;
- `invite.accepted`;
- `membership.created`;
- `membership.role_changed`;
- `person.linked`;
- `person.unlinked`;
- `membership.deactivated`.

Tentativas negadas relevantes podem usar eventos de segurança próprios, sem
copiar e-mail, token, secret, payload sensível ou existência de outro tenant. A
falha externa de entrega é observável separadamente e não falsifica uma decisão
humana concluída.

## Desligamento, revogação e sessões

Inativar ou desligar People coordena, na mesma fronteira confiável, a desativação
da membership correspondente e os eventos aplicáveis. A relação histórica não é
apagada.

Autorização tenant é reavaliada a cada request e em toda operação persistente;
role e tenant não são confiados a claims ou cache de longa duração. Assim, uma
membership desativada perde acesso imediatamente no banco mesmo que a sessão Auth
global continue válida para outros tenants.

Após desativação:

- a preferência pelo tenant é invalidada;
- contexto e caches tenant-scoped são descartados;
- refresh ou reautenticação pode atualizar a experiência, mas não é a defesa de
  autorização;
- a sessão global não precisa ser encerrada quando ainda houver acesso legítimo a
  outra empresa;
- toda tentativa posterior no tenant desativado falha fechado.

Reativação é uma nova operação humana autorizada, revalida pessoa, membership,
role e ownership atuais e produz auditoria própria. Ela não restaura contexto ou
sessão tenant automaticamente.

## Invariantes permanentes

- nenhuma associação entre convite, pessoa, membership e auditoria atravessa
  tenants;
- membership duplicada por empresa/usuário é impossível;
- cada usuário se vincula a no máximo uma pessoa por tenant;
- cada pessoa se vincula a no máximo um usuário por vez;
- convite é aceito no máximo uma vez e somente pela geração atual;
- convite expirado ou revogado não concede acesso;
- membership ativa exige vínculo People coerente;
- o último owner ativo nunca desaparece;
- somente owner administra owner;
- role nunca deriva implicitamente de People ou metadata Auth;
- relação manager/subordinate não equivale a role;
- e-mail não é identidade permanente após o aceite;
- `service_role` é executor, nunca ator;
- `company_members` não concede autoridade global;
- tenant ativo nunca é escolhido arbitrariamente;
- operações privilegiadas e decisões humanas são auditáveis;
- falha em etapa interna do aceite não deixa estado funcional parcial.

## Alternativas analisadas e rejeitadas

- **Vínculo permanente por e-mail:** e-mail muda, pode divergir e não substitui
  `auth.users.id`.
- **Membership antes do aceite:** concederia autoridade sem confirmação humana.
- **People criada depois do aceite:** contraria a PD-019 e impede validar a pessoa
  tenant-owned antes do acesso.
- **Metadata Auth como fonte de role ou tenant:** é global, mutável e não prova
  membership ativa.
- **Primeiro tenant encontrado:** é não determinístico e pode selecionar contexto
  incorreto.
- **Proteção do owner somente no frontend:** é contornável por concorrência,
  chamadas diretas e executores privilegiados.
- **RLS como única defesa:** não garante relações físicas, aceite único nem
  atomicidade multi-step.
- **Idempotência somente em TypeScript:** falha entre processos, retries e
  concorrência.
- **Service role como autor:** confunde execução técnica com decisão humana.
- **Operação multi-step sem transação:** permite membership, vínculo, convite e
  auditoria divergirem.
- **Revogação somente eventual da sessão:** deixa uma janela de acesso; membership
  ativa precisa ser verificada na autorização efetiva.
- **Remoção física no desligamento:** apaga identidade histórica e auditoria.

## Consequências

### Positivas

- identidade global, pessoa, membership e convite permanecem separáveis e
  rastreáveis;
- aceite e ownership são atômicos, idempotentes e resistentes a concorrência;
- múltiplos tenants são resolvidos sem fallback arbitrário;
- desativação bloqueia o tenant sem encerrar acessos legítimos a outras empresas;
- RLS, constraints, Application Layer e Trusted Persistence formam defesa em
  profundidade;
- falhas externas de entrega são recuperáveis sem produzir acesso parcial.

### Custos e riscos

- serão necessários novo estado persistente, hardening de vínculos existentes e
  preflight de dados;
- integração com Auth permanece uma fronteira externa não transacional;
- escolha ativa exige estado protegido e invalidação consistente;
- operações de owner precisam serialização por tenant;
- revogação imediata depende de toda autorização tenant consultar membership
  atual, sem confiar em claims ou caches antigos;
- rollout precisará preservar onboarding e contratos existentes até cutover
  aprovado.

## Critérios de aceitação arquitetural

- identidade de convite não se confunde com usuário, pessoa ou membership;
- somente representação não reversível do segredo é persistida;
- convite para conta existente e inexistente converge para o mesmo aceite;
- aceite interno é uma única transação com auditoria;
- retries e corridas produzem resultado canônico ou conflito fechado;
- constraints impedem membership/vínculo duplicado e cross-tenant;
- último owner permanece protegido sob concorrência e executor privilegiado;
- resolução do tenant retorna tenant único, preferência válida, seleção necessária
  ou ausência de membership, nunca primeira linha;
- membership desativada perde autorização imediatamente;
- ator humano e executor técnico permanecem separados em toda operação;
- testes futuros comprovam Application Layer, transação, RLS, constraints,
  concorrência, revogação e isolamento separadamente.

## Relação com decisões existentes

- [PD-019](../Product/PRODUCT_DECISIONS.md) permanece a fonte funcional;
- [ADR-0012](./0012-tenant-owned-referential-integrity-strategy.md) governa
  integridade física tenant-owned;
- [ADR-0013](./0013-platform-global-authority-and-trusted-execution.md) governa a
  separação entre ator humano e executor técnico;
- [ADR-0010](./0010-assessment-authorization.md) e
  [ADR-0011](./0011-notification-domain-architecture.md) são precedentes de
  autorização e auditoria em profundidade;
- o [Discovery do MVP-PR1](../execution/MVP-PR1-TENANT-MULTIUSER-ACTIVATION-DISCOVERY.md)
  registra o baseline anterior a esta decisão.

Um Implementation Plan posterior deve inventariar dados reais, recortar rollout,
compatibilidade, migrations, RLS, contratos e testes. Esta ADR não os autoriza.
