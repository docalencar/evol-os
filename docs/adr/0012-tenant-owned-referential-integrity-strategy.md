# ADR 0012 — Tenant-Owned Referential Integrity Strategy

## Status

Accepted

## Contexto

O Evol OS usa `company_id` como fronteira de tenant. RLS limita quais linhas um
ator pode acessar, mas várias relações históricas possuem FK somente pelo `id` da
entidade relacionada. Assim, uma linha autorizada da empresa A pode referenciar
uma entidade da empresa B quando seu UUID é conhecido, inclusive por funções
técnicas que não dependem de RLS.

Planning, Approval, KPI e Notifications já protegem relações críticas por chaves
compostas, mas usam variações locais de ordem, identidade e derivação. A ausência
de um padrão transversal impede aplicar o hardening restante de forma previsível.

Esta ADR define a arquitetura relacional permanente. Ela não altera optionalidade,
cascades, estados, papéis ou comportamento funcional de nenhum domínio.

## Decisão

Toda relação persistida entre duas entidades tenant-owned deve tornar impossível
representar tenants diferentes no banco. A garantia principal é declarativa e usa
FK composta. RLS, Application Layer e Services complementam essa proteção, mas
não a substituem.

O identificador canônico do tenant é `companies.id`, persistido como
`company_id`. `companies` é a fronteira do tenant; não é uma entidade pertencente
a si própria.

## Classificação oficial das entidades

### Global Entity

Entidade compartilhada por todos os tenants e administrada pela plataforma. Não
possui `company_id`.

Critérios:

- sua identidade e conteúdo não pertencem a uma empresa;
- qualquer visibilidade tenant é uma regra de acesso, não ownership;
- nunca referencia silenciosamente uma entidade tenant-owned.

Exemplos: catálogos verdadeiramente globais e registros globais de templates. Uma
linha global em tabela híbrida precisa de discriminador e constraints explícitas;
`company_id is null`, isoladamente, não prova ownership global.

### Tenant-Owned Root

Entidade diretamente pertencente a uma empresa e identificável fora de um único
agregado pai. Possui `company_id not null`, FK para `companies(id)` e chave
candidata `unique (id, company_id)`.

Exemplos: `people`, `departments`, `teams`, `positions`, `competencies`,
`assessment_cycles`, `development_plans`, `feedback_threads`,
`recruitment_job_openings`, `approval_requests`, workspaces de Planning e
Notification Events.

### Tenant-Owned Child

Entidade pertencente a um agregado tenant-owned, mas que precisa de escopo próprio
porque é acessada diretamente, participa de outras relações, possui RLS própria ou
cruza fronteiras de domínio. Possui `company_id not null` e referencia o pai por
FK composta.

Exemplos: `assessment_responses`, `assessment_answers`, `development_goals`,
`feedback_messages`, `approval_stages`, `notification_deliveries` e Change Sets
de Planning.

### Derived Entity

Entidade cujo tenant é derivado de exatamente um pai obrigatório, imutável e
tenant-aware. Não possui `company_id` quando todos estes critérios forem verdade:

- não é consultada ou autorizada independentemente do pai;
- não possui outra referência tenant-owned independente;
- não pode mudar de pai;
- exclusão e ciclo de vida pertencem ao pai;
- RLS, quando necessária, deriva acesso pelo mesmo caminho único.

Exemplos atuais candidatos: mensagens de Copilot derivadas de uma conversation e
actions de template derivadas de um template goal. A classificação precisa ser
confirmada pelo schema real antes de cada migration; nome ou localização física
não bastam.

Se um Derived Entity ganhar segunda raiz, referência cross-domain ou autorização
independente, ele deve ser promovido a Tenant-Owned Child e persistir
`company_id`.

### Polymorphic Entity

Entidade que referencia tipos diferentes por discriminador e identificador, como
`entity_type/entity_id` ou `principal_type/principal_id`. Quando o próprio registro
pertence a tenant, mantém `company_id` obrigatório.

FK tipada continua sendo a preferência. Polimorfismo persistente só é aceito com:

- discriminador fechado por `CHECK` ou catálogo confiável;
- resolver server-side registrado;
- validação de existência e tenant no banco por constraint trigger quando uma FK
  declarativa não puder expressar a relação;
- preflight e testes por tipo suportado.

Tipos desconhecidos são rejeitados. Metadata ou texto livre nunca substituem uma
relação autorizada.

Exemplos: principals de Approval e referências funcionais de Activity. A
integridade interna dos agregados continua usando FKs normais.

### System Entity

Entidade pertencente à operação da plataforma, não a um tenant empresarial.
Normalmente não possui `company_id`; quando registra uma operação tenant-scoped,
o escopo é explícito e segue as regras de Tenant-Owned Root ou Child.

