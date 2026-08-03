# ADR-0012 Slice 3 — Development Implementation Plan

## Autoridade e vínculo

Este plano executa a ADR-0012 no domínio Development e detalha a infraestrutura
necessária para refletir a PD-018. A ADR-0013 governa a autoridade global e a
execução técnica confiável. A PD-018 governa a semântica funcional; a ADR-0012
governa integridade tenant-owned. Em caso de divergência, a implementação
para e a documentação é reconciliada antes de qualquer migration ou código.

A ADR-0014 — Deterministic Development Template Application and Snapshots está
Accepted. Este plano incorpora seu recorte técnico para a PR 3C, foi aprovado
pelo Product Architect e passou pelo Implementation Readiness Review sem lacuna
técnica ou arquitetural conhecida. A implementação permanece bloqueada até
autorização explícita posterior.

## Estratégia de entrega

| PR | Entrega | Status | Dependência |
| --- | --- | --- | --- |
| 3A | Operational Development Integrity | Concluída no commit `fe3d8914ce4da54e85f94794b367582971403ffa` | ADR-0012 |
| 3B | Global Concepts and Tenant Mappings | Concluída no commit `f4a1a5d94afa0ef76132f18ac6b1ade5636ffda1` | PR 3A, PD-018 e ADR-0013 concluídas |
| 3C | Deterministic Template Application and Snapshots | Implementation Plan aprovado; IRR tecnicamente pronto; implementação não autorizada | PR 3B concluída e ADR-0014 aceita |

As três PRs são sequenciais. A conclusão de uma não autoriza automaticamente a
seguinte.

## PR 3B — objetivo

Introduzir a infraestrutura administrativa definida pela PD-018 para conceitos
globais, suas versões e aliases, mappings tenant-owned e respectivas auditorias.
Evoluir Development Template Goals para representar, de forma exclusiva, o
caminho global por conceito versionado ou o caminho company-owned por competência
operacional, sem alterar ainda a aplicação de templates.

## Global Authority Foundation

A PR 3B materializa cadastro interno de autoridades e delegações globais,
capabilities fechadas e versionadas, estados ativo, expirado e revogado,
concedente e beneficiário humanos, motivo, validade temporal, auditoria
append-only, identidade técnica separada, bootstrap operacional controlado e
contexto global server-only. Owner/admin/hr continuam tenant-owned: administram
Tenant Mappings da própria empresa, mas não conceitos globais. Curadoria global
não concede autoridade tenant; as duas autorizações são avaliadas separadamente.

`service_role` somente executa operação já autorizada, nunca comprova aprovação
humana, nunca é ator humano ou credencial de cliente, permanece submetido às
constraints e é registrado separadamente na auditoria.

O catálogo distingue leitura, edição de drafts, publicação, descontinuação,
aliases, publicação de templates e administração de curadores. Esta última não é
consequência da curadoria de conteúdo. O bootstrap identifica o primeiro ator,
usa executor técnico, audita a operação e não deriva autoridade de email, domínio
ou membership.

## Escopo

- Global Competency Concepts;
- versões imutáveis;
- aliases globais governados;
- auditoria de criação, publicação e descontinuação;
- Tenant Mappings;
- histórico append-only das decisões de mapping;
- evolução híbrida de Development Template Goals;
- caminho global baseado em versão publicada de conceito;
- caminho company-owned baseado em competência tenant-owned;
- RLS e grants necessários;
- repositories, services, contracts, queries e actions administrativos;
- consulta determinística de prontidão e candidatos;
- testes unitários, pgTAP e reconciliação documental.

## Fora do escopo

- Application Snapshot;
- cutover de `apply_development_template`;
- alteração do contrato público de aplicação de templates;
- qualquer parte da PR 3C;
- criação silenciosa de competências operacionais;
- IA confirmando, ativando ou desativando mappings;
- inferência de identidade ou mapping por nome ou alias;
- correção, backfill ou reparo automático de legado ambíguo.

## Invariantes funcionais

- Global Competency Concept não é competência operacional.
- `competencies` permanece estritamente tenant-owned.
- template global nunca possui `competency_id` tenant-owned.
- template company-owned referencia somente competência da própria empresa.
- mapping pertence a uma empresa e resolve para competência da mesma empresa.
- somente `owner`, `admin` ou `hr` confirma ou desativa mapping.
- IA e identidades técnicas podem sugerir, mas nunca confirmar mapping.
- resolução oficial é determinística e fail-closed.
- conteúdo publicado é imutável; mudança cria nova versão.
- histórico publicado ou utilizado não é apagado.
- nenhum identificador tenant-owned atravessa empresas.

## Modelo de dados planejado

### Classificação e ownership

| Entidade lógica | Classificação | Owner | Cardinalidade principal |
| --- | --- | --- | --- |
| Global Competency Concept | global | plataforma Evol OS | 1:N versões |
| Global Concept Version | global | plataforma Evol OS | N:1 conceito; 1:N aliases e referências de template |
| Global Alias | global | plataforma Evol OS | N:1 versão de conceito |
| Global Publication Audit | global, append-only | plataforma Evol OS | N:1 conceito/versão |
| Tenant Mapping | tenant-owned | empresa | N:1 empresa; N:1 versão de conceito; N:1 competência local |
| Mapping History | tenant-owned, append-only | empresa | N:1 mapping |
| Development Template Goal | híbrida pelo owner do template | plataforma ou empresa | N:1 template; exatamente uma referência de competência |

Entidades globais não possuem `company_id`. Entidades tenant-owned possuem
`company_id` obrigatório. Auditoria tenant-owned repete `company_id` para permitir
integridade física e isolamento independente da cadeia de joins.

### Identidade, estados e imutabilidade

- conceito possui ID global e código estável globalmente único;
- versão possui número monotônico único dentro do conceito;
- estados de versão distinguem preparação, publicação e descontinuação;
- somente versão publicada pode ser referenciada por template global disponível;
- publicação fixa conteúdo, definição, classificação e aliases da versão;
- versão publicada não é atualizada nem removida; correções semânticas criam nova
  versão;
