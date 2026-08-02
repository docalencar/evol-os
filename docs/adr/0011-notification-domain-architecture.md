# ADR 0011 — Notification Domain Architecture

## Status

Accepted

## Contexto

Notifications possui tabelas, contratos, regras, resolvers, repositories e
componentes, mas a fundação original habilitou RLS sem policies. A criação atual
ocorre como efeito best-effort de Activity, sob a sessão do usuário, e o diretório
consulta a tabela inexistente `employees`.

PD-017 define identidade, produção, visibilidade, administração, preferências e
retenção. Esta ADR materializa as fronteiras arquiteturais necessárias para que
clientes não criem notificações arbitrárias e destinatários não acessem dados de
terceiros.

## Decisão

Notifications adota o fluxo:

```text
Domain Operation
  → Notification Producer
  → Notification Event
  → Recipient Resolver
  → Delivery Policy
  → Trusted Persistence
  → Read Models
  → Presentation
```

Produção e consumo são fronteiras diferentes. RLS concede self access para
consumo, mas nega produção direta. A produção atravessa composição server-only e
uma operação de banco executável somente pelo papel técnico confiável.

## Domain Model

### Notification Event

Contrato imutável emitido por um domínio depois que o fato canônico ocorreu.
Contém `eventKey`, `companyId`, `producerKey`, tipo, origem, entidade/sujeito,
classificação, obrigatoriedade, prioridade sugerida, conteúdo mínimo e instante.
Não é a Notification persistida nem substitui o evento do domínio fonte.

### Notification Producer

Adapter pertencente ao domínio produtor. Traduz um fato público do domínio para
um `NotificationEvent` catalogado. Producers nunca acessam tabelas de
Notifications.

Exemplos de nomes permitidos para adapters futuros:

- `AssessmentCompletedProducer`;
- `ApprovalCreatedProducer`;
- `DevelopmentDeadlineProducer`;
- `BirthdayProducer`;
- `AIRecommendationProducer`;
- `WorkflowProducer`;
- `SchedulerProducer`.

Os nomes não autorizam os eventos correspondentes. Cada adapter só existe quando
o evento entrar no catálogo oficial do domínio.

### Recipient Resolver

Port determinístico que resolve principals a partir do evento. Implementações de
infraestrutura consultam `people`, relações organizacionais e memberships por
repositories. O resultado é sempre revalidado por empresa e membership ativo.

### Delivery Policy

Serviço determinístico que recebe evento, destinatários e preferências. Decide:

- destinatários finais;
- obrigatoriedade e silenciamento;
- canais;
- prioridade;
- deduplicação;
- cancelamento;
- agendamento futuro;
- se a entrega deve ser suprimida.

No MVP, somente `in_app` produz entrega. Agendamento é contrato futuro e não cria
scheduler nesta PR. A policy não acessa banco nem envia mensagens.

### Notification

Registro imutável de conteúdo destinado a um usuário. Estado de consumo
(`unread`, `read`, `archived`) é separado do conteúdo e só pode seguir transições
aprovadas. A delivery key impede duplicação.

O nome físico legado `recipient_id` é preservado e representa definitivamente o
`auth.users.id`; a implementação não cria `recipient_user_id` paralelo nem migra
para `people.id`.

### Read Model

Contrato serializável que contém somente notificações do usuário corrente. O
Presenter formata datas e labels; não decide autorização.

### Preferences

Configuração por `(company_id, user_id)` aplicada pela Delivery Policy apenas a
eventos opcionais e entregas futuras.

### Templates

Templates globais são da plataforma; templates company-owned pertencem ao tenant.
Renderização ocorre antes da persistência e recebe dados mínimos já autorizados.
Template não resolve destinatário nem altera confidencialidade.

### Audit

Registro append-only de operações administrativas e tentativas operacionais. Não
armazena título, mensagem ou payload sensível.

## Producers e catálogo

O registro de Producers é explícito e server-only. O catálogo inicial preserva o
comportamento existente e classifica como opcionais:

| Producer | Eventos | Resolução | Ator recebe? |
| --- | --- | --- | --- |
| People | `employee.created`, `employee.archived` | gestor da pessoa | não |
| People | `employee.updated` | pessoa e gestor | não, quando coincidir |
| Organization | `team.created`, `team.updated`, `team.archived` | líder do time | não |
| Organization | `department.created`, `department.updated`, `department.archived` | líder do departamento | não |
| Explicit internal | evento catalogado com recipient explícito | resolver interno validado | conforme catálogo |

`notificationRecipientIds` vindo de metadata não é uma fonte confiável e deixa de
ser aceito diretamente. Novo evento ou nova regra de destinatário atualiza este
catálogo e recebe testes; não altera o pipeline.

## Persistência confiável

- a aplicação usa um adapter server-only separado do cliente de sessão;
- o adapter invoca uma função/RPC dedicada com credencial técnica mantida somente
  no servidor;
- a função é revogada de `PUBLIC`, `anon` e `authenticated`, e concedida apenas ao
  papel técnico;
- a função valida empresa, destinatário ativo, evento catalogado, origem e
  delivery key antes de persistir;
- a credencial técnica nunca atravessa Action, Query, Component ou bundle cliente;
- repositories de leitura continuam usando a sessão do usuário e RLS;
- falha de entrega não desfaz o fato do domínio, mas fica registrada como tentativa
  reprocessável. Erros não são apenas descartados em log.