Exemplos: `auth.users` e infraestrutura técnica global. `company_members` é uma
associação tenant-owned entre a fronteira Company e a identidade global do
usuário, com `unique (company_id, user_id)`.

## Ownership e `company_id`

- Tenant-Owned Root e Tenant-Owned Child possuem `company_id not null`.
- Derived Entity herda ownership apenas pelo caminho único e obrigatório.
- Global Entity e System Entity global nunca recebem `company_id` decorativo.
- Tabelas híbridas global/company-owned precisam de `scope` explícito e `CHECK`
  coerente com a nulabilidade de `company_id`.
- `company_id` redundante é obrigatório quando materializa a integridade física
  de um Child acessível independentemente; não é duplicação acidental.
- Um valor recebido do cliente nunca define ownership. A Application Layer deriva
  o tenant do ator/contexto confiável; o banco verifica a relação física.

## Chave candidata canônica

A ordem oficial é:

```sql
unique (id, company_id)
```

Toda FK tenant-owned usa a mesma ordem:

```sql
foreign key (related_id, company_id)
  references target_table(id, company_id)
```

Justificativa:

- `id` continua sendo a identidade primária e o primeiro elemento do lookup
  relacional;
- preserva o padrão majoritário de Planning, Approval e execuções KPI;
- permite migrar FKs simples acrescentando o tenant sem inverter a identidade;
- separa identidade relacional de performance de consultas tenant-scoped.

Consultas por tenant devem possuir índices próprios iniciados por `company_id`.
A unique `(id, company_id)` não substitui índices como
`(company_id, status, created_at)`.

Constraints compostas existentes em ordem diferente continuam válidas. Elas não
são reescritas apenas por uniformidade; ao serem substituídas por mudança
funcional ou hardening aprovado, adotam a ordem canônica.

## Estratégia de Foreign Keys

### FK composta

Obrigatória quando origem e destino são Tenant-Owned Root ou Child. Inclui:

- relações parent-owned;
- autorreferências;
- relações entre domínios;
- referências nullable.

Em FK nullable, `related_id` pode ser nulo, mas `company_id` da linha permanece
obrigatório. A migration preserva o `ON DELETE` existente; esta ADR não decide
entre `CASCADE`, `RESTRICT` ou `SET NULL` para o domínio.

### FK simples

Permitida apenas para:

- `company_id references companies(id)`;
- referência de Tenant-Owned para Global Entity;
- referência a System Entity global, como `auth.users(id)`;
- caminho Derived Entity → pai quando o filho não possui `company_id` por atender
  integralmente aos critérios de derivação.

### Empresa derivada

Só é permitida para Derived Entity. A derivação deve ter um caminho único, sem
ambiguidade e protegido por FK. Joins convenientes ou filtros de repository não
constituem derivação de ownership.

### Trigger de validação

É exceção para relações polimórficas ou invariantes relacionais que PostgreSQL não
consiga expressar declarativamente. Deve ser uma constraint trigger quando
adiamento transacional for necessário, ter `search_path` fixo, rejeitar tipo não
registrado e possuir testes adversariais.

Trigger não é usado quando FK composta, `CHECK` ou `UNIQUE` resolvem o problema.

### Application Layer exclusiva

Nunca é suficiente para integridade de uma relação persistida. Validação somente
na Application Layer é aceitável para dados efêmeros, referências externas não
persistidas ou mensagens antecipadas ao usuário. Toda relação persistida recebe
garantia no banco.

## Tipos de relacionamento

- **Parent-owned:** Child referencia o pai com `(parent_id, company_id)`.
- **Self-owned:** autorreferência usa `(related_id, company_id)` na própria tabela.
- **Derived ownership:** filho sem `company_id` herda do único pai obrigatório.
- **Cross-domain ownership:** usa FK composta como qualquer outra relação; fronteira
  de feature não relaxa tenant.
- **Global reference:** FK simples para uma linha comprovadamente global.
- **Hybrid global/company reference:** exige scope explícito; a referência aceita
  somente linha global ou linha da mesma empresa. Quando uma FK não expressar a
  alternativa, usa-se modelagem separada ou constraint trigger testada.
- **Nullable reference:** nulabilidade é preservada, mas valor não nulo deve
  respeitar tenant.
- **Polymorphic reference:** prefere associações tipadas; legado segue registry e
  constraint trigger.

## Estratégia de constraints e rollout

### Preflight obrigatório

Antes de alterar constraints, a migration verifica sem corrigir silenciosamente:

- relações cujo `company_id` difere do destino;
- referências órfãs;
- valores incompatíveis com scope global/company;
- duplicidades que impeçam nova unique;
- nulos incompatíveis com constraints já aprovadas.

Qualquer ocorrência aborta com código de erro estável e acionável. Reparação de
dados é uma entrega separada e aprovada.