- descontinuação bloqueia novo uso sem apagar histórico;
- mapping distingue proposta, confirmação humana, rejeição e desativação;
- apenas mapping confirmado e ativo está pronto para resolução futura;
- cada transição persistida registra ator, origem, instante e estado anterior e
  posterior em histórico append-only;
- sugestão de IA permanece proposta e não pode produzir estado confirmado.

### Candidate keys e referências

- conceito: código estável globalmente único;
- versão: `(concept_id, version_number)` única e ID próprio estável;
- alias: forma normalizada não pode resolver ambiguamente para conceitos globais
  diferentes dentro do catálogo consumível;
- competência operacional: candidate key existente `(id, company_id)`;
- mapping: candidate key `(id, company_id)` e unicidade da resolução ativa por
  `(company_id, concept_version_id)`;
- histórico de mapping referencia `(mapping_id, company_id)`;
- templates company-owned devem expor candidate key `(id, company_id)` antes da
  criação das referências compostas necessárias;
- Template Goal company-owned referencia `(competency_id, company_id)` para
  `competencies (id, company_id)` e preserva a empresa do template;
- Template Goal global referencia uma versão global publicada por FK simples;
- referências tenant-owned são compostas; referências entre entidades globais
  são simples; a relação híbrida é protegida por exclusividade e coerência com o
  scope do template.

### Constraints e índices

- check de exclusividade: exatamente um entre conceito versionado global e
  competência operacional local;
- check/trigger de coerência: template `global` usa somente o caminho global e
  possui `company_id` nulo; template `company` usa somente o caminho local e
  possui `company_id` não nulo;
- FK composta impede competência ou mapping cross-tenant;
- FK e proteção de estado impedem referência nova a versão não publicada ou
  descontinuada;
- unicidades impedem código, versão, alias consumível e mapping ativo ambíguos;
- constraints novas sobre dados existentes são criadas `NOT VALID`, validadas e
  somente então substituem proteções antigas;
- índices cobrem códigos, versões por conceito, aliases normalizados, catálogo
  publicado, mappings por empresa/conceito/estado, competência resolvida,
  histórico por mapping e referências dos Template Goals;
- índices parciais são usados quando a unicidade depende do estado ativo ou
  publicado, sem permitir duas resoluções oficiais simultâneas.

### Fronteira confiável de escrita global

Escrita de conceitos, versões, aliases e publicação não é concedida diretamente a
tenants. Ela ocorre por fronteira server-only da plataforma, com identidade
técnica autorizada, validação de transição e auditoria atômica. `service_role` não
substitui as constraints e não torna escrita global uma operação do cliente.

## Preflight obrigatório

A migration aborta, sem corrigir dados, quando encontrar:

- template global referenciando competência tenant-owned;
- template company-owned referenciando competência de outra empresa;
- template global sem conceito/versionamento global válido;
- `scope` incompatível com a presença ou ausência de `company_id`;
- Template Goal com referências global e tenant-owned simultâneas;
- Template Goal sem nenhum dos dois caminhos;
- conceito ou versão inexistente, inválido ou incompatível com uso publicado;
- alias normalizado que produza resolução ambígua;
- mappings duplicados, concorrentes, cross-tenant ou inconsistentes;
- mapping confirmado sem ator humano autorizado ou para competência inválida;
- conteúdo legado cuja semântica não possa ser provada pelos dados existentes.

Não há backfill por nome, inferência por alias, reparo automático ou escolha
silenciosa de mapping. Legado ambíguo bloqueia a PR e exige decisão documental.

## Application Layer planejada

### Contratos de leitura

- consultar catálogo de conceitos e versões publicados;
- consultar mappings da empresa por conceito, competência e estado;
- consultar histórico auditável de um mapping dentro da empresa;
- avaliar prontidão de um template sem aplicá-lo;
- listar candidatos determinísticos já existentes, claramente separados de
  sugestões não confirmadas.

### Contratos de escrita

- criar proposta de mapping para a empresa corrente;
- confirmar mapping por ação humana de `owner`, `admin` ou `hr`;
- rejeitar proposta ou sugestão;
- desativar mapping sem remoção física do histórico;
- administrar conceitos, versões, aliases e publicação somente pela fronteira
  confiável global;
- persistir operação e auditoria na mesma transação.

Repositories preservam ownership e não decidem autorização. Services aplicam
transições e invariantes. Queries não expõem drafts globais a tenants. Actions
resolvem contexto e ator, autorizam o papel e chamam o contrato da aplicação.
Nenhum desses contratos chama ou altera `apply_development_template` na PR 3B.

### Contexto global de autorização

O contexto global é separado do `CurrentUserContext` tenant-owned. Resolve o ator
por `auth.users.id`, carrega delegações ativas, exige a capability específica e
valida expiração/revogação antes do executor técnico. Ator, capability e delegação
do cliente são ignorados; erros não revelam curadores existentes.

Auditoria registra ator humano, executor, delegação, capability, operação, alvo,
motivo, timestamp, correlação, resultado e estados anterior/posterior quando
aplicável. Secrets, tokens e chaves nunca são persistidos.

### Componentes mínimos de resolução

A experiência administrativa expõe o conceito publicado, a versão exigida, o
estado atual do mapping, a competência local confirmada e candidatos disponíveis.
Ela permite propor, confirmar, rejeitar e desativar conforme o papel do usuário,
sempre distinguindo sugestão de decisão oficial. Não aplica templates, não cria
snapshots e não transforma similaridade de nome em resolução.

## RLS e segurança

- tenants leem somente conceitos e versões globais publicados e disponíveis;
- drafts e conteúdo global não publicado são invisíveis a tenants;
- escrita global não é concedida a `authenticated`;
- `owner`, `admin` e `hr` administram mappings apenas da própria empresa;
- `manager`, `employee`, usuários sem membership, IA e identidade técnica de
  sugestão não confirmam mappings;
- histórico de mapping é legível somente no tenant autorizado e append-only para
  caminhos comuns;
- nenhuma policy aceita `company_id` fornecido pelo cliente como prova isolada;
- nenhuma policy permite leitura ou escrita cross-tenant;
- `service_role` pode executar operações técnicas autorizadas, mas não contorna
  FKs, checks, unicidades, imutabilidade ou coerência de ownership;
