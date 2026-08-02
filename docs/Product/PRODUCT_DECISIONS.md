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

---

# PD-018 — Global Competency Concepts and Tenant Mapping

**Status:** Approved

**Owner:** Product Architect

## Contexto

Development Templates aceleram a criação de planos ao oferecer objetivos,
competências relacionadas, níveis-alvo e ações sugeridas. Templates podem ser
criados por uma empresa ou publicados globalmente pelo Evol OS.

Competências operacionais, porém, pertencem estritamente a uma empresa. Empresas
diferentes podem representar a mesma intenção de desenvolvimento com nomes,
descrições, níveis e taxonomias diferentes. Um template global não pode depender
do identificador privado escolhido por uma empresa.

Esta decisão define a identidade funcional usada por templates globais e a forma
determinística pela qual essa identidade é resolvida no catálogo de cada empresa.

## Problema

Uma referência direta entre um template global e uma competência operacional:

- vincula conteúdo da plataforma a um tenant específico;
- impede reutilização segura por outras empresas;
- pode expor ou atravessar identidades privadas;
- torna versionamento, auditoria e integrações dependentes de nomes locais;
- não explica como a intenção global se transforma em um objetivo executável no
  plano da empresa.

Nomes e aliases, isoladamente, não provam equivalência semântica. IA também não
pode transformar similaridade probabilística em vínculo oficial.

## Objetivos

- permitir que um template global expresse uma intenção de competência estável;
- preservar a autonomia do catálogo operacional de cada empresa;
- impedir qualquer referência de competência entre tenants;
- tornar a resolução explícita, determinística, auditável e reutilizável;
- preservar a origem e o significado histórico de planos já aplicados;
- permitir sugestões de IA sem delegar a ela a decisão humana.

## Não Objetivos

- padronizar ou substituir o catálogo operacional das empresas;
- obrigar empresas a adotar nomes ou níveis definidos pelo Evol OS;
- fundir automaticamente competências consideradas semelhantes;
- criar competências operacionais silenciosamente;
- definir persistência, APIs, migrations, eventos, triggers, RLS ou qualquer
  detalhe de implementação;
- decidir nesta entrega como taxonomias externas serão importadas.

## Decisão

Templates globais representam competências por meio de **Global Competency
Concepts** versionados e publicados pelo Evol OS.

Um Global Competency Concept **não é uma competência operacional**. Ele expressa
uma intenção semântica portátil, como um requisito de liderança, comportamento ou
conhecimento que pode ser interpretado por empresas diferentes.

Competências operacionais continuam estritamente tenant-owned. Cada empresa
resolve um conceito global por meio de um **Tenant Mapping** explícito para uma
competência do próprio catálogo.

Ao aplicar um template global, o Evol OS usa somente mappings válidos e cria um
**Application Snapshot**. O plano resultante referencia exclusivamente a
competência operacional da empresa e preserva a origem global e a resolução que
foram usadas naquele momento.

Nenhum template global pode possuir referência a uma competência operacional
tenant-owned. Nenhum identificador de competência pode atravessar tenants.

## Conceitos Fundamentais

### Global Competency Concept

Identidade semântica global, administrada pela plataforma, que descreve uma
intenção de competência reutilizável. Possui código estável, definição humana,
classificação, versões e aliases governados.

Não participa diretamente de cargos, avaliações de pessoas, gaps ou planos como
competência executável. Sua função é oferecer significado portátil para conteúdo
global.

### Competência operacional

Registro pertencente a uma única empresa e usado por seus cargos, pessoas,
avaliações e planos. Nome, descrição, níveis e uso refletem o contexto daquela
empresa.

Competências continuam estritamente tenant-owned e nunca se tornam globais por
serem associadas a um conceito.

### Tenant Mapping

Decisão explícita de uma empresa que declara qual competência do seu catálogo
realiza, em seu contexto, a intenção de um Global Competency Concept.

Mapping não funde identidades, não muda ownership e não torna a competência
visível a outros tenants.

### Application Snapshot

Registro histórico da versão do template, da versão do conceito, do mapping e da
competência operacional efetivamente resolvidos quando o template foi aplicado.

O snapshot explica a origem do plano sem manter seu comportamento dependente de
alterações futuras no template, no conceito ou no mapping.

## Ownership

### Plataforma Evol OS

Somente a autoridade de produto da plataforma, ou curadores explicitamente
delegados por ela, pode:

- criar Global Competency Concepts;
- definir e publicar versões;
- criar e administrar aliases globais;
- publicar conceitos para uso em templates;
- descontinuar conceitos ou versões;
- declarar compatibilidade entre versões.

Tenants não alteram, publicam nem descontinuam conteúdo global.

### Empresa

Cada empresa é dona de:

- suas competências operacionais;
- seus mappings;
- suas confirmações e rejeições de sugestões;
- seus snapshots e planos aplicados;
- seus templates company-owned.