Essa fronteira não autoriza um service role genérico dentro do domínio. O único
adapter permitido expõe o contrato estreito de persistência de Notifications.

### Contrato de persistência do MVP

- `notification_events`: intenção imutável, com `company_id`, `event_key`,
  `producer_key`, origem, classificação, obrigatoriedade, conteúdo mínimo e data;
- `notification_deliveries`: uma decisão da Delivery Policy por recipient/canal,
  com estado `pending`, `delivered`, `failed` ou `cancelled`, contador de
  tentativas e último código de erro;
- `notification_delivery_attempts`: histórico append-only de cada tentativa;
- `notifications`: read model in-app entregue, com conteúdo imutável e estado de
  consumo `unread`, `read` ou `archived`;
- `notification_preferences`: preferências self-service existentes;
- `notification_templates`: templates globais ou company-owned existentes;
- `notification_operation_audit`: auditoria append-only de consulta
  administrativa, cancelamento, reenvio e reprocessamento.

No hardening inicial, persistência e entrega in-app acontecem na mesma chamada
server-side. Uma falha deixa a delivery como `failed`; reprocessamento é manual e
auditado. Não existe espera automática, polling ou scheduler.

## Autorização

### Application Layer

- deriva usuário e empresa no servidor;
- não aceita `companyId` ou `recipientId` do cliente como autoridade;
- valida Producer e evento no registry;
- aplica Delivery Policy;
- restringe operações administrativas a `owner` e `admin` com motivo;
- expõe ao destinatário apenas comandos próprios.

### RLS

- `notifications`: SELECT e transições de consumo somente quando
  `recipient_id = auth.uid()` e existe membership ativo na mesma empresa;
- INSERT: negado a `anon` e `authenticated`;
- conteúdo e identidade são imutáveis após persistência;
- DELETE individual: negado;
- `notification_preferences`: self SELECT/INSERT/UPDATE, com empresa derivada de
  membership ativo; DELETE negado;
- templates globais: leitura pela fronteira server-side, escrita apenas pela
  plataforma;
- templates company-owned: leitura e gestão por `owner`, `admin` e `hr` da mesma
  empresa;
- operações administrativas não recebem SELECT direto sobre conteúdo de
  terceiros.

Policies e Application Layer são testadas separadamente. A função técnica também
valida invariantes; a credencial não transforma payload recebido em dado confiável.

### Administrative Access

Um serviço administrativo server-only retorna apenas status, timestamps,
producer key, event key, tentativas e códigos de erro. A operação exige `owner` ou
`admin`, motivo estruturado e gera auditoria.

### Self Access

Queries e Actions carregam o contexto corrente, ignoram escopo enviado pelo
cliente e operam somente sobre o usuário autenticado. Marcar como lida é
idempotente; arquivar é terminal para a caixa do usuário.

## Integridade e idempotência

A implementação deve acrescentar:

- FK de empresa;
- FK de destinatário compatível com a identidade escolhida;
- FK opcional para Activity quando a origem for Activity;
- unicidade de delivery por `(company_id, event_key, recipient_id, channel)`;
- coerência entre status e timestamps;
- índices para caixa, não lidas, origem e reprocessamento;
- validação que impede relações cross-tenant.

Essas garantias locais fazem parte do hardening de Notifications e não aguardam o
hardening relacional amplo dos demais domínios.

## Consumo e apresentação

O MVP mantém consumo sob demanda por Query server-side. Não há polling, Realtime,
WebSocket ou push autorizado nesta entrega. Componentes recebem somente
ViewModels. O link de uma notificação aponta para o domínio fonte, que executa sua
própria autorização.

## Canais futuros

A separação Event → Policy → Delivery permite adapters futuros para In-App,
Email, Push, Microsoft Teams e Slack. WhatsApp depende de nova Product Decision.
Cada canal futuro exige adapter, estado de entrega, retry, observabilidade,
segredos próprios e consentimento aplicável. Nenhum deles integra o escopo do
hardening inicial.

## Relação com Activity e outbox

Activity pode ser origem de um Notification Event, mas não é a fila de entrega.
`restricted` exige prova de acesso ao fato fonte antes da resolução. A outbox de
Approval é referência de confiabilidade, não infraestrutura transversal a ser
importada diretamente.

O pipeline de Notifications registra tentativas próprias. Uma outbox transversal,
broker, cron ou worker só será introduzido quando existir necessidade operacional
comprovada e decisão específica.

## Consequências

- a criação best-effort atual precisa migrar para a fronteira confiável;
- Actions e Queries deixam de aceitar escopo de autoridade do cliente;
- o diretório passa de `employees` para `people`;
- a migration de hardening inclui policies, integridade local, idempotência e
  testes pgTAP;
- nenhum canal externo é implementado;
- eventos futuros reutilizam o pipeline e ampliam apenas o catálogo e seus tests.

## Alternativas rejeitadas

- permitir INSERT para qualquer membro da empresa;
- confiar apenas em filtros das Actions ou repositories;
- usar metadata com recipient IDs como autorização;
- permitir acesso administrativo direto ao conteúdo;
- criar uma Notification em cada domínio;
- reutilizar a outbox de Approval como dependência genérica;
- introduzir fila, cron, Realtime ou provedor externo antes de necessidade
  comprovada.