- grants mínimos acompanham RLS; funções privilegiadas fixam `search_path` e
  validam ator e tenant explicitamente.

## Testes previstos

### Unitários

- transições válidas e inválidas de conceitos, versões e mappings;
- versão publicada imutável;
- confirmação exclusivamente humana e autorizada;
- desativação sem apagar histórico;
- prontidão determinística e fail-closed;
- compatibilidade dos contratos existentes;
- ausência de chamadas ao fluxo de aplicação de templates.

### pgTAP

- leitura de conceitos e versões publicados;
- drafts globais não expostos;
- imutabilidade de versões publicadas;
- aliases únicos e não ambíguos;
- exclusividade dos caminhos global e company-owned em templates;
- competência company-owned same-tenant e rejeição cross-tenant;
- criação, confirmação, rejeição e desativação de mappings por papel;
- duplicidade e concorrência de mapping;
- auditoria e histórico append-only;
- IA/identidade técnica incapaz de confirmar mapping;
- `manager` e `employee` incapazes de administrar mapping;
- isolamento RLS;
- `service_role` submetido à integridade física;
- todos os gates do preflight;
- regressão do fluxo company-owned existente, sem executar cutover global.
- usuário sem delegação e papéis tenant sem autoridade global;
- capability permitida, não delegada, expirada e revogada;
- curador sem administração de curadores tentando delegar;
- escrita global direta pelo cliente negada;
- `service_role` incapaz de simular autoria humana;
- auditoria separando ator, delegação e executor;
- bootstrap e automação técnica auditados;
- IA/identidade técnica incapaz de publicar;
- escalonamento cross-tenant/global negado e revogação com efeito imediato.

### Gates técnicos

- migration local limpa quando sua execução for autorizada;
- pgTAP isolado e suíte completa;
- `supabase db lint --local`;
- TypeScript;
- build;
- lint;
- `git diff --check`;
- inspeção de constraints, índices, policies, grants, triggers e funções;
- confirmação de que o contrato público de `apply_development_template` não
  mudou.

## Rollout, rollback operacional e riscos

- migrations são forward-only;
- preflight read-only é o primeiro ponto seguro de interrupção;
- estruturas novas são introduzidas antes de conectar referências existentes;
- constraints sobre legado usam `NOT VALID` antes de `VALIDATE CONSTRAINT`;
- constraints antigas só são removidas após validação das substitutas;
- falha antes da validação aborta a migration sem reparo parcial;
- depois da integração, rollback ocorre por migration compensatória;
- auditorias e históricos nunca são apagados no rollback;
- conteúdo global legado ambíguo bloqueia rollout;
- incompatibilidade dos contratos existentes bloqueia merge;
- o schema híbrido pode existir antes do cutover, mas a PR 3B não habilita a
  aplicação do caminho global;
- a PR 3C só começa após validação e aprovação explícita da PR 3B.

## Critérios de conclusão da PR 3B

- conceitos, versões, aliases e publicação obedecem ownership e imutabilidade;
- mappings são tenant-owned, humanos, inequívocos e auditáveis;
- Template Goals expressam exatamente um dos dois caminhos permitidos;
- RLS, grants e constraints comprovam isolamento e autoridade;
- Application Layer administrativa existe sem alterar aplicação de templates;
- preflight falha fechado diante de qualquer legado não comprovável;
- testes e gates passam ou falhas externas são classificadas com evidência;
- documentação é reconciliada;
- nenhuma capacidade da PR 3C foi iniciada.

---

## PR 3C — Deterministic Template Application and Snapshots

### Status e objetivo

**Status:** Implementation Plan aprovado e IRR tecnicamente concluído;
implementação aguardando autorização explícita do Product Architect.

Implementar a aplicação determinística de Development Templates company-owned e
globais sobre uma única regra canônica, produzindo Development Plan completo,
Application Snapshot, lineage e auditoria com atomicidade, idempotência e
isolamento tenant-owned. O fluxo deve preservar os consumidores existentes
durante a transição e não pode inferir mappings, reconstruir histórico ou delegar
resolução à IA.

### Autoridade normativa

- PD-018 define conceitos globais, mappings humanos, snapshot, atomicidade e
  fronteira da IA;
- ADR-0003 preserva a composição Template → Goals → Actions;
- ADR-0012 governa ownership e integridade relacional tenant-owned;
- ADR-0013 separa ator humano de executor técnico;
- ADR-0014 governa identidade da aplicação, versões consumíveis, Resolver,
  Trusted Persistence, snapshot, lineage, idempotência e composição server-only;
- o Discovery aprovado da PR 3C documenta o comportamento atual, os impedimentos
  funcionais e os critérios de regressão.

Em caso de divergência entre este plano e uma dessas fontes, a implementação deve
parar. Este plano não autoriza migration, código, teste ou alteração de contrato.

### Escopo

- versionamento consumível de Development Templates;
- identidade durável de Template Application e tentativas correlacionadas;
- Resolver determinístico único para Readiness e Apply;
- Trusted Persistence atômica, idempotente e segura sob concorrência;
- Application Snapshot imutável e versionado;
- lineage permanente entre aplicação, versão, snapshot e Plan;
- auditoria de sucesso e falha com ator e executor distintos;
- evolução retrocompatível do contrato público;
- Composition Root, Server Factory, ports, repositories e adapters necessários;
- Server Actions finas e experiência mínima de readiness/apply;
- constraints, índices, RLS, grants e imutabilidade;
- testes unitários, integração, pgTAP, concorrência e regressão;
- preflight, cutover observável e rollback operacional.

### Fora do escopo

- alteração das regras de produto da PD-018;
- nova autoridade global ou novo modelo de Tenant Mapping;
- IA criando, confirmando ou escolhendo mappings;
- resolução por nome, alias, similaridade ou heurística;
- aplicação parcial de template;
- backfill inferido de versões, snapshots ou lineage históricos;
- reescrita de Plans já existentes;
- exportação ou leitura administrativa global de snapshots;
- remoção imediata do contrato legado;
- redesign amplo de Development;
- mudanças em outros domínios sem dependência técnica comprovada.

## Matriz de execução da PR 3C

