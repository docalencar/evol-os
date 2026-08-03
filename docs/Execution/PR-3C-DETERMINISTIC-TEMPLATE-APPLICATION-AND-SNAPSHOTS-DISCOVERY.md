# PR 3C — Deterministic Template Application and Snapshots — Discovery

**Status:** Approved

## 1. Contexto

A PD-018 separa Global Competency Concepts de competências operacionais,
determina resolução por Tenant Mapping humano e exige Application Snapshot
imutável. A ADR-0012 protege relações tenant-owned. A ADR-0013 separa ator humano
de executor técnico. As PRs 3A e 3B materializaram, respectivamente, a integridade
operacional de Development e a infraestrutura de conceitos e mappings.

Este Discovery verifica se a PR 3C pode implementar a aplicação determinística
dos dois tipos de Development Template sem criar regra funcional ou arquitetura
não aprovada. Ele não autoriza implementação.

Não foi encontrada convenção versionada específica para documentos de Discovery.
O artefato permanece em `docs/execution/`, ao lado do plano do Slice 3, sem criar
uma nova categoria documental.

## 2. Objetivo

Definir o comportamento esperado da aplicação de Development Templates,
inventariar o código atual, revisar a aderência arquitetural e identificar os
gates necessários antes da implementação da PR 3C.

## 3. Fontes normativas

Ordem de precedência aplicada:

1. [PD-018](../Product/PRODUCT_DECISIONS.md);
2. [ADR-0003](../adr/0003-development-templates.md),
   [ADR-0012](../adr/0012-tenant-owned-referential-integrity-strategy.md) e
   [ADR-0013](../adr/0013-platform-global-authority-and-trusted-execution.md);
3. [Implementation Plan do Slice 3](./ADR-0012-SLICE-3-DEVELOPMENT-IMPLEMENTATION-PLAN.md);
4. [PROJECT_STATE](../PROJECT_STATE.md);
5. código e migrations incorporados à `main`;
6. [ROADMAP](../ROADMAP.md), [NEXT_STEPS](../NEXT_STEPS.md),
   [MVP_PLAN](../MVP_PLAN.md), [EPICS](../EPICS.md) e
   [CHANGELOG](../CHANGELOG.md).

Também foram consultados `CLAUDE.md`, `ARCHITECTURE.md`, ADRs 0001, 0002, 0004,
0005 e 0007–0009, os padrões aplicáveis de engenharia e o padrão de integridade
tenant-owned.

As questões arquiteturais identificadas neste Discovery foram decididas pela
[ADR-0014 — Deterministic Development Template Application and Snapshots](../adr/0014-deterministic-development-template-application-and-snapshots.md).

## 4. Estado confirmado

| Entrega | Evidência | Classificação |
| --- | --- | --- |
| ADR-0012 Slice 1 | migration 0064; commit `7271f49` | Concluída |
| ADR-0012 Slice 2 | migration 0065; commit `9c66958` | Concluída |
| PR 3A | migration 0066; commit `fe3d891` | Concluída |
| PR 3B | migration 0067; commit `f4a1a5d` | Concluída e validada |
| Encerramento documental da PR 3B | commit `504797f` | Concluído |
| PR 3C | PROJECT_STATE, ROADMAP e NEXT_STEPS | Planejada, não ativa |

O código confirma que a PR 3B não criou Application Snapshot e não alterou o
contrato público de `apply_development_template`.

## 5. Escopo funcional proposto para a PR 3C

- pré-validar um Development Template no tenant corrente;
- resolver deterministicamente todos os Goals;
- copiar Goals e Actions para um novo Development Plan;
- persistir Application Snapshot e lineage imutáveis;
- registrar aplicação, resultado e ator humano;
- tornar retries idempotentes e concorrência segura;
- preservar o fluxo company-owned existente;
- habilitar o caminho global somente com mapping válido;
- falhar fechado, atomicamente e sem plano parcial.

## 6. Fora de escopo

- marketplace de templates;
- importação de taxonomias externas;
- automação autônoma por IA;
- criação automática ou silenciosa de competências;
- IA confirmando mappings ou aplicações;
- edição retroativa de snapshots;
- reescrita de planos ou snapshots históricos;
- migração integral de todos os planos históricos;
- novos canais de Notification;
- redesenho amplo da experiência de Development;
- mudanças em outros domínios sem dependência comprovada;
- associação de template company-owned a conceitos globais;
- aplicação parcial de template;
- correção automática de legado ambíguo.