`owner`, `admin` e `hr` podem criar, confirmar e desativar mappings da própria
empresa. A confirmação é sempre uma ação humana explícita. `manager` e
`employee` não administram mappings no escopo inicial.

Não é exigida aprovação por uma segunda pessoa no MVP. A auditoria identifica o
ator que realizou cada ação.

## Versionamento

- cada conceito possui uma identidade global estável ao longo do tempo;
- conteúdo publicado é imutável;
- mudança de significado cria uma nova versão;
- versões permanecem consultáveis para preservar histórico;
- aliases não podem reutilizar silenciosamente uma identidade com significado
  incompatível;
- templates globais publicados fixam a versão exata de cada conceito;
- um template publicado não muda de significado quando surge nova versão do
  conceito;
- adotar nova versão exige uma nova versão publicada do template;
- planos já aplicados nunca são atualizados retroativamente.

Compatibilidade entre versões é uma declaração explícita da plataforma. Não é
inferida por igualdade de nome, proximidade textual ou sugestão de IA.

## Regras de publicação

Um conceito pode permanecer em preparação sem estar disponível para templates
publicados. Para publicação, precisa possuir:

- identidade e código estáveis;
- definição clara e linguagem humana;
- classificação coerente;
- versão explícita;
- aliases sem colisão ou ambiguidade conhecida;
- responsável de plataforma identificável;
- estado apto a consumo.

Somente conceitos publicados podem ser usados por novas versões publicadas de
templates globais.

## Regras de descontinuação

- descontinuação impede novos usos, mas não apaga versões nem histórico;
- templates e planos históricos continuam explicáveis;
- templates globais ainda ativos não podem depender silenciosamente de um
  conceito indisponível para nova aplicação;
- quando houver substituto, ele é indicado explicitamente e não assume os
  mappings do conceito anterior;
- mappings existentes não são transferidos automaticamente;
- a empresa precisa confirmar qualquer nova resolução exigida pelo substituto.

## Regras de compatibilidade

- compatibilidade significa que uma resolução já confirmada continua
  semanticamente válida para a nova versão;
- somente a plataforma declara essa compatibilidade;
- incompatibilidade exige novo mapping ou reconfirmação humana;
- ausência de declaração é tratada como não confirmada;
- compatibilidade nunca altera planos já aplicados;
- aliases auxiliam descoberta, mas não estabelecem compatibilidade.

## Mapping

Todo requisito de competência de um template global precisa de um mapping válido
antes da aplicação para uma empresa.

Um mapping é válido somente quando:

- pertence à empresa que aplicará o template;
- aponta para uma competência operacional ativa da mesma empresa;
- corresponde à versão exigida ou a uma versão explicitamente compatível;
- foi confirmado por uma pessoa autorizada;
- não foi desativado;
- é inequívoco para o conceito e contexto aplicáveis.

`owner`, `admin` e `hr` podem criar e confirmar mappings. Os mesmos papéis podem
desativá-los. Remoção física não é permitida quando o mapping já participa de
histórico; desativação preserva rastreabilidade.

Uma empresa pode escolher uma competência com nome diferente do conceito global.
O que estabelece a resolução é a confirmação explícita, não igualdade textual.

## Templates globais

- referenciam exclusivamente versões publicadas de Global Competency Concepts;
- nunca referenciam competências operacionais;
- não carregam identificadores privados de tenant;
- não criam competência operacional durante aplicação;
- só podem ser aplicados quando todos os conceitos obrigatórios estiverem
  resolvidos de forma válida e inequívoca para a empresa.

## Templates company-owned

- referenciam diretamente competências operacionais da mesma empresa;
- não precisam de Tenant Mapping para essas referências;
- nunca podem referenciar competência de outra empresa;
- permanecem sujeitos à integridade tenant-owned;
- podem usar linguagem e estrutura próprias do tenant.

Associar futuramente um template company-owned a conceitos globais para fins de
interoperabilidade não faz parte desta decisão.

## Snapshots

Cada aplicação bem-sucedida de template global preserva, para cada objetivo:

- identidade e versão do template de origem;
- identidade, código e versão do conceito global;
- mapping utilizado e seu estado no momento da aplicação;
- competência operacional resolvida;
- representação humana apresentada no momento da resolução;
- níveis sugeridos e níveis efetivamente aplicados;
- instante da aplicação e ator responsável.

O snapshot é histórico e imutável. Alterar nome da competência, publicar nova
versão do conceito, trocar mapping ou descontinuar o template não reescreve um
plano existente.

O plano continua funcionalmente independente do template depois da aplicação.

## Regras Funcionais

Toda resolução é determinística. A aplicação do template deve falhar sem produzir
um plano parcial quando:

- algum conceito obrigatório não possui mapping;
- o mapping não foi confirmado ou está desativado;
- o mapping pertence a outra empresa;
- a competência resolvida pertence a outra empresa;
- a competência operacional está indisponível para novo uso;
- existem mappings concorrentes e não há resolução inequívoca;
- a versão exigida não é a confirmada nem foi declarada compatível;
- o conceito ou o template não está publicado e disponível para nova aplicação;
- a origem ou o snapshot necessário não pode ser preservado;
- qualquer verificação de integridade ou autorização falha.