| Frente | Objetivo e impacto | Arquivos prováveis | Ordem e dependências | Validação | Rollback | Critérios de aceite |
| --- | --- | --- | --- | --- | --- | --- |
| Modelo e versões | Introduzir identidades duráveis sem alterar histórico existente | próxima migration em `supabase/migrations/`; tipos e repositories de templates em `apps/web/src/features/development/templates/` | preflight; estruturas aditivas; constraints; depende da PR 3B | catálogo PostgreSQL, pgTAP, leitura de legado | interromper antes do cutover; após merge, migration compensatória sem apagar histórico | toda nova aplicação consome uma versão imutável e consumível |
| Template Application | Correlacionar confirmação, tentativas, resultado e falha | domínio/application de Development; migration; adapters de persistência | após estruturas de versão; antes do Resolver integrado | unidade, integração, pgTAP e concorrência | preservar aplicações e tentativas; desativar novo entrypoint | identidade própria, tenant-owned e imutável |
| Resolver | Produzir comando completo ou impedimentos ordenados | novos contratos e engine pura em `apps/web/src/features/development/application/` ou submódulo coerente existente | após contratos de leitura; antes do cutover | testes puros determinísticos e paridade Readiness/Apply | manter fluxo legado sem habilitar novo cutover | Readiness e Apply usam a mesma regra sem I/O ou IA |
| Trusted Persistence | Persistir resultado completo com idempotência e concorrência | adapter server-only; próxima migration; fronteira RPC/função versionada | após schema e Resolver; antes das Actions finais | pgTAP transacional, corrida concorrente e inspeção de catálogo | manter contrato legado; migration compensatória forward-only | no máximo um Plan por intenção e zero resultado parcial |
| Snapshot e lineage | Preservar evidência autossuficiente e origem permanente | contratos de domínio, adapter de leitura, migration e queries tenant-owned | junto da unidade atômica; nunca por backfill inferido | imutabilidade, alteração das origens e leitura histórica | nunca apagar ou reescrever snapshots; desligar apenas novas escritas | histórico permanece explicável sem estado atual |
| Auditoria | Registrar sucesso, falha, ator, executor e correlação | contratos/application; trusted adapter; migration | identidade confiável antes da tentativa; sucesso no commit atômico; falha após rollback funcional | unidade, integração e pgTAP append-only | preservar auditoria; compensar somente fluxo futuro | falhas não criam Plan parcial e sucessos são correlacionáveis |
| Contrato e Actions | Evoluir sem quebrar consumidores | `apply-development-template-action.ts`, `apply-development-template.ts`, dialog e entrypoints | contrato aditivo; adapter legado; migração dos consumidores; cutover | regressão do contrato atual e novos resultados | manter adapter legado e retornar consumidores ao caminho anterior | nenhuma quebra silenciosa e uma única regra de aplicação |
| Composição server | Centralizar dependências concretas | `apps/web/src/features/development/server.ts`, diretório `server/` e factories de application | após ports; antes de conectar Actions | import boundaries, TypeScript e testes de factory | Action volta ao entrypoint legado sem remover novas estruturas | nenhum Client Component importa server-only |
| Segurança e RLS | Autorizar linhas sem substituir integridade | migration e pgTAP da PR 3C | após classificar ownership; antes do cutover | papéis, cross-tenant, service role, grants e catálogo | policies compensatórias; nunca relaxar tenant | owner/admin/hr no próprio tenant; demais negados |
| Rollout | Ativar somente após todos os gates | documentação de acompanhamento e consumidores existentes | preflight → expand → validar → integrar → cutover → observar | suíte completa e smoke test autorizado | retorno ao adapter legado e migration compensatória | nenhum legado inventado e rollback sem perda histórica |

## 1. Evolução do modelo

### Estruturas e responsabilidades

O modelo lógico deve acrescentar, de forma aditiva:

- **Development Template Version:** conteúdo consumível e imutável de um
  Development Template estável;
- **Versioned Template Goal e Action:** conteúdo, ordenação e referências que
  pertencem exatamente a uma versão;
- **Template Application:** raiz tenant-owned da confirmação humana;
- **Application Attempt:** fato append-only de execução ou transporte ligado à
  mesma aplicação;
- **Application Snapshot:** evidência histórica imutável do comando resolvido;
- **Application Lineage:** vínculo permanente entre aplicação, versão, snapshot e
  Development Plan;
- **Concept Version Compatibility:** declaração global explícita quando uma
  versão de conceito puder reutilizar mapping confirmado para outra versão, sem
  inferência automática.

Template Application, snapshot, tentativas e lineage pertencem a um único tenant.
Versões de template global são globais; versões company-owned preservam o tenant
do template. Referências tenant-owned seguem a ADR-0012. Referências globais não
recebem `company_id` decorativo.

### Ordem

1. executar preflight read-only;
2. introduzir estruturas e identidades sem alterar o fluxo atual;
3. materializar versões para conteúdo comprovável;
4. adicionar candidate keys, FKs, checks, índices, RLS e grants;
5. validar constraints antes de conectar a Application Layer;
6. implementar leitura dos novos contratos;
7. habilitar escrita somente pela Trusted Persistence;
8. realizar cutover após todos os testes.

### Critérios de aceite

- toda entidade possui classificação global ou tenant-owned inequívoca;
- nenhuma relação tenant-owned depende apenas de ID quando a ADR-0012 exigir
  chave composta;
- legado ambíguo interrompe o rollout, sem correção automática;
- estruturas novas permanecem aditivas até o cutover;
- nenhum Plan histórico recebe snapshot ou versão inventados.

## 2. Versionamento dos Development Templates

### Modelo de ciclo de vida

- o Development Template mantém identidade estável;
- drafts são mutáveis e nunca consumíveis;
- publicar cria ou fixa uma versão imutável com Goals, Actions, referências,
  níveis, prazos e ordenação completos;
- versões globais exigem autoridade humana global da ADR-0013;
- versões company-owned exigem a autorização tenant já vigente;
- somente versão publicada e disponível é consumível;
- obsolescência ou descontinuação bloqueia novas aplicações conforme o estado,
  mas preserva consulta histórica;