## 7. Atores e autorizações

### 7.1 Aplicação tenant-owned

O comportamento atual autoriza `owner`, `admin` e `hr`. A PR 3C deve preservar
essa superfície até que uma Product Decision determine papéis diferentes.
`manager` e `employee` não iniciam aplicação no recorte atual.

O ator humano é sempre `auth.users.id`, resolvido pela autenticação oficial. O
`company_id` vem do Current Company Context server-side. `company_id`, ator,
papel, capability ou executor enviados pelo cliente não são autoridade.

### 7.2 Template company-owned

O ator precisa de papel tenant autorizado e o template deve pertencer à mesma
empresa. A competência de cada Goal também deve pertencer à empresa e estar apta
a novo uso. Tenant Mapping não participa desse caminho.

### 7.3 Template global

O ator precisa de autorização tenant para criar o plano. Consumir conteúdo global
publicado não exige autoridade global da plataforma. Autoridade global é exigida
para criar, alterar, publicar ou descontinuar o catálogo e os templates globais,
não para consumi-los em um tenant.

Drafts e conteúdo global não publicado permanecem invisíveis. Papéis em
`company_members` nunca concedem autoridade global.

### 7.4 Executor técnico

Quando houver executor técnico, ele atua apenas após autorização do ator humano.
`service_role` nunca representa autoria, confirmação ou aprovação humana e deve
aparecer separadamente na auditoria.

## 8. Fluxo funcional

1. o usuário seleciona um template visível;
2. o servidor resolve ator e tenant confiáveis;
3. a Application Layer carrega template, Goals, Actions e referências necessárias;
4. uma pré-validação determinística retorna prontidão ou impedimentos estáveis;
5. o usuário confirma colaborador, responsável, prioridade e datas;
6. uma chave idempotente identifica essa confirmação;
7. a operação revalida autorização e toda a resolução dentro da fronteira de
   persistência;
8. a transação cria Plan, Goals, Actions, Application Snapshot, lineage e
   auditoria de sucesso;
9. somente após o commit a operação é considerada concluída;
10. o mesmo retry retorna o mesmo resultado; uma aplicação intencionalmente nova
    usa nova identidade idempotente.

Nenhuma pré-validação substitui a revalidação transacional.

## 9. Resolução determinística

### 9.1 Regras comuns

- o template deve existir, estar disponível para nova aplicação e possuir Goals;
- cada Goal precisa de nível-alvo válido;
- Actions são copiadas em ordem canônica por `order_index`, criação e ID;
- datas relativas usam a data inicial efetiva já resolvida;
- o nível atual vem da relação ativa do colaborador com a competência resolvida;
- o nível-alvo não pode ser menor que o nível atual;
- nenhuma busca por nome, alias livre ou similaridade decide identidade;
- todas as referências são carregadas uma única vez para produzir um comando
  canônico de aplicação;
- relógio, ator, correlation ID e chave idempotente entram como dependências
  explícitas, não como leituras ocultas da engine determinística.

### 9.2 Template company-owned

Cada Goal usa diretamente `competency_id`, protegido por `(competency_id,
company_id)`. A competência precisa ser ativa e do tenant corrente. O resultado
operacional referencia essa mesma competência.

### 9.3 Template global

Cada Goal usa a versão exata de Global Competency Concept persistida no template.
Para o tenant corrente, a resolução consulta exclusivamente mapping confirmado,
ativo e inequívoco para essa versão ou para compatibilidade explicitamente
declarada pela plataforma. A competência resolvida precisa estar ativa e pertencer
ao tenant.

Alias auxilia descoberta, mas nunca participa da resolução oficial. Sugestão de
IA não é mapping.

### 9.4 Determinismo

O resolver puro deve receber contratos completos e ordenados e produzir uma de
duas saídas imutáveis:

- comando resolvido, contendo todos os Goals e Actions prontos para persistência;
- lista ordenada de impedimentos com códigos estáveis.

A mesma entrada, incluindo versões, mappings, níveis atuais, data efetiva e
identidades explícitas, deve produzir o mesmo resultado.

## 10. Mappings ausentes ou inválidos

