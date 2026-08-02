# Product Decisions

Este documento registra decisões permanentes do Evol OS.

Não documenta funcionalidades.

Documenta decisões de produto.

---

# PD-001

O Evol OS é um copiloto.

Não apenas um software.

---

# PD-002

A IA nunca toma decisões humanas.

Ela recomenda.

A decisão sempre pertence às pessoas.

---

# PD-003

Toda tela responde:

• O que é isso?

• Por que isso existe?

• Qual o próximo passo?

---

# PD-004

Nenhuma funcionalidade é considerada pronta apenas porque funciona.

Ela precisa passar pelos quatro gates:

• Engenharia

• Produto

• UX

• Consultoria RH

---

# PD-005

Sempre utilizar linguagem humana.

Evitar termos técnicos.

---

# PD-006

Toda tela possui uma ação principal.

---

# PD-007

Estados vazios ensinam.

Nunca apenas informam.

---

# PD-008

Coach Mode faz parte do produto.

Sempre que possível ensinar boas práticas.

---

# PD-009

A IA aparece naturalmente durante a jornada.

Não depende apenas de um chat.

---

# PD-010

O sucesso do Evol OS será medido pela evolução das empresas.

Não pela quantidade de funcionalidades.

---

# PD-011

Toda funcionalidade deve ser pensada para usuários com baixo nível de familiaridade tecnológica.

O sistema deve ser intuitivo mesmo para pessoas que nunca utilizaram um software de RH.

---

# PD-012

O Evol OS deve reduzir a necessidade de treinamento.

Quanto menos treinamento for necessário, melhor está o produto.

---

# PD-013

Sempre explicar antes de solicitar uma informação.

---

# PD-014

O sistema acompanha a maturidade da empresa.

A experiência evolui junto com o cliente.

---

# PD-015

Toda nova funcionalidade deverá considerar três públicos:

• RH

• Gestor

• Colaborador

Nenhuma funcionalidade será desenhada pensando apenas em um deles.

---

# PD-016 — Assessment Authorization Policy

**Status:** Approved

**Owner:** Product Architect

O módulo de Avaliações adota autorização por papel organizacional e por
participação explícita na `assessment_response`.

## Papéis e criação

- `owner`, `admin` e `hr` podem criar ciclos, avaliações e atribuições;
- `manager` não é papel administrativo e só recebe acesso quando participa como
  `evaluator`;
- `evaluator` e `evaluatee` são relações da avaliação, não papéis administrativos.

## Respostas

- somente o `evaluator` associado pode visualizar, editar, salvar e enviar sua
  resposta enquanto ela estiver em `draft` ou `in_progress`;
- depois de `submitted` ou `completed`, o `evaluator` continua podendo visualizar,
  mas não pode alterar;
- responses submetidas ou concluídas são imutáveis e não podem ser reabertas sem
  uma funcionalidade oficial futura;
- `owner`, `admin` e `hr` podem ler todas as `assessment_responses` e
  `assessment_answers` da empresa, mas nunca alterá-las;
- toda leitura administrativa deve ser auditável;
- nenhum outro usuário pode alterar respostas.

## Visibilidade do avaliado

Cada ciclo possui uma configuração `Assessment Visibility` com um dos valores:

- `none`;
- `score`;
- `score_and_competencies`;
- `score_and_comments`;
- `full`.

O acesso do `evaluatee` deve respeitar essa configuração. Ela não concede ao
avaliado permissão para alterar a resposta de outro evaluator.

## Exportação e defesa em profundidade

- somente `owner`, `admin` e `hr` podem exportar avaliações;
- toda autorização é validada pela Application Layer e igualmente protegida no
  banco por RLS;
- nunca se confia apenas na aplicação;
- operações administrativas, especialmente leitura, exportação, encerramento e
  uma eventual reabertura futura, devem ser auditáveis.

Esta decisão é a referência para Assessment, Assessment 360, Calibration,
Succession, Performance Review e futuras capacidades derivadas de Assessment.

---

# PD-017 — Notification Domain Policy

**Status:** Approved

**Owner:** Product Architect

Notifications é a capacidade transversal que comunica a uma pessoa um fato já
produzido por um domínio. Ela não cria fatos de negócio, não substitui Activity e
não autoriza uma operação: orienta o destinatário sobre informação, prazo ou ação
que já possui fonte canônica.

## Identidade do destinatário

- o destinatário canônico é o usuário autenticável, identificado por
  `auth.users.id` e representado como `recipient_user_id`;
- todo destinatário pertence à empresa por um `company_members` ativo;
- quando o fato se refere a uma pessoa, a resolução parte de `people.id` e usa
  `people.user_id`; pessoa sem usuário vinculado não recebe entrega;
- IDs informados por cliente, payload ou metadata nunca são aceitos como
  destinatários sem resolução e validação por um resolver registrado;
- empresa, pessoa e usuário resolvidos devem pertencer ao mesmo tenant.

