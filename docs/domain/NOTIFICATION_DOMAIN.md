# Notification Domain

## Objetivo

Entregar ao usuário certo uma comunicação derivada de um fato canônico, com
isolamento tenant, confidencialidade, preferências e idempotência. Notifications
não decide o fato, não concede acesso ao objeto fonte e não substitui Activity.

## Fontes canônicas

- política de produto: PD-017;
- arquitetura: ADR-0011;
- prioridade: `docs/ROADMAP.md`;
- recorte operacional: `docs/NEXT_STEPS.md`.

Este documento apenas reúne o vocabulário e o catálogo inicial; em conflito,
prevalecem PD-017 e ADR-0011.

## Vocabulário

```text
Domain Fact
  → Notification Producer
  → Notification Event
  → Recipient Resolver
  → Delivery Policy
  → Delivery / Notification
  → Read Model
```

- **Producer:** adapter do domínio fonte.
- **Event:** intenção imutável e idempotente de notificar.
- **Recipient:** usuário autenticável com membership ativo.
- **Resolver:** encontra recipients válidos a partir do evento.
- **Delivery Policy:** decide entrega, preferência, canal, prioridade e silêncio.
- **Notification:** conteúdo imutável persistido para um recipient.
- **Delivery attempt:** resultado operacional reprocessável, sem duplicação.
- **Preference:** opção do próprio usuário para eventos opcionais.
- **Template:** formatação que não decide acesso ou recipient.
- **Audit:** metadados de operação administrativa sem conteúdo sensível.

## Catálogo inicial

Todos os eventos iniciais são opcionais e usam apenas o canal in-app.

| Evento | Destinatário | Fonte |
| --- | --- | --- |
| `employee.created` | gestor da pessoa | People Activity |
| `employee.updated` | pessoa e gestor, exceto o ator | People Activity |
| `employee.archived` | gestor da pessoa | People Activity |
| `team.created` / `updated` / `archived` | líder do time, exceto o ator | Organization Activity |
| `department.created` / `updated` / `archived` | líder do departamento, exceto o ator | Organization Activity |

Nenhum recipient explícito vindo de cliente ou metadata pertence ao catálogo
inicial. Novos eventos exigem fonte canônica, Producer registrado, regra de
destinatário, classificação, obrigatoriedade e testes.

## Estados do MVP

### Consumo

```text
unread → read → archived
unread → archived
```

`archived` não volta à caixa ativa. Conteúdo, origem, recipient e delivery key são
imutáveis.

### Operação

```text
pending → delivered
pending → failed → processing → delivered
pending → cancelled
failed → cancelled
```

Reprocessar conserva a delivery key. `cancelled` e `delivered` são terminais.

## Critérios de domínio

- somente recipient próprio consome conteúdo;
- nenhuma entrega cross-tenant;
- nenhuma criação direta por cliente;
- mesma delivery key produz no máximo uma entrega por canal;
- evento obrigatório ignora preferências, mas o catálogo inicial não contém um;
- evento opcional respeita preferência vigente no momento da entrega;
- Activity restricted sem autorização comprovável é suprimida;
- link de destino não substitui autorização do domínio fonte;
- nenhuma exclusão física individual no MVP.

## Fora do escopo do hardening inicial

- Email, Push, Teams, Slack ou WhatsApp;
- UI de administração operacional;
- novos tipos funcionais de notificação;
- cron, fila externa, broker ou worker contínuo;
- alteração do conteúdo funcional emitido pelos domínios;
- política legal de expurgo por prazo.