| Condição | Código funcional proposto | Comportamento |
| --- | --- | --- |
| mapping ausente | `DEVELOPMENT_TEMPLATE_MAPPING_REQUIRED` | falha antes de criar o plano |
| mapping proposto/rejeitado/inativo | `DEVELOPMENT_TEMPLATE_MAPPING_NOT_ACTIVE` | falha fechada |
| competência arquivada/inativa | `DEVELOPMENT_TEMPLATE_COMPETENCY_UNAVAILABLE` | falha fechada |
| versão global não publicada ou indisponível | `DEVELOPMENT_TEMPLATE_CONCEPT_VERSION_UNAVAILABLE` | resposta genérica, sem revelar draft |
| conceito descontinuado sem uso permitido | `DEVELOPMENT_TEMPLATE_CONCEPT_UNAVAILABLE` | falha fechada |
| referência estrutural inconsistente | `DEVELOPMENT_TEMPLATE_REFERENCE_INVALID` | falha e auditoria |
| referência cross-tenant | `DEVELOPMENT_TEMPLATE_TENANT_MISMATCH` | falha sem expor tenant estrangeiro |
| mais de uma resolução oficial | `DEVELOPMENT_TEMPLATE_MAPPING_AMBIGUOUS` | falha fechada |
| chave idempotente com payload diferente | `DEVELOPMENT_TEMPLATE_IDEMPOTENCY_CONFLICT` | não cria novo plano |
| nível-alvo abaixo do atual | `DEVELOPMENT_TEMPLATE_TARGET_BELOW_CURRENT_LEVEL` | falha com orientação funcional |

Mensagens para usuário devem informar o próximo passo sem expor UUIDs, nomes de
outros tenants, drafts globais, delegações, SQL ou detalhes internos. Exemplo:
“Este template ainda precisa de um mapeamento de competência antes de ser
aplicado.”

Não há aplicação parcial. Qualquer impedimento rejeita o conjunto completo.

## 11. Application Snapshot

O snapshot é um artefato histórico tenant-owned, pertencente à aplicação e ao
plano. Seu contrato lógico mínimo deve preservar:

- versão do formato do snapshot;
- identidade, escopo e versão do template;
- representação humana do template no instante da aplicação;
- para cada Goal: identidade, conteúdo, ordenação e nível-alvo originais;
- para cada Action: identidade, conteúdo, tipo, prazo relativo e ordenação;
- no caminho global: conceito, código e versão exata;
- mapping utilizado e seu estado confirmado naquele instante;
- competência operacional resolvida e representação humana apresentada;
- níveis atual, esperado, sugerido e efetivamente aplicado;
- colaborador, responsável, prioridade e datas efetivas;
- ator humano, executor técnico, correlation ID e instante da aplicação;
- identidade idempotente e resultado produzido.

O snapshot deve ser autossuficiente para auditoria e permanecer legível se
template, conceito, mapping ou competência forem posteriormente alterados,
desativados ou descontinuados. Ele não é reidratado a partir do estado atual.

Este Discovery não define tabela, coluna ou formato físico. Essa escolha pertence
à ADR e ao Implementation Plan posteriores.

## 12. Lineage

- o plano pode manter referência de lineage para a origem, mas não dependência
  funcional do template;
- mudanças futuras no template não alteram Plan, Goals, Actions ou snapshot;
- mudanças ou desativação do mapping não alteram aplicações anteriores;
- nova versão de template ou conceito não reescreve histórico;
- arquivamento da competência não apaga a representação histórica;
- o plano operacional continua referenciando a competência tenant-owned para sua
  execução corrente;
- auditoria reconstrói a decisão pelo snapshot, não por joins com linhas mutáveis.

A FK simples atual `development_plans.template_id` com `ON DELETE SET NULL` é
lineage auxiliar, não garantia histórica suficiente.

## 13. Idempotência e concorrência

O projeto já possui precedentes duráveis em Approval e KPI com unicidade
tenant-scoped. A PR 3C deve reutilizar esse padrão conceitual.

- a chave nasce na confirmação humana da aplicação;
- seu escopo é empresa mais operação de aplicação;
- retries da mesma confirmação reutilizam a mesma chave;
- a mesma chave e o mesmo fingerprint retornam o Plan já concluído;
- a mesma chave com payload diferente falha com conflito;
- aplicação intencional repetida usa nova chave;
- requisições concorrentes disputam uma unique no banco, não um lock apenas em
  memória;
