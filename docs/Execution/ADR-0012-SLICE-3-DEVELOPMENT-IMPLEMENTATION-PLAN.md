# ADR-0012 Slice 3 — Development Implementation Plan

## Autoridade e vínculo

Este plano executa a ADR-0012 no domínio Development e detalha a infraestrutura
necessária para refletir a PD-018. A PD-018 governa a semântica funcional; a
ADR-0012 governa integridade tenant-owned. Em caso de divergência, a implementação
para e a documentação é reconciliada antes de qualquer migration ou código.

## Estratégia de entrega

| PR | Entrega | Status | Dependência |
| --- | --- | --- | --- |
| 3A | Operational Development Integrity | Concluída no commit `fe3d8914ce4da54e85f94794b367582971403ffa` | ADR-0012 |
| 3B | Global Concepts and Tenant Mappings | Próxima entrega | PR 3A e PD-018 aprovadas |
| 3C | Deterministic Template Application and Snapshots | Planejada | PR 3B concluída |

As três PRs são sequenciais. A conclusão de uma não autoriza automaticamente a
seguinte.

## PR 3B — objetivo

Introduzir a infraestrutura administrativa definida pela PD-018 para conceitos
globais, suas versões e aliases, mappings tenant-owned e respectivas auditorias.
Evoluir Development Template Goals para representar, de forma exclusiva, o
caminho global por conceito versionado ou o caminho company-owned por competência
operacional, sem alterar ainda a aplicação de templates.

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