A operação é atômica: ou todos os conceitos são resolvidos e o plano completo é
criado, ou nenhum resultado funcional é produzido.

## Auditoria

Devem ser auditáveis:

- criação, publicação, versionamento e descontinuação de conceitos;
- criação, alteração e descontinuação de aliases;
- publicação de versões de templates globais;
- criação, confirmação, rejeição e desativação de mappings;
- sugestões produzidas por IA e sua aceitação ou rejeição humana;
- aplicação do template e resolução usada para cada objetivo;
- falhas de aplicação causadas por ausência, ambiguidade ou incompatibilidade de
  mapping.

A auditoria preserva empresa, ator, operação, origem, decisão, data e versões
envolvidas. Ela não concede visibilidade cross-tenant nem copia informação privada
para o catálogo global.

## IA

A IA pode:

- sugerir competências locais candidatas para um conceito;
- explicar semelhanças e diferenças;
- identificar mappings ausentes ou potencialmente desatualizados;
- sugerir revisão diante de nova versão;
- auxiliar reconciliação de taxonomias externas.

A IA não pode:

- confirmar, aprovar, ativar ou desativar mappings;
- criar competência operacional silenciosamente;
- decidir equivalência semântica em nome da empresa;
- aplicar template quando a resolução estiver ausente ou ambígua;
- tratar nome ou alias como prova de identidade;
- alterar snapshots ou histórico;
- substituir a confirmação humana.

IA jamais confirma mappings. Ela apenas sugere. Toda resolução oficial permanece
determinística e humanamente confirmada.

## Segurança

- Competencies continuam estritamente tenant-owned;
- nenhum template global possui referência a competência operacional;
- nenhum identificador de competência atravessa tenants;
- conceitos globais não contêm informação privada de empresas;
- mappings pertencem a exatamente uma empresa;
- somente competência da mesma empresa pode resolver seu mapping;
- snapshots pertencem ao plano e à empresa que aplicou o template;
- papéis técnicos e caminhos alternativos de escrita não podem contornar essas
  invariantes;
- autorização de leitura ou escrita não substitui integridade de ownership.

## Impactos Esperados

- templates globais tornam-se reutilizáveis entre empresas com taxonomias
  diferentes;
- a primeira aplicação pode exigir uma etapa explícita de mapping;
- aplicações seguintes podem reutilizar mappings válidos;
- a interface precisa distinguir conceito global, competência local e status de
  resolução;
- importações futuras podem usar códigos globais como referência de
  reconciliação;
- analytics e IA podem comparar intenções globais sem expor catálogos privados;
- a implementação do hardening de Development precisa preservar os dois caminhos:
  conceito global resolvido e competência company-owned direta.

## Consequências

### Positivas

- isolamento entre empresas torna-se explícito;
- identidade semântica global não invade o domínio operacional;
- resolução é determinística, reutilizável e auditável;
- versionamento não altera planos históricos;
- empresas preservam autonomia terminológica;
- IA auxilia sem assumir decisão humana.

### Custos e riscos

- surge uma etapa de mapping antes da primeira aplicação;
- a plataforma precisa governar conceitos, versões e aliases;
- mappings podem exigir revisão quando o significado evolui;
- conteúdo global legado pode precisar de reconciliação manual;
- templates ficam indisponíveis enquanto houver conceito obrigatório sem
  resolução válida.

## Critérios de Aceitação

A decisão estará refletida corretamente no produto quando:

- um template global não depender de competência tenant-owned;
- conceitos globais e competências operacionais forem identidades distintas;
- toda competência operacional continuar pertencendo a uma empresa;
- template company-owned só usar competências da própria empresa;
- aplicação global exigir mappings humanos, válidos e inequívocos;
- nenhuma referência ou dado privado atravessar tenants;
- falha de resolução impedir criação parcial do plano;
- snapshots explicarem template, conceito, mapping e competência utilizados;
- versões publicadas e histórico permanecerem imutáveis;
- IA puder sugerir, mas nunca confirmar mappings;
- criação, aprovação, desativação e uso de mappings forem auditáveis;
- testes futuros comprovarem isolamento, atomicidade, versionamento e falha
  fechada.

## Questões Futuras

Exigem decisão própria quando entrarem no Roadmap:

- interoperabilidade com taxonomias externas;
- traduções e localização de conceitos e aliases;
- processo editorial e revisão especializada do catálogo global;
- forks company-owned de templates globais;
- mappings com validade temporal ou múltiplos contextos internos;
- sugestão de criação de competência quando não existir candidata adequada;
- associação opcional de templates company-owned a conceitos globais;
- política de compatibilidade automática para mudanças puramente editoriais;
- tratamento definitivo do conteúdo global legado após inventário de dados.