- mudança funcional cria nova versão; nunca altera versão consumida;
- template global fixa versões exatas dos conceitos;
- compatibilidade entre versões de conceito é declaração explícita da plataforma
  e nunca deriva de nome, alias, texto ou IA.

### Migração de conteúdo existente

O preflight separa conteúdo comprovavelmente versionável de conteúdo ambíguo.
Somente templates cujo conteúdo e ownership possam ser demonstrados podem receber
uma versão inicial por transformação determinística. Qualquer template global com
referência local, Goal sem caminho válido, ordenação inconsistente ou estado de
publicação não comprovável aborta a migration. Não há inferência editorial.

### Validação e aceite

- alteração de draft não muda versão publicada;
- versão publicada rejeita update/delete por caminhos comuns e técnicos;
- aplicação referencia uma única versão exata;
- nova versão não altera aplicações anteriores;
- versão global indisponível não revela draft ao tenant;
- versão company-owned não atravessa empresa.

## 3. Template Application

### Identidade e ciclo de vida

Cada confirmação humana cria uma identidade lógica própria, antes do resultado
funcional, correlacionada por tenant e chave idempotente. O ciclo mínimo distingue
processamento, sucesso e falha terminal. Tentativas adicionais não criam outra
aplicação quando reutilizam a mesma identidade idempotente.

A aplicação preserva:

- tenant e ator humano autenticado;
- executor técnico separado, quando houver;
- versão exata do template;
- chave idempotente e fingerprint canônico da intenção;
- correlation ID;
- resultado terminal e código de falha;
- referência ao Plan e snapshot apenas no sucesso;
- timestamps e tentativas append-only.

### Persistência e aceite

- identidade da aplicação é imutável e distinta do Plan;
- a mesma chave e fingerprint recuperam o mesmo resultado terminal;
- chave igual com fingerprint diferente retorna conflito estável;
- nova confirmação intencional usa nova chave;
- falha nunca referencia Plan parcial;
- correlation ID não substitui chave idempotente nem identidade da aplicação.

## 4. Resolver determinístico

### Contratos

O Resolver recebe um contrato completo, imutável e ordenado contendo:

- tenant, ator autorizado e instante efetivo;
- versão consumível do template, Goals e Actions;
- tipo global ou company-owned;
- competências tenant-owned e níveis atuais necessários;
- mappings confirmados, estados e compatibilidades explícitas necessárias;
- destinatário, responsável, prioridade e datas;
- identidade da aplicação, chave idempotente, fingerprint e correlação.

Ele retorna exclusivamente:

- comando resolvido completo, pronto para Trusted Persistence; ou
- impedimentos determinísticos, estáveis e ordenados.

### Regra única

Readiness e Apply chamam o mesmo Resolver. Readiness pode usar a saída sem
persistir; Apply entrega o comando resolvido à Trusted Persistence, que revalida
estados mutáveis dentro da transação. Não haverá segunda implementação da regra em
Action, repository, SQL, UI ou presenter.

### Caminhos

- company-owned resolve diretamente a competência ativa do mesmo tenant e não
  consulta Tenant Mapping;
- global resolve exclusivamente versão publicada por mapping humano confirmado,
  ativo, inequívoco e válido para a versão exigida ou compatibilidade explícita;
- ausência, ambiguidade, incompatibilidade, cross-tenant ou indisponibilidade
  retorna impedimento e falha fechada;
- nome, alias, similaridade e IA jamais participam da resolução oficial.

### Testes

- mesma entrada produz saída estruturalmente igual;
- ordenação de impedimentos, Goals e Actions é estável;
- relógio e IDs variáveis são entradas explícitas;
- company-owned e global cobrem sucesso e cada impedimento;
- Readiness e Apply demonstram paridade usando o mesmo Resolver;
- testes provam ausência de I/O, ambiente, relógio global e IA.

## 5. Trusted Persistence

### Fronteira transacional

Trusted Persistence recebe somente comando autorizado e resolvido. Dentro da
transação de sucesso, ela revalida tenant, autorização persistente, versão
consumível, mapping, competência, níveis e fingerprint; arbitra idempotência sob
concorrência; e grava como uma unidade:

- resultado terminal da Template Application;
- Development Plan;
- todos os Goals e Actions;
- Application Snapshot;
- lineage;
- auditoria de sucesso.

Se qualquer escrita ou revalidação falhar, nenhum elemento do resultado funcional
é confirmado.

### Idempotência e concorrência

- a unicidade durável é tenant mais chave idempotente da aplicação;
- o fingerprint canônico detecta reutilização conflitante;
- concorrentes disputam a garantia persistente, nunca apenas lock em memória;
- o vencedor produz o resultado; retries compatíveis observam o mesmo terminal;
- conflito não cria aplicação ou Plan adicional;
- a chave é criada na confirmação humana, preservada pelo cliente durante retry e
  nunca derivada somente do payload;
- retenção da chave acompanha a retenção da aplicação e do histórico.

### Falha auditável sem sucesso parcial

A identidade e a tentativa podem ser registradas antes da transação funcional em
uma fronteira curta e idempotente. O resultado completo continua em transação
separada e atômica. Se ela reverter, uma operação posterior, correlacionada à
mesma aplicação, registra a tentativa falha e seu código sem snapshot ou Plan.
Falhas anteriores à resolução confiável de tenant e ator permanecem na auditoria
de segurança apropriada e não criam aplicação tenant-owned artificial.

### Aceite

- injeção de falha em cada etapa deixa zero Plan parcial;
- sucesso contém Plan, Goals, Actions, snapshot, lineage e auditoria;
- duas chamadas concorrentes produzem no máximo um Plan;
- retry compatível retorna o mesmo resultado;
- `service_role` continua sujeito a constraints e não representa o ator.

## 6. Application Snapshot

### Contrato lógico

O snapshot preserva integralmente o contrato mínimo da ADR-0014 e do Discovery:

- versão do formato;
- identidade, owner, escopo e versão do template;
- representação humana relevante do template;
- Goals e Actions originais, conteúdo e ordenação;
- referências, níveis e prazos da versão;
- conceito e versão global, quando aplicável;
- mapping e decisão confirmada usados;
- competência operacional e representação apresentada;
- valores sugeridos, resolvidos e aplicados;
- destinatário, responsável, prioridade e datas;
- ator, executor, instante, correlação, idempotência e resultado.