- tentativas e resultados ficam correlacionados;
- falha não reserva indefinidamente uma chave sem estado e política explícitos.

O contrato atual não recebe chave idempotente. A evolução precisa preservar os
consumidores existentes e ser definida na ADR/Implementation Plan antes de
alterar a RPC pública.

## 14. Atomicidade

Uma aplicação bem-sucedida é uma única unidade transacional contendo:

- registro durável da aplicação;
- Development Plan;
- todos os Development Goals;
- todas as Development Actions;
- Application Snapshot;
- lineage;
- auditoria de sucesso.

Falha de resolução, autorização, persistência, snapshot ou auditoria impede o
resultado funcional completo. A RPC atual já cria Plan, Goals e Actions em uma
transação PostgreSQL, mas não contém snapshot, idempotência nem auditoria.

Falhas também precisam ser auditáveis conforme a PD-018. A arquitetura deve
definir um registro durável de tentativa capaz de preservar falha sem permitir
commit parcial do plano. O padrão de execução durável existente é preferível a
capturar exceção apenas na UI.

## 15. Auditoria

Cada tentativa deve registrar somente o necessário:

- empresa;
- ator humano;
- executor técnico, quando houver;
- operação;
- template, escopo e versão;
- chave idempotente e correlation ID;
- resultado e código de falha;
- referência do Plan e do snapshot em sucesso;
- timestamp;
- estados anterior e posterior quando houver transição real.

Não registrar tokens, secrets, credenciais técnicas, payloads excessivos ou dados
de outro tenant. Falhas de autorização não revelam se template global draft,
curador ou tenant estrangeiro existem.

## 16. Fronteira da IA

A IA pode sugerir template, sugerir mapping e explicar impedimentos. Ela não pode:

- confirmar ou ativar mapping;
- publicar template ou conceito;
- escolher entre mappings concorrentes;
- criar competência silenciosamente;
- confirmar a aplicação;
- substituir o ator humano;
- alterar snapshot ou histórico;
- converter similaridade em resolução oficial.

Somente dados determinísticos e confirmados entram no comando de aplicação.

## 17. UX de alto nível

1. apresentar origem global ou company-owned e versão disponível;
2. executar pré-validação antes de habilitar confirmação;
3. listar mappings ausentes ou inválidos com próximo passo claro;
4. permitir navegar para administração de mapping quando o papel autorizar;
5. coletar colaborador, responsável, prioridade e datas;
6. pedir confirmação humana explícita;
7. manter a chave idempotente durante retry;
8. mostrar sucesso com link para o plano;
9. mostrar erro funcional sem detalhes internos;
10. permitir inspeção futura do snapshot somente por leitura tenant autorizada.

Exportação de snapshot não está autorizada por documentação atual e permanece
fora do escopo.

## 18. Arquitetura recomendada e revisão obrigatória

### 18.1 Clean Architecture e DDD

- `DevelopmentTemplateApplicationResolver`: engine pura que resolve o template e
  produz comando ou impedimentos;
- Application Service/Handler: autoriza, carrega ports, chama resolver e entrega
  o comando à persistência confiável;
- ports: fontes de template, mapping, competência e nível atual; gateway atômico
  de aplicação;
- repository adapters: somente leitura/mapeamento e persistência;
- presenter: traduz impedimentos e resultado para ViewModel;
- UI: coleta confirmação e apresenta resultado, sem resolução própria.

O nome físico dessas peças deve seguir o padrão final aprovado; os papéis acima
são responsabilidades, não autorização para criar camadas novas.

### 18.2 Composition Root e Server Factory

A composição deve ser server-only e espelhar
`organization-planning/server/create-server-planning-application.ts`. A Action
resolve contexto confiável, cria a aplicação pela factory e chama um handler. Ela
não instancia repositories nem cliente `service_role` diretamente.

### 18.3 Server Action fina

A Action valida forma da entrada, ignora tenant/ator do cliente, chama a
Application Layer, traduz códigos conhecidos, revalida somente paths afetados e
não contém regra de mapping, snapshot ou idempotência.

### 18.4 Trusted Persistence

O gateway persistente deve realizar a unidade atômica no PostgreSQL. A Application
Layer resolve e autoriza; o banco revalida tenant, estados e unicidades. RLS não
substitui FKs ou checks. `service_role`, se necessário, permanece server-only,
submetido às invariantes e separado do ator.