### Ordem de rollout

1. executar preflight;
2. criar a chave candidata `unique (id, company_id)` no destino;
3. criar índices necessários na origem e para consultas tenant-scoped;
4. adicionar a FK composta como `not valid` quando o PostgreSQL permitir e a
   estratégia reduzir risco operacional;
5. executar `validate constraint`;
6. remover a FK simples substituída somente após validação;
7. repetir em slices pequenos por agregado/domínio.

`NOT VALID` não dispensa preflight nem validação final. `UNIQUE` e índices seguem
as limitações transacionais do PostgreSQL; a estratégia operacional deve respeitar
o volume real e a janela aprovada pelo Human Reviewer.

### Checks e índices

- `CHECK` representa coerência local de colunas, não existência de outra linha.
- toda FK recebe índice de suporte na origem quando não houver índice equivalente;
- a chave candidata recebe unique explícita no destino;
- índices duplicados ou sem consumidor comprovado não são criados.

### Rollback

Migration aplicada não é editada. Falha após integração usa migration
compensatória aprovada. Constraints antigas só são removidas depois de a nova
garantia estar validada, permitindo interrupção segura durante o rollout.

## Responsabilidades por camada

### Banco

- garantir existência, tenant, nulabilidade e constraints relacionais;
- impedir cross-tenant inclusive sob `service_role` e funções técnicas;
- preservar cascades aprovadas;
- rejeitar polimorfismo inválido na fronteira persistente.

### RLS

- autorizar quem pode ler ou modificar cada linha;
- limitar operações à empresa e ao papel/participação do ator;
- não substituir FK, unique ou check.

RLS responde “quem pode operar esta linha?”. Integridade referencial responde “este
estado pode existir?”. As duas proteções são independentes e obrigatórias.

### Application Layer

- derivar `company_id` do contexto server-side;
- não tratar tenant ou IDs enviados pelo cliente como autoridade;
- carregar referências no tenant correto antes do comando;
- traduzir falhas esperadas para contratos de aplicação sem ocultar corrupção.

### Services

- aplicar invariantes funcionais que não são mera integridade de identidade;
- decidir estados, optionalidade e relações de negócio já aprovadas;
- não duplicar a garantia física da FK como única defesa.

Repositories apenas persistem e consultam; não decidem ownership.

## Aplicação aos domínios atuais

| Domínio | Classificação e aplicação |
| --- | --- |
| Organization/People | Roots tenant-owned; parent, manager, team, position e department usam FKs compostas |
| Competencies | catálogo company-owned; relações com Position e People usam FKs compostas |
| Assessments | cycles/templates company-owned ou híbridos; responses/answers são Children e preservam tenant em toda a cadeia |
| Notifications | Event é Root operacional; Delivery/Attempt/Notification/Audit são Children; constraints existentes permanecem precedentes válidos |
| Approval | Request é Root; Stage/Assignment/Decision/Event são Children; principals polimórficos seguem discriminator e validação tipada |
| Development | Plan/Template company-owned ou híbrido; Goal/Action são Child ou Derived conforme suas referências independentes |
| Planning | Workspace é Root; Snapshot/Scenario/Change Set são Children com identidade composta já implementada |
| Feedback | Thread é Root; Message, Attachment, Mention e Acknowledgement são Children porque possuem relações e autorização próprias |
| Recruitment | Job Opening é Root e suas referências organizacionais são cross-domain tenant-owned |
| KPI | Definition/Execution são Roots operacionais; versions/evaluations/attempts são Children com identidades compostas |

Esta tabela classifica a arquitetura; cada migration ainda inventaria o schema
real e não presume que um nome histórico esteja correto.

## Consequências

### Positivas

- isolamento tenant passa a ser propriedade física do schema;
- Application Layer, RLS e funções técnicas não conseguem criar relações cruzadas;
- novos domínios usam uma única regra de classificação e chaves;
- rollout incremental pode preservar contratos e dados válidos.

### Custos e riscos

- targets existentes precisam de novas uniques e índices;
- validação pode bloquear ao encontrar dados legados inconsistentes;
- novas constraints podem exigir locks e planejamento por volume;
- tabelas híbridas e polimórficas exigem tratamento explícito;
- hardening completo precisa ser dividido em slices por domínio.

## Alternativas rejeitadas

- confiar apenas em RLS;
- confiar apenas em filtros de repositories ou Services;
- usar triggers para toda relação;
- duplicar `company_id` em todo filho sem classificar ownership;
- derivar tenant por múltiplos caminhos;
- corrigir dados automaticamente durante migration;
- reescrever constraints funcionais existentes apenas por estética.

## Referência operacional

O procedimento reutilizável está em
`docs/Architecture/patterns/tenant-owned-referential-integrity.md`.