### Persistência e evolução

O Implementation Agent deve escolher a representação física mínima entre as
formas já suportadas pelo banco somente após inspecionar volume, padrões de
consulta e precedentes do repositório. A escolha não pode alterar o contrato
lógico acima: o snapshot precisa ser autossuficiente, versionado, gravado no
sucesso atômico e legível sem reidratação a partir de entidades mutáveis.

Evolução adiciona nova versão de formato e reader compatível; nunca reescreve
snapshots existentes. A primeira PR oferece apenas leitura tenant-owned necessária
ao fluxo e à auditoria; exportação e leitura global permanecem fora do escopo.

### Aceite

- update/delete por fluxos comuns e técnicos não autorizados são rejeitados;
- mudanças posteriores em template, conceito, mapping ou competência não alteram
  o snapshot nem sua interpretação;
- o snapshot continua legível por sua versão de formato;
- não existe backfill inferido para aplicações históricas.

## 7. Lineage

Lineage liga de forma append-only a Template Application, a versão exata, o
snapshot e o Development Plan produzido. A referência histórica principal é a
aplicação mais snapshot; a referência legada `development_plans.template_id`
permanece apenas auxiliar durante compatibilidade e não pode ser usada para
reconstruir a verdade histórica.

Depois do sucesso, Plan, Goals e Actions operam independentemente do template.
Edição de draft, nova versão, obsolescência, mudança de mapping ou arquivamento de
competência nunca reescrevem o resultado. Correção exige nova operação explícita.

Aceite: a auditoria reconstrói origem e resolução sem consultar estado mutável, e
nenhuma exclusão comum rompe o vínculo histórico.

## 8. Auditoria e observabilidade

### Sucesso e falha

- sucesso registra aplicação, tentativa, tenant, ator, executor, versão,
  correlação, chave idempotente, resultado, Plan e snapshot;
- falha após contexto confiável registra código estável e metadados mínimos, sem
  resultado funcional parcial;
- tentativas são append-only e ligadas à mesma aplicação;
- ator humano vem de `auth.users.id`; executor técnico é identidade separada;
- correlation ID atravessa Action, Application Layer, Resolver e persistência,
  sem substituir identidades duráveis;
- tokens, secrets, payloads excessivos, drafts e dados de outro tenant não são
  registrados.

### Observabilidade de rollout

Monitorar por código e sem conteúdo sensível:

- aplicações iniciadas, concluídas e falhas;
- conflitos idempotentes e retries reaproveitados;
- falhas de mapping, versão e integridade;
- latência e rollback da transação funcional;
- diferença entre readiness aprovado e revalidação recusada no commit.

Aceite: toda tentativa normativamente auditável pode ser correlacionada, e
falhas de autorização não revelam existência de conteúdo invisível.

## 9. Evolução do contrato público

### Estratégia retrocompatível

1. introduzir um contrato versionado ou aditivo para chave idempotente,
   correlation ID e resultado estruturado;
2. manter o contrato público vigente durante a transição;
3. fazer ambos convergirem para o mesmo Application Service e Resolver;
4. migrar todos os consumidores internos identificados no preflight;
5. comprovar regressão e observabilidade antes de deprecar;
6. remover contrato antigo somente em entrega futura explicitamente autorizada.

A assinatura final não é definida neste plano. Antes de codificar a superfície
pública, a implementação deve inventariar chamadas TS, RPC, testes e consumidores
externos conhecidos. Qualquer incompatibilidade não coberta por adapter aditivo é
novo gate de aprovação, não licença para quebra.

O adapter legado não duplica resolução. Ele traduz a entrada vigente para o novo
Application Service e preserva a resposta antiga. Garantias completas de retry
dependem do novo contrato transportar a identidade criada na confirmação; isso
deve ficar explícito na migração de cada consumidor.

### Aceite

- consumidores atuais continuam funcionando durante a transição;
- contrato novo e adapter legado usam a mesma regra e persistência;
- erros são estáveis, traduzíveis e não expõem detalhes internos;
- nenhuma remoção ou alteração incompatível ocorre nesta PR.

## 10. Composition Root e Application Layer

### Estrutura

- **Application Service:** autoriza, carrega ports, constrói a entrada do
  Resolver e chama Trusted Persistence;
- **Readiness Service/Query:** usa os mesmos ports e Resolver sem persistir;
- **Ports:** template versionado, mappings, competências, níveis, relógio,
  identidade/correlação e gateway de persistência;
- **Repositories:** implementam leituras e mapeamentos, sem decidir autorização ou
  resolução;
- **Trusted Persistence Adapter:** único adapter autorizado a produzir o
  resultado funcional completo;
- **Server Factory:** constrói serviços com adapters concretos;
- **Composition Root:** fronteira `server-only` única para wiring.

### Arquivos prováveis

- existentes a evoluir:
  `apps/web/src/features/development/application/apply-development-template.ts`,
  `apps/web/src/features/development/application/index.ts` e entrypoints de
  Development;
- novos contratos, services, resolver e testes sob
  `apps/web/src/features/development/application/`;
- adapters de leitura próximos aos repositories existentes de templates e
  global competencies;
- composição em `apps/web/src/features/development/server.ts` e diretório
  `apps/web/src/features/development/server/`, espelhando o precedente de
  Organization Planning;
- nenhum arquivo client-side importa `server-only` direta ou indiretamente.

### Aceite

- dependências concretas aparecem somente no Composition Root;
- Domain e Resolver não importam Supabase, React, Next.js ou ambiente;
- repositories não decidem papéis, mapping ou ownership;
- factory pura é testável sem runtime server;
- não existem imports circulares ou server-only em Client Components.

## 11. Server Actions e experiência mínima

As Actions devem:

- validar apenas a forma da entrada;
- resolver sessão, ator e Current Company Context confiáveis;
- ignorar tenant, ator, executor ou capability enviados pelo cliente;
- obter a aplicação pelo Composition Root;
- traduzir impedimentos e falhas conhecidos para mensagens humanas;
- preservar chave idempotente durante retry;
- revalidar apenas rotas afetadas após sucesso;
- nunca resolver mappings, criar snapshots ou acessar repositories diretamente.

Arquivos prováveis:

- `apps/web/src/features/development/actions/apply-development-template-action.ts`;
- Action/Query de readiness no mesmo padrão local;
- `apps/web/src/features/development/templates/components/apply-development-template-dialog.tsx`;
- página de detalhe do template apenas quando necessária para apresentar versão,
  readiness e impedimentos.

Aceite: UI apresenta origem/versão e bloqueios, não habilita confirmação sem
readiness, mantém retry estável e não ganha regra de domínio.

## 12. Banco, constraints e RLS

### Ordem das migrations

Uma única migration da PR 3C é preferida se o volume e os locks permitirem
rollback transacional seguro. Se a inspeção demonstrar necessidade operacional de
mais de uma, a divisão permanece dentro da mesma PR e segue:

1. preflight read-only;
2. estruturas aditivas de versões, aplicação, tentativas, snapshot e lineage;
3. candidate keys e índices necessários;
4. FKs e checks como `NOT VALID` quando PostgreSQL permitir;
5. validação das constraints;
6. proteção de imutabilidade e append-only;
7. policies RLS e grants mínimos;
8. fronteira persistente versionada;
9. cutover somente após catálogo e testes aprovados.

O número e nome finais da migration são definidos apenas no início autorizado da
implementação, após conferir a `main`. Nenhum SQL é especificado neste plano.

### Integridade

- Template Application, snapshot, tentativas e lineage usam candidate keys
  tenant-owned e FKs compostas conforme ADR-0012;
- versão global usa referência global; versão company-owned preserva tenant;
- exatamente uma versão pertence a cada aplicação;
- sucesso referencia exatamente um Plan e um snapshot;
- falha não referencia resultado funcional;
- chave idempotente é única no tenant;
- snapshot e lineage são imutáveis; tentativas e auditoria são append-only;
- referências legadas só são removidas após substitutas validadas e compatibilidade
  comprovada.

### RLS e grants

- `owner`, `admin` e `hr` aplicam templates no próprio tenant;
- `manager`, `employee`, usuário sem membership e tenant estrangeiro não aplicam;
- leitura de aplicações e snapshots segue somente autorização tenant-owned já
  aprovada para Development;
- não existe leitura administrativa global;
- `authenticated` não grava diretamente resultado, snapshot ou auditoria;
- Trusted Persistence opera server-only e revalida ator e tenant;
- `service_role` não contorna FK, check, unique ou imutabilidade;
- grants expõem somente as operações mínimas necessárias.

### Aceite

- catálogo confirma constraints, índices, policies, grants e funções esperados;
- operações cross-tenant falham inclusive por executor técnico;
- RLS complementa Application Layer e integridade, sem substituí-las;
- toda função privilegiada fixa `search_path` e não aceita ator do cliente.

## 13. Estratégia de testes

### Unitários

- Resolver puro: determinismo, ordenação, caminhos global/company-owned e todos
  os impedimentos;
- fingerprint canônico e conflitos de idempotência;
- Application Service: autorização, orchestration e tradução de resultados;
- Readiness e Apply usando a mesma instância/regra;
- presenter e adapters de compatibilidade;
- Server Factory e fronteira de imports.

### Integração da aplicação

- repositories mapeiam versões, mappings, competências e níveis corretamente;
- Action deriva ator/tenant do contexto e ignora valores do cliente;
- UI preserva chave durante retry e apresenta erros estáveis;
- contrato legado e contrato aditivo convergem para o mesmo resultado;
- alteração de origem após aplicação não modifica leitura do snapshot.

### pgTAP

- preflight completo e falha fechada para legado ambíguo;
- versão draft/publicada/obsoleta e imutabilidade;
- caminho company-owned same-tenant e rejeição cross-tenant;
- caminho global publicado, mapping válido, ausente, inativo, ambíguo,
  incompatível e cross-tenant;
- compatibilidade explícita entre versões, sem inferência;
- atomicidade com falha injetada em Plan, Goal, Action, snapshot, lineage e
  auditoria;
- idempotência com chave/fingerprint iguais e conflito de fingerprint;
- concorrência real com duas sessões produzindo no máximo um Plan;
- snapshot e lineage imutáveis e independentes de mudanças posteriores;
- tentativas e auditoria append-only;
- ator humano separado do executor;
- RLS por papel, usuário sem membership, cross-tenant e service role;
- regressão das migrations 0066 e 0067 e do fluxo company-owned.

### Gates completos da futura implementação

Quando a PR 3C for autorizada, executar migration desde banco limpo, pgTAP
isolado e completo, `supabase db lint --local`, TypeScript, build, lint,
`git diff --check`, inspeção do catálogo PostgreSQL e smoke test do fluxo
company-owned e global. Toda falha será classificada como INTRODUZIDA,
PREEXISTENTE ou NÃO CONFIRMADA antes de correção.

## 14. Preflight, rollout e observabilidade

### Preflight read-only

Abortar sem correção automática quando houver:

- template sem ownership ou scope comprovável;
- conteúdo consumível sem estado/versionamento comprovável;
- template global com competência tenant-owned;
- template company-owned ou competência cross-tenant;
- Goal com ambos ou nenhum caminho de competência;
- Goal ou Action órfão, ordem ambígua ou conteúdo incompatível;
- conceito, versão, mapping ou competência inexistente/indisponível;
- mapping duplicado, não confirmado, inativo, incompatível ou cross-tenant;
- declaração de compatibilidade ambígua;
- duplicidade que impeça candidate key ou chave idempotente;
- consumidor do contrato legado não inventariado;
- qualquer histórico que exigiria snapshot ou lineage inferido.

### Sequência de rollout

1. confirmar worktree, `main`, migrations e consumidores atuais;
2. executar preflight e registrar somente contagens não sensíveis;
3. expandir schema sem cutover;
4. validar constraints, RLS, grants, imutabilidade e catálogo;
5. introduzir contratos, Resolver e Application Services atrás do entrypoint
   server-only ainda não ativo;