### 18.5 Secure Administrative Read

Não há autorização para leitura transversal de snapshots. Leitura é tenant-owned
e limitada aos papéis/participantes já autorizados em Development. Uma futura
leitura administrativa global exige decisão própria e auditoria.

### 18.6 Defesa em profundidade

- Application Layer: autorização, resolução e códigos funcionais;
- engine: determinismo e ausência de efeitos;
- banco: atomicidade, idempotência, tenant, imutabilidade e lineage;
- RLS: quem pode ler e operar linhas;
- testes: unidade, integração, pgTAP e concorrência.

### 18.7 Contratos públicos

O contrato atual da RPC possui sete parâmetros e retorna somente `plan_id`. A
idempotência e os erros estruturados podem exigir evolução. Nenhuma mudança deve
ocorrer até a ADR escolher estratégia retrocompatível e o Product Architect
aprovar a superfície pública resultante.

### 18.8 Resultado da Architecture Review

| Tema | Resultado |
| --- | --- |
| Clean Architecture / DDD | Aplicável; fluxo atual concentra orquestração na RPC e ainda não possui ports/handler para PR 3C |
| Composition Root / Factory | Ausente no fluxo atual de aplicação; existe precedente em Organization Planning |
| Actions finas | Parcial; Action é fina, mas chama função de aplicação que acessa RPC diretamente |
| Trusted Persistence | RPC transacional existente é precedente reutilizável, porém incompleta |
| Secure Administrative Read | Nenhuma leitura transversal autorizada |
| capability-based global | Não é necessária para consumo de template publicado |
| ator versus executor | Deve seguir ADR-0013; fluxo atual não registra executor |
| isolamento tenant-owned | PRs 3A/3B fornecem FKs; lineage híbrido ainda precisa de desenho |
| RLS | Existente, mas snapshots e tentativas ainda não possuem policies |
| determinismo | Ordenação e cópia atuais são determinísticas; mapping global ainda não é resolvido |
| idempotência | Ausente |
| snapshot imutável | Ausente |
| lineage | Apenas `template_id` mutável/nullable; insuficiente |
| contratos públicos | Preservados até aqui; evolução permanece bloqueada |
| duplicação | Regra deve existir uma vez no resolver e ser reutilizada por readiness e apply |
| evolução futura | Snapshot versionado evita dependência de schema e origem mutáveis |

## 19. Inventário do código atual

### 19.1 Entrada e contrato de aplicação

- `apps/web/src/features/development/actions/apply-development-template-action.ts`:
  schema, Action e mensagens;
- `apps/web/src/features/development/application/apply-development-template.ts`:
  contrato TS e chamada direta à RPC;
- `apps/web/src/features/development/application/index.ts`: export público local;
- `apps/web/src/features/development/templates/components/apply-development-template-dialog.tsx`:
  confirmação humana atual.

### 19.2 Templates

- repositories de template, Goal e Action em
  `apps/web/src/features/development/templates/repositories/`;
- services e queries de leitura em
  `apps/web/src/features/development/templates/services/` e `queries/`;
- schemas e tipos em `schemas/` e `types/`;
- página de detalhe em
  `apps/web/src/app/(dashboard)/app/development/templates/[id]/page.tsx`;
- barrel público em `apps/web/src/features/development/templates/index.ts`.

Os tipos, schema, join de repository e página de detalhe ainda assumem
`competency_id` obrigatório e não representam adequadamente Goal global por
`global_concept_version_id`.

### 19.3 Global Concepts e Tenant Mappings

- módulo `apps/web/src/features/development/global-competencies/` com contracts,
  repositories, services, queries, Actions, componente e trusted database;
- migration 0067 e
  `supabase/tests/global_competency_authority_and_mappings.test.sql`.

Essa infraestrutura administra catálogo e mappings, mas não participa de
`apply_development_template`.

### 19.4 Persistência operacional

- migration 0008: Plan, Goal, Action e RLS;
- migration 0009: Template, Template Goal, Template Action e RLS;
- migration 0011: `development_plans.template_id`;
- migrations 0012 e 0013: RPC transacional e defaults;
- migration 0066: FKs compostas do agregado operacional;
- migration 0067: caminho híbrido e infraestrutura global.

### 19.5 Testes