`recipient_id` no schema legado representa `recipient_user_id`. A implementação
pode tornar esse significado explícito sem criar uma segunda identidade.

## Produção

- cada domínio pode possuir `Notification Producers` registrados;
- Producers emitem `Notification Events`; nunca inserem diretamente em
  `notifications`;
- somente a composição server-only pode invocar a fronteira confiável de
  persistência;
- `anon` e usuários `authenticated` não recebem permissão de criação direta;
- cada evento possui produtor, empresa, tipo, identidade idempotente, origem,
  classificação de confidencialidade e obrigatoriedade;
- eventos fora do catálogo de Producers são rejeitados;
- uma notificação referencia o fato de origem e não se torna nova fonte de
  verdade do domínio.

São obrigatórias as notificações explicitamente catalogadas como `mandatory` por
segurança, acesso, atribuição de aprovação ou ação de workflow que exija resposta
do destinatário. Elas são sempre entregues pelo canal in-app e não podem ser
silenciadas por preferência.

As demais são `optional` e respeitam preferências. Os Producers iniciais de
People e Organization são opcionais; não existe evento obrigatório inicial em
Notifications. Um novo evento obrigatório exige atualização aprovada do catálogo
do domínio, mas não uma nova arquitetura.

## Resolução de destinatários

- cada Producer declara quais resolvers pode usar;
- resolvers recebem somente o evento validado e devolvem usuários, nunca endereços
  de canal;
- resolvers de pessoa, gestor, líder de time e líder de departamento usam
  `people` como fonte canônica;
- resultados sem membership ativo, sem vínculo de usuário ou fora da empresa são
  descartados;
- duplicatas são removidas por `(company_id, event_key, recipient_user_id)`;
- o ator pode ser removido ou mantido somente conforme regra expressa no catálogo
  do Producer.

## Visibilidade e confidencialidade

- o destinatário visualiza somente as próprias notificações;
- nenhum papel corporativo recebe acesso ao conteúdo de notificações de terceiros
  apenas por ser `owner`, `admin`, `hr` ou `manager`;
- `owner` e `admin` podem consultar somente metadados operacionais de entrega por
  operação server-side auditada, com motivo; título, mensagem e metadata funcional
  não são retornados;
- `hr` não recebe acesso administrativo transversal e vê apenas notificações das
  quais é destinatário;
- a classificação do evento de origem é propagada e nunca pode ser relaxada;
- um Activity `restricted` só gera entrega para destinatário autorizado a acessar
  o fato de origem; se essa autorização não puder ser comprovada, a entrega é
  suprimida;
- metadata de Notifications contém apenas o mínimo necessário para navegação e
  deduplicação. Conteúdo sensível do fato de origem permanece no domínio fonte.

## Administração

- destinatário: consulta, marca como lida e arquiva as próprias notificações;
- destinatário não reenvia, cancela, reprocessa nem exclui fisicamente;
- `owner` e `admin`: consultam metadados operacionais e podem cancelar entrega
  pendente, reenviar ou reprocessar entrega falha por operação auditada e
  idempotente;
- `hr` e `manager` não possuem poderes operacionais transversais;
- reenvio ou reprocessamento não cria uma segunda notificação quando a mesma
  delivery key já foi concluída;
- notificação persistida tem conteúdo imutável. Cancelamento impede entrega
  futura, sem apagar histórico;
- templates da empresa são administrados por `owner`, `admin` e `hr`; templates
  globais pertencem à plataforma e não podem ser alterados por tenants.

## Preferências

- cada usuário lê e altera somente as próprias preferências dentro da empresa;
- administradores não alteram preferências de terceiros;
- alterações valem para entregas futuras e não removem histórico;
- preferências afetam apenas eventos opcionais e canais habilitados;
- notificações obrigatórias ignoram silenciamento e permanecem in-app;
- ausência de preferência usa os defaults persistidos;
- canais não implementados permanecem desabilitados, ainda que o contrato os
  reserve para evolução futura.

## Retenção e auditoria

- exclusão física de notificações individuais não faz parte do MVP;
- arquivamento é a forma de retirada da caixa ativa;
- notificações, tentativas e auditorias são mantidas enquanto o tenant estiver
  ativo;
- remoção física ocorre somente no processo aprovado de eliminação do tenant ou
  por futura política legal específica;
- consultas administrativas, cancelamentos, reenvios e reprocessamentos geram
  auditoria sem copiar conteúdo sensível;
- auditoria registra empresa, ator, operação, alvo, motivo e data;
- a política de retenção pode ser restringida por decisão legal futura, nunca
  ampliada silenciosamente pela implementação.

## Canais

O MVP desta entrega endurece somente o canal in-app existente. A política admite
Email, Push, Microsoft Teams e Slack como canais futuros. WhatsApp só pode ser
adicionado após decisão de produto própria. Nenhum canal futuro está autorizado a
ser implementado por esta decisão.