6. implementar Trusted Persistence e testes de atomicidade/concorrência;
7. adicionar contrato aditivo e migrar consumidores internos;
8. executar paridade do fluxo company-owned e habilitar global somente com
   mappings válidos;
9. fazer cutover da Action para o novo Composition Root;
10. executar gates completos e smoke tests;
11. observar códigos de erro, retries, conflitos e divergências de readiness;
12. reconciliar documentação somente após validação e aprovação.

Não se presume feature flag. Ela só pode ser usada se existir padrão versionado e
necessidade comprovada no momento da implementação.

### Rollback operacional

- antes do cutover, interromper e manter o fluxo legado;
- durante cutover, retornar a Action ao adapter legado sem apagar estruturas
  aditivas;
- migration aplicada nunca é editada; correção usa migration compensatória;
- constraints antigas só são removidas depois de substitutas validadas;
- aplicações, tentativas, snapshots, lineage e auditorias já persistidos nunca
  são apagados ou reescritos;
- rollback desabilita novas escritas pelo caminho novo, preservando leitura
  histórica;
- corrupção ou legado ambíguo bloqueia rollout e exige entrega separada aprovada.

## 15. Fases internas da implementação

A PR continua sendo uma única entrega, mas deve ser construída e revisada nesta
ordem:

1. **Preflight e expansão do banco:** estruturas aditivas, versões, constraints,
   RLS e catálogo, sem cutover;
2. **Contratos e Resolver:** domínio puro, fingerprint e paridade
   Readiness/Apply;
3. **Application Layer e composição:** ports, repositories, services, Server
   Factory e Composition Root;
4. **Trusted Persistence:** identidade, tentativas, atomicidade, idempotência,
   concorrência, snapshot, lineage e auditoria;
5. **Contrato retrocompatível:** superfície aditiva, adapter legado e migração de
   consumidores;
6. **Actions e experiência mínima:** readiness, confirmação, retry e mensagens;
7. **Testes e cutover:** unidade, integração, pgTAP, regressão, catálogo, smoke e
   observabilidade;
8. **Reconciliação final:** estados documentais somente após aprovação técnica.

Cada fase deve manter o repositório revisável. Nenhuma fase isolada autoriza
ativação parcial em produção.

## 16. Dependências

### Concluídas

- PD-018 Approved;
- ADR-0003, ADR-0012, ADR-0013 e ADR-0014 Accepted;
- Discovery da PR 3C Approved;
- PR 3A e migration 0066 concluídas;
- PR 3B e migration 0067 concluídas e validadas;
- modelo híbrido de Template Goals e Tenant Mappings disponível.

### Gates antes da implementação

- autorização explícita para iniciar a PR 3C;
- worktree isolado e estado da `main` confirmado;
- ausência de nova divergência entre documentação e código;
- inventário final de consumidores do contrato público;
- preflight read-only aprovado antes de qualquer transformação de dados.

## 17. Riscos e mitigação

| Risco | Mitigação obrigatória |
| --- | --- |
| versão inicial inventar estado histórico | preflight fail-closed; apenas conteúdo comprovável é transformado |
| mapping mudar entre readiness e commit | revalidação dentro da Trusted Persistence |
| retry duplicar Plan | unique tenant-scoped e fingerprint persistente |
| concorrência ultrapassar lock em memória | arbitragem no banco e teste com sessões concorrentes |
| auditoria de falha desaparecer no rollback | tentativa durável separada do resultado funcional atômico |
| snapshot depender de estado atual | contrato autossuficiente, formato versionado e reader histórico |
| adapter legado duplicar regra | ambos os contratos chamam o mesmo Application Service |
| contrato novo quebrar consumidor | evolução aditiva, inventário e regressão antes de depreciação |
| `service_role` simular autoria | ator autenticado obrigatório e executor registrado separadamente |
| UI ou Action resolver mapping | Resolver único e testes de fronteira |
| conteúdo global draft vazar | repositories tenant-facing e RLS retornam somente publicado |
| volume/lock da migration | inspeção prévia, expansão aditiva e divisão interna se comprovada |

## 18. Critérios finais de aceite da PR 3C

- toda aplicação possui identidade tenant-owned própria e imutável;
- toda aplicação consome exatamente uma versão publicada e imutável;
- Readiness e Apply reutilizam o mesmo Resolver puro;
- company-owned nunca consulta mapping e nunca atravessa tenant;
- global usa exclusivamente mapping humano válido e compatibilidade explícita;
- IA, nome, alias e similaridade não participam da resolução oficial;
- ausência ou ambiguidade falha fechada e não cria Plan parcial;
- sucesso persiste Plan, Goals, Actions, snapshot, lineage e auditoria em uma
  unidade atômica;
- retries compatíveis retornam o mesmo resultado e concorrência produz no máximo
  um Plan;
- conflito de fingerprint não cria nova aplicação funcional;
- snapshot e lineage são imutáveis, versionados e independentes do estado atual;
- ator humano e executor técnico permanecem distintos;
- Trusted Persistence é a única fronteira do resultado funcional completo;
- RLS, Application Layer e integridade referencial atuam em defesa em
  profundidade;
- Composition Root é server-only e nenhum Client Component importa infraestrutura;
- contrato vigente permanece compatível durante a transição;
- Plans históricos sem evidência não recebem snapshot inventado;
- preflight, testes, gates técnicos, catálogo e smoke tests são aprovados;
- nenhuma alteração fora da PR 3C é incorporada;
- documentação final reflete somente o estado efetivamente validado.

## 19. Regra de parada

Interromper antes de implementar quando:

- a PR 3C não estiver explicitamente autorizada;
- código e documentação divergirem;
- o preflight encontrar legado ambíguo ou corrupção;
- a forma retrocompatível do contrato exigir quebra não aprovada;
- a representação física mínima do snapshot não puder cumprir o contrato lógico
  e a leitura histórica sem nova decisão arquitetural;
- surgir regra funcional não definida pela PD-018;
- qualquer invariante da ADR-0014 não puder ser comprovada.

Nenhuma dessas condições autoriza correção automática, expansão de escopo ou
início de outra PR.