- `apps/web/src/features/development/global-competencies/services.test.ts`;
- `supabase/tests/operational_development_tenant_integrity.test.sql`;
- `supabase/tests/global_competency_authority_and_mappings.test.sql`.

Não existe teste específico da Application Layer atual nem pgTAP de aplicação de
template, snapshot, idempotência ou concorrência.

### 19.6 Contratos e comportamento atuais

- RPC pública: sete parâmetros, retorno UUID do Plan;
- papéis: `owner`, `admin`, `hr`;
- tenant: enviado pela camada server a partir do contexto, mas também recebido
  como parâmetro pela RPC e revalidado por membership;
- resultado: Plan ativo, Goals e Actions copiados;
- atomicidade: fornecida pela função PostgreSQL;
- snapshot: apenas cópia operacional e `template_id`; não atende PD-018;
- idempotência, correlation ID e auditoria: ausentes;
- global Goal: rejeitado pelo fluxo legado por exigir `competency_id`.

## 20. Lacunas, divergências e bloqueios

| Evidência | Classificação | Impacto / correção necessária |
| --- | --- | --- |
| Implementation Plan marca PR 3B como “Próxima entrega” | Divergente | reconciliar status e acrescentar plano aprovado da PR 3C |
| links usam `Execution/`, mas o diretório versionado é `docs/execution/` | Divergente | corrigir referências na reconciliação; GitHub é case-sensitive |
| PD-018 exige versão exata de template; schema possui template mutável sem versão/publicação | Bloqueada | ADR deve definir identidade/versionamento; implementação não pode inferir |
| PD-018 admite compatibilidade explícita entre versões; migration 0067 não a representa | Incompleta | decidir correção aderente à PD-018 antes do resolver global |
| Application Snapshot | Incompleta | definir arquitetura e persistência imutável |
| idempotência e concorrência | Incompleta | definir contrato e mecanismo durável reutilizando precedentes |
| auditoria de falhas com transação atômica | Incompleta | definir tentativa durável sem commit parcial |
| RPC atual rejeita Goals globais | Consistente com PR 3B, incompleta para PR 3C | substituir/cutover somente na implementação autorizada |
| tipos e queries assumem competência local | Incompleta | evoluir união discriminada e ViewModels no futuro plano |
| `template_id` simples no Plan | Incompleta | tratar apenas como lineage auxiliar; snapshot é fonte histórica |
| contrato público sem idempotency/correlation | Bloqueada | ADR e aprovação de evolução retrocompatível |

Não foi encontrada divergência entre a PD-018 e a intenção do produto. As lacunas
são arquiteturais, de planejamento e de implementação. Nenhuma nova regra de
negócio deve ser inventada para contorná-las.

## 21. Riscos

- aplicar template mutável sem versão produz snapshot cuja origem não pode ser
  provada;
- resolver mapping fora da transação permite race com desativação;
- ler nível atual em momentos diferentes quebra determinismo operacional;
- retry sem idempotência duplica planos;
- chave derivada apenas do payload bloqueia aplicação repetida intencional;
- auditoria na mesma transação de uma exceção pode ser perdida no rollback;
- `service_role` sem ator validado pode simular decisão humana;
- reutilizar aliases como identidade cria resolução probabilística/ambígua;
- alterar tipos sem união discriminada pode tornar company/global inválidos
  representáveis;
- manter regra de readiness separada da regra de aplicação cria drift;
- snapshot JSON sem versão de formato dificulta evolução;
- expor códigos internos ou UUIDs pode revelar drafts ou tenants;
- backfill automático de histórico inventaria lineage inexistente.

## 22. Critérios objetivos de aceite futuros

### Company-owned

- template da empresa aplica com competência ativa do mesmo tenant;
- template ou competência cross-tenant falha;
- nenhum mapping é consultado;
- comportamento funcional atual de prioridade, datas, níveis e status é preservado.

### Global

- somente template global publicado/versionado pode ser aplicado;
- todos os conceitos exigidos resolvem por mapping confirmado, ativo e
  inequívoco;
- mapping ausente, inválido, incompatível ou cross-tenant falha antes de criar
  resultado;
- drafts globais não ficam visíveis nem têm existência revelada.

### Snapshot e lineage

- snapshot contém o contrato mínimo definido neste Discovery;
- snapshot e auditorias históricas rejeitam update/delete;
- alterar template, conceito, mapping ou competência não altera histórico;
- plano continua funcional sem consultar o template de origem.

### Atomicidade e idempotência

- falha em qualquer Goal, Action, snapshot ou auditoria deixa zero resultado
  funcional parcial;
- retry com mesma chave e payload retorna o mesmo Plan;
- mesma chave com payload diferente falha;
- duas requisições concorrentes produzem um único Plan;
- nova confirmação com nova chave permite aplicação intencional repetida.

### Autorização e auditoria

- `owner`, `admin` e `hr` aplicam dentro do tenant;
- demais papéis e usuário sem membership não aplicam;
- `company_id` e ator do cliente são ignorados;
- ator humano e executor técnico são distintos;
- sucesso e falhas normativamente auditáveis são registrados sem secrets;
- `service_role` não contorna tenant, mapping ou autoria.

### Arquitetura e regressão

- resolver puro possui testes determinísticos;
- Action permanece fina e composição server-only;
- repository não decide autorização ou mapping;
- readiness e apply reutilizam a mesma regra;
- contratos públicos existentes são preservados ou evoluídos conforme estratégia
  retrocompatível aprovada;
- Plans, Goals, Actions e templates anteriores continuam legíveis;
- IA permanece exclusivamente sugestiva.

## 23. Rollout futuro

Ordem documental recomendada, sem autorização de implementação:

1. reconciliar Implementation Plan, links e status da PR 3B;
2. aprovar ADR de Deterministic Template Application, Application Snapshot,
   lineage, idempotência, tentativa durável e evolução de contrato;
3. atualizar o Implementation Plan com recorte físico, migrations, contratos e
   testes da PR 3C;
4. executar preflight read-only para templates, versões, Goals, mappings e legado;
5. introduzir estruturas novas sem cutover;
6. validar constraints, RLS, imutabilidade e compatibilidade;
7. implementar resolver e composição server-only;
8. fazer cutover transacional preservando a superfície compatível;
9. executar testes unitários, pgTAP isolado/completo, concorrência e regressão;
10. observar erros por código, conflitos idempotentes e aplicações concluídas;
11. usar migration compensatória em rollback; nunca editar migration aplicada nem
    apagar snapshots/auditorias.

Feature flag só deve ser usada se o repositório possuir padrão aprovado no momento
do Implementation Plan. Nenhum padrão foi presumido neste Discovery.

## 24. Reconciliação e próximo gate

### Documentos a reconciliar

- `docs/execution/ADR-0012-SLICE-3-DEVELOPMENT-IMPLEMENTATION-PLAN.md`:
  marcar PR 3B concluída e incluir PR 3C apenas após a ADR;
- `docs/README.md`, `docs/PROJECT_STATE.md`, `docs/ROADMAP.md` e
  `docs/NEXT_STEPS.md`: corrigir referências `Execution/` para `execution/` onde
  aplicável, sem promover PR 3C antes da autorização;
- ROADMAP e NEXT_STEPS somente mudam de estado após decisão explícita do Product
  Architect.

### Questões arquiteturais abertas

1. qual identidade versionada e imutável representa uma versão publicada de
   Development Template;
2. qual modelo físico preserva snapshot e seus itens sem duplicar regra;
3. como representar compatibilidade explícita entre versões de conceitos exigida
   pela PD-018;
4. qual registro durável concilia idempotência, concorrência, auditoria de falha e
   atomicidade do resultado funcional;
5. como evoluir a RPC pública de forma retrocompatível;
6. quais policies permitem leitura do snapshot por participantes e papéis já
   autorizados, sem criar leitura global;
7. qual estratégia para planos históricos sem snapshot comprovável, sem inventar
   backfill.

### Conclusão

- **Product Decision nova:** não necessária. A PD-018 já decide comportamento,
  atomicidade, mapping humano, fail-closed, snapshot e fronteira da IA.
- **ADR nova:** necessária. Snapshot persistente, lineage, idempotência,
  concorrência, tentativa durável, versionamento de template e evolução do
  contrato são decisões arquiteturais permanentes ainda não cobertas.
- **Reconciliação:** necessária antes da ADR e novamente após sua aprovação.
- **Implementation Plan:** precisa ser atualizado depois da ADR.
- **Implementação da PR 3C:** bloqueada.

O próximo gate é a reconciliação mínima do estado do plano e, em seguida, a
proposta de ADR. Nenhuma implementação deve começar automaticamente.
