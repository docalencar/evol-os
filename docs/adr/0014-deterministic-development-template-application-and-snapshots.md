# ADR-0014 — Deterministic Development Template Application and Snapshots

## Status

Accepted

## Contexto

Development Templates aceleram a criação de planos ao preservar uma estrutura
reutilizável de Goals, competências, níveis-alvo, Actions, prazos relativos e
ordenação. A ADR-0003 define a estrutura do template. A PD-018 diferencia
competências operacionais tenant-owned de Global Competency Concepts e exige
resolução determinística por Tenant Mapping, Application Snapshot imutável,
atomicidade e auditoria.

A ADR-0012 determina que relações tenant-owned tenham integridade física. A
ADR-0013 separa ator humano, autoridade e executor técnico. As PRs 3A e 3B
prepararam o agregado operacional e os caminhos company-owned e global, mas não
definiram a arquitetura permanente da aplicação de um template.

A aplicação precisa produzir um Development Plan independente da evolução futura
do template, repetir com segurança após falhas de transporte, resistir a
concorrência e explicar historicamente qual origem e resolução produziram o
resultado.

## Problema

Copiar Goals e Actions diretamente de registros mutáveis não é suficiente para:

- provar qual versão foi aplicada;
- resolver conceitos globais sem identidade tenant-owned cross-tenant;
- impedir resultados parciais;
- distinguir retry de uma nova aplicação intencional;
- preservar falhas e sucessos auditáveis;
- separar autoria humana de execução técnica;
- manter lineage quando origem, mapping ou competência mudarem;
- evoluir o contrato público sem quebrar consumidores.

Sem uma decisão permanente, readiness, aplicação, UI e persistência podem
implementar regras paralelas e produzir resultados diferentes para a mesma
entrada.

## Decisão

O Evol OS adota uma arquitetura de **Deterministic Template Application** baseada
em cinco conceitos permanentes:

1. **Template Application** como identidade tenant-owned da operação;
2. **Development Template Version** imutável como origem consumível;
3. **Deterministic Template Resolution** como regra pura e única;
4. **Application Snapshot** imutável como evidência histórica;
5. **Trusted Persistence** como fronteira atômica e idempotente.

A composição ocorre exclusivamente no servidor por Composition Root e Server
Factory. A Application Layer autoriza e orquestra por ports; o Resolver não
acessa infraestrutura; repositories adaptam persistência; o banco garante
atomicidade, tenant, idempotência e imutabilidade; RLS autoriza operações sobre
linhas sem substituir integridade.

## Identidade da aplicação de template

Uma **Template Application** representa uma confirmação humana de aplicação de
uma versão específica de template em um tenant específico. Ela é a raiz
arquitetural da operação e possui identidade estável própria, distinta do
Development Plan, do template e da tentativa de transporte.

Essa identidade correlaciona:

- tenant;
- ator humano;
- executor técnico, quando houver;
- versão exata do template;
- intenção confirmada e seu fingerprint;
- chave idempotente;
- correlation ID;
- tentativas;
- resultado ou falha;
- Development Plan produzido;
- Application Snapshot;
- lineage e auditoria.

A aplicação possui ciclo lógico durável. Pode estar em processamento e terminar
com sucesso ou falha. Um sucesso referencia exatamente um resultado funcional.
Uma falha não referencia Plan parcial. O Implementation Plan definirá a
representação física e os estados necessários, sem alterar essa semântica.

O correlation ID serve à observabilidade e pode acompanhar múltiplas operações;
ele não substitui a identidade da aplicação nem a chave idempotente.

## Versionamento dos Development Templates

### Identidade

Um Development Template possui identidade estável, enquanto cada conteúdo
consumível possui uma identidade de versão imutável. Toda aplicação referencia
uma versão exata, nunca apenas a identidade mutável do template.

Goals, Actions, referências de competência, níveis, prazos relativos e ordenação
fazem parte do conteúdo versionado. Alteração que mude o resultado de uma futura
aplicação exige nova versão.

### Publicação e disponibilização

Templates globais só se tornam consumíveis por publicação realizada pela
autoridade global definida na ADR-0013. A versão publicada fixa também as versões
exatas dos Global Competency Concepts usadas por seus Goals.

Templates company-owned continuam sob autoridade do tenant. Sua forma de
disponibilização pode ser mais simples que a publicação global, mas uma aplicação
sempre consome uma versão estável que não muda durante ou depois da operação.
Draft mutável não é origem válida para aplicação.

### Imutabilidade e obsolescência

Uma versão consumível é imutável. Mudança cria outra versão. Obsolescência ou
descontinuação impede novas aplicações quando a política vigente assim exigir,
sem excluir a versão nem invalidar snapshots e planos históricos.

Nova versão nunca atualiza aplicação anterior. Restaurar uma versão obsoleta,
quando permitido futuramente, não altera seu conteúdo histórico.

## Deterministic Template Resolution

Existe uma única regra canônica de resolução, reutilizada por pré-validação e
aplicação. Ela recebe contratos completos e explicitamente versionados e produz
uma saída imutável:

- comando totalmente resolvido, pronto para Trusted Persistence; ou
- impedimentos determinísticos e ordenados.

O Resolver é puro: não acessa banco, UI, RPC, rede, autenticação, relógio global
ou IA. Ator, tenant, instante efetivo, versão, mappings, competências, níveis e
demais dados necessários entram explicitamente.

### Caminho company-owned

Cada Goal resolve diretamente para a competência operacional declarada na versão
do template. Template, competência e contexto de aplicação pertencem ao mesmo
tenant. Tenant Mapping não participa desse caminho.

### Caminho global

Cada Goal referencia uma versão publicada de Global Competency Concept. Para o
tenant da aplicação, a resolução usa exclusivamente Tenant Mapping confirmado,
ativo, inequívoco e válido para a versão exigida ou para compatibilidade
explicitamente declarada pela plataforma.

O resultado operacional referencia somente a competência do tenant que aplicou o
template. Identificadores tenant-owned nunca entram no conteúdo global nem
atravessam empresas.

### Fail closed

Resolução ausente, ambígua, desativada, incompatível, indisponível ou
cross-tenant falha antes da criação do resultado funcional. Também falham versões
não consumíveis, referências inconsistentes, competência indisponível,
autorização insuficiente e impossibilidade de preservar snapshot ou auditoria.

Nome, alias, similaridade textual e sugestão probabilística nunca comprovam
identidade. Não existe aplicação parcial nem escolha silenciosa de fallback.

## Application Snapshot

O **Application Snapshot** é a evidência histórica imutável da entrada resolvida
que produziu uma aplicação bem-sucedida. Ele pertence ao tenant e à Template
Application e permanece ligado ao Development Plan resultante.

O snapshot não é cache, projeção reconstruível nem cópia dispensável. Ele é a
fonte histórica da resolução usada naquele instante e não depende de consultas a
registros mutáveis para manter significado.

Seu contrato lógico mínimo preserva:

- versão do formato do próprio snapshot;
- identidade, owner, escopo e versão do template;
- representação humana relevante do template no instante da aplicação;
- conteúdo e ordenação originais de Goals e Actions;
- referências, níveis e prazos relativos da versão aplicada;
- no caminho global, conceito e versão global exigidos;
- mapping confirmado utilizado e sua decisão vigente naquele instante;
- competência operacional resolvida e sua representação apresentada;
- valores sugeridos, valores resolvidos e valores efetivamente aplicados;
- destinatário do plano, responsável, prioridade e datas efetivas;
- ator humano, executor técnico, instante e correlação;
- identidade idempotente disponível durante a resolução.

O snapshot lógico representa exclusivamente o estado determinístico conhecido
antes da persistência. Por isso, não contém a identidade do Development Plan,
IDs produzidos pela persistência nem qualquer dado que ainda não exista durante
a resolução. A Trusted Persistence grava esse snapshot sem alterar seu significado
ou acrescentar a ele responsabilidades posteriores.

O fingerprint pertence à resolução determinística, não ao conteúdo lógico do
snapshot. A Trusted Persistence o correlaciona com a Template Application, a
identidade idempotente, o lineage e a auditoria. O Development Plan e sua
identidade nascem somente na Trusted Persistence e são preservados como resultado
funcional do agregado persistido.

A evidência histórica completa é formada em conjunto por Template Application,
fingerprint, Application Snapshot, lineage e referência ao resultado funcional.
Esses elementos não precisam estar materializados no mesmo documento ou JSON
para constituírem uma única evidência histórica coerente.

O snapshot é criado somente com o sucesso atômico da aplicação. Depois disso não
pode ser alterado, substituído ou removido por fluxos comuns. A forma física do
contrato pertence ao Implementation Plan.

## Lineage

Lineage conecta permanentemente Template Application, versão do template,
Application Snapshot e Development Plan. Essa conexão explica origem sem manter
dependência operacional do template.

Depois da aplicação:

- o Plan, seus Goals e Actions funcionam independentemente do template;
- nova versão ou edição de draft não altera o resultado existente;
- alteração ou desativação do mapping não afeta aplicações anteriores;
- descontinuação de conceito ou template não reescreve histórico;
- alteração ou arquivamento de competência não altera o snapshot;
- referências auxiliares à origem não substituem o conteúdo histórico preservado;
- auditoria reconstrói a decisão pelo snapshot e pela aplicação, não por joins
  com o estado atual.

Lineage é append-only. Correção de erro histórico ocorre por nova operação
explícita, nunca por reescrita retroativa.

## Idempotência e concorrência

Cada confirmação humana de aplicação possui uma chave idempotente lógica dentro
do tenant. A chave representa a intenção confirmada, não o conteúdo do template,
o correlation ID ou o Plan resultante.

Regras permanentes:

- retries da mesma confirmação reutilizam a mesma chave;
- chave e fingerprint iguais retornam o mesmo resultado terminal;
- a mesma chave com intenção diferente produz conflito, sem nova aplicação;
- aplicação intencionalmente repetida usa nova chave;
- requisições concorrentes da mesma intenção produzem no máximo um resultado
  funcional;
- coordenação somente em memória não é garantia suficiente;
- idempotência é garantida na Trusted Persistence, não apenas na UI;
- tentativas adicionais permanecem correlacionadas à mesma aplicação.

O mecanismo físico, a geração, o transporte e a retenção da chave serão definidos
no Implementation Plan. Eles devem reutilizar precedentes duráveis existentes no
projeto.

## Tentativas, falhas e auditoria

Tentativa de transporte ou execução não é uma nova Template Application quando
carrega a mesma identidade idempotente. Tentativas são fatos append-only ligados
à aplicação.

Uma aplicação bem-sucedida registra atomicamente resultado, snapshot, lineage e
auditoria. Se qualquer parte necessária ao sucesso falhar, nenhum Plan parcial é
persistido.

Falhas ocorridas depois que tenant e ator confiáveis forem resolvidos devem ser
registráveis sem transformar a falha em sucesso parcial. O registro de falha
contém resultado técnico e funcional mínimo, sem snapshot de sucesso e sem dados
excessivos. Falhas anteriores à resolução confiável de identidade pertencem à
auditoria de segurança da fronteira correspondente e não criam artificialmente
uma aplicação tenant-owned.

Auditoria e observabilidade distinguem:

- empresa;
- ator humano autenticado;
- executor técnico, quando existir;
- aplicação e tentativa;
- operação;
- versão do template;
- resultado ou código de falha;
- chave idempotente e correlation ID;
- referências ao Plan e snapshot, quando houver;
- timestamp.

Tokens, secrets, credenciais técnicas, payloads excessivos, drafts invisíveis e
identidades de outro tenant não são registrados ou expostos.

## Atomicidade e Trusted Persistence

O sucesso da aplicação é uma única unidade atômica. Ela inclui Template
Application, Development Plan, Goals, Actions, Application Snapshot, lineage e
auditoria de sucesso.

Trusted Persistence recebe somente comando já autorizado e deterministicamente
resolvido, revalida invariantes persistentes e decide o resultado idempotente sob
concorrência. Ela não contém resolução probabilística nem substitui o Domain.

Ao persistir, a fronteira pode representar o agregado por um envelope que
correlacione fingerprint, snapshot lógico inalterado, lineage e referências
criadas na persistência. Esse envelope não enriquece semanticamente nem reescreve
o snapshot; apenas materializa os vínculos que só passam a existir com o resultado
funcional.

O banco é a garantia final de atomicidade, ownership, idempotência, integridade e
imutabilidade. O executor técnico não contorna essas garantias.

Uma falha pode produzir registro auditável da tentativa, mas nunca parte do
resultado funcional. O Implementation Plan deve escolher uma estratégia física
que preserve simultaneamente essas duas propriedades.

## Evolução do contrato público

A evolução necessária para idempotência, correlação e resultados estruturados
deve preservar consumidores existentes.

Princípios:

- mudanças incompatíveis não substituem silenciosamente o contrato vigente;
- evolução é aditiva, versionada ou mediada por compatibilidade explícita;
- consumidores antigos e novos convergem para a mesma regra de aplicação;
- adapters de compatibilidade não duplicam resolução ou regra de negócio;
- depreciação possui período e evidência de migração antes de remoção;
- erros novos são estáveis, traduzíveis e não expõem detalhes internos;
- alteração de superfície pública exige aprovação explícita e testes de regressão;
- assinatura, transporte e formato físico pertencem ao Implementation Plan.

## Composition Root e fronteira server-only

Toda composição concreta da aplicação ocorre em fronteira `server-only`. Uma
Server Factory constrói a Application Layer com implementações de ports,
repositories, autorização, relógio, identidade, correlação e Trusted Persistence.

A UI e módulos client-side nunca importam credenciais, repositories, adapters de
banco ou composição server-only. A Server Action resolve o contexto autenticado e
invoca a aplicação composta; não constrói dependências concretas dispersamente.

O Composition Root é o único local autorizado a conhecer simultaneamente
interfaces da aplicação e adapters concretos. Nenhuma credencial técnica atravessa
essa fronteira.

## Responsabilidades por camada

### UI

- apresenta origem, versão, prontidão e impedimentos;
- coleta a confirmação humana e mantém identidade de retry;
- não resolve mapping, tenant, autorização ou snapshot.

### Server Action

- valida a forma da entrada;
- resolve sessão e contexto confiáveis;
- ignora ator, tenant e executor fornecidos pelo cliente;
- chama a Application Layer pelo Composition Root;
- traduz resultados conhecidos e revalida somente consumidores afetados;
- não contém regra de negócio.

### Application Layer

- autoriza o ator no tenant;
- coordena leitura por ports;
- constrói a entrada completa do Resolver;
- orquestra idempotência, resolução e Trusted Persistence;
- traduz falhas em contratos estáveis;
- não persiste diretamente.

### Domain

- define Template Application, versão, snapshot, lineage e invariantes;
- mantém contratos independentes de framework e banco;
- não conhece UI, Supabase, RPC ou React.

### Resolver

- aplica exclusivamente regras determinísticas;
- recebe todos os dados e dependências variáveis explicitamente;
- produz comando completo ou impedimentos;
- não causa efeitos e não acessa infraestrutura.

### Ports

- representam fontes necessárias e a fronteira de persistência;
- pertencem à Application Layer;
- não expõem detalhes do fornecedor de infraestrutura.

### Repositories

- carregam e mapeiam persistência;
- implementam ports sem decidir autorização, ownership ou resolução;
- não duplicam invariantes do Resolver.

### Database e Trusted Persistence

- persistem a unidade atômica;
- garantem tenant, referências, idempotência, imutabilidade e concorrência;
- revalidam estados que possam mudar entre leitura e commit;
- preservam falha fechada mesmo sob executor técnico.

### RLS

- autoriza leitura e operação sobre linhas no tenant;
- impede acesso cross-tenant;
- não substitui FKs, constraints, Application Layer ou Trusted Persistence;
- não concede autoridade global por papel tenant-owned.

## Fronteira da IA

A IA pode sugerir templates, mappings e explicações para impedimentos. Toda
sugestão permanece separada da resolução oficial.

A IA não pode:

- decidir equivalência;
- criar, confirmar, ativar ou desativar mappings;
- publicar template, conceito ou versão;
- criar Application Snapshot;
- confirmar ou executar aplicação;
- gerar identidade humana ou autoridade;
- escolher fallback diante de ambiguidade;
- alterar Plan, snapshot, lineage ou auditoria;
- transformar nome, alias ou similaridade em vínculo oficial.

Somente confirmação humana autorizada e dados determinísticos podem iniciar
Trusted Persistence.

## Princípios permanentes

- **Determinismo:** mesma entrada completa produz a mesma resolução.
- **Fail closed:** ausência, ambiguidade ou inconsistência impede aplicação.
- **Tenant ownership:** todo resultado operacional e histórico pertence a um
  único tenant; nenhum identificador tenant-owned atravessa empresas.
- **Snapshot imutável:** o significado histórico nunca depende do estado atual.
- **Lineage permanente:** origem e resolução permanecem explicáveis sem acoplar o
  Plan ao template.
- **Ator separado do executor:** decisão humana e execução técnica são identidades
  distintas e auditáveis.
- **Trusted Persistence:** sucesso é atômico, idempotente e protegido no banco.
- **Clean Architecture:** dependências apontam para contratos internos.
- **DDD:** identidade, invariantes e linguagem pertencem ao domínio Development.
- **Compatibilidade retroativa:** contratos e histórico não são quebrados
  silenciosamente.
- **Reutilização:** Composition Root de Planning, snapshots imutáveis, integridade
  tenant-owned e execuções idempotentes existentes são precedentes; suas regras
  não são copiadas indiscriminadamente.
- **Regra única:** readiness e aplicação usam o mesmo Resolver.
- **Defesa em profundidade:** autorização, integridade, RLS e persistência são
  garantias complementares.

## Invariantes Arquiteturais

1. Toda aplicação possui identidade própria e imutável.
2. Toda aplicação consome exatamente uma versão publicada do Development
   Template.
3. Development Template Versions consumíveis são imutáveis.
4. Toda resolução é determinística.
5. IA nunca participa da resolução oficial.
6. IA nunca cria mappings oficiais.
7. Snapshots nunca são reidratados a partir do estado atual.
8. Snapshots representam evidência histórica permanente.
9. Lineage nunca depende de entidades mutáveis.
10. O resultado funcional é sempre atômico.
11. Retries nunca produzem duplicação funcional.
12. Idempotência pertence à Trusted Persistence.
13. Concorrência é garantida pela camada de persistência.
14. RLS complementa, mas nunca substitui:
    - Application Layer;
    - Trusted Persistence;
    - integridade referencial.
15. Ator humano e executor técnico representam responsabilidades distintas.
16. Trusted Persistence permanece a única fronteira autorizada para produzir o
    resultado funcional completo.
17. Fail closed permanece obrigatório.
18. Nenhuma resolução oficial utiliza:
    - nomes;
    - aliases;
    - similaridade;
    - IA.
19. Application Snapshot permanece imutável durante todo o ciclo de vida.
20. Alterações futuras em Template, Competency Concept, Mapping ou competência
    operacional nunca reescrevem histórico.

## Alternativas consideradas

### Manter a RPC atual como única camada de regra

Rejeitada. Preserva atomicidade básica, mas mistura resolução e persistência,
dificulta testes puros, não fornece Composition Root e favorece duplicação entre
pré-validação e aplicação.

### Considerar Plan, Goals e Actions como snapshot suficiente

Rejeitada. O resultado operacional não preserva integralmente versão, mapping,
representações originais, ator, executor, correlação e intenção idempotente.

### Reconstruir histórico consultando origem atual

Rejeitada. Templates, mappings, conceitos e competências podem mudar ou ser
descontinuados. Reconstrução posterior não prova o estado aplicado.

### Usar a identidade do Plan como identidade da aplicação

Rejeitada. O Plan só existe em sucesso e não representa falhas, retries,
concorrência ou conflito anterior à persistência funcional.

### Derivar idempotência apenas do payload

Rejeitada. Duas aplicações humanas intencionais e iguais precisam continuar
possíveis. A chave representa a confirmação, enquanto fingerprint detecta
reutilização conflitante.

### Controlar concorrência apenas na aplicação

Rejeitada. Processos, retries e executores distintos podem ultrapassar locks em
memória. A garantia final pertence à persistência.

### Resolver Global Competency Concept por nome, alias ou IA

Rejeitada pela PD-018. Descoberta e sugestão não comprovam identidade.

### Permitir aplicação parcial

Rejeitada pela PD-018. Plan, Goals, Actions, snapshot e auditoria de sucesso são
uma unidade atômica.

### Tratar `service_role` como ator

Rejeitada pela ADR-0013. Executor técnico não possui autoria ou autoridade
humana.

### Substituir imediatamente o contrato público

Rejeitada. A evolução deve ser retrocompatível, compartilhando a mesma regra
canônica durante a transição.

## Consequências

### Positivas

- aplicações globais e company-owned compartilham uma arquitetura;
- readiness e aplicação não divergem;
- retry e concorrência não duplicam Plan;
- histórico permanece explicável e independente de registros mutáveis;
- resolução global preserva isolamento tenant;
- regra determinística pode ser testada sem infraestrutura;
- autorização e execução técnica permanecem separadas;
- contratos podem evoluir incrementalmente;
- observabilidade passa a acompanhar uma identidade durável.

### Custos e riscos

- templates consumíveis precisam de identidade de versão;
- a persistência precisa representar aplicação, tentativas, snapshot e lineage;
- auditoria de falha e atomicidade do sucesso exigem desenho transacional
  cuidadoso;
- contrato legado precisa de estratégia de compatibilidade;
- dados históricos sem snapshot não podem receber lineage inventado;
- rollout pode encontrar templates ou mappings incompatíveis;
- revalidar estados no commit aumenta a complexidade da fronteira persistente;
- imutabilidade e retenção ampliam o volume histórico.

## Impactos arquiteturais

- Development ganha Template Application como conceito explícito do domínio;
- versões consumíveis tornam-se a origem canônica de novas aplicações;
- o fluxo de aplicação passa a uma Application Layer composta server-only;
- a resolução deixa a RPC e torna-se regra pura;
- persistência confiável continua transacional, agora com idempotência, snapshot,
  lineage e auditoria;
- o caminho global consome somente conteúdo publicado e mappings válidos;
- RLS e integridade tenant-owned continuam complementares;
- planos existentes permanecem legíveis; ausência histórica de snapshot não é
  reparada por inferência;
- detalhes físicos ficam reservados ao Implementation Plan.

## Relação com decisões existentes

### ADR-0003 — Development Templates

Esta ADR preserva a composição Template → Goals → Actions e acrescenta a
distinção entre identidade estável e versão consumível. Não altera a finalidade
funcional dos templates.

### ADR-0012 — Tenant-Owned Referential Integrity Strategy

Template Application, snapshot, lineage e resultado tenant-owned devem obedecer
à classificação e às garantias físicas da ADR-0012. Referências globais continuam
globais; referências tenant-owned nunca dependem apenas de IDs sem tenant quando
a classificação exigir integridade composta.

### ADR-0013 — Platform Global Authority and Trusted Execution

Publicação global continua exigindo autoridade humana global. Consumo de conteúdo
global publicado usa autorização tenant para criar o Plan. `service_role`, quando
presente, é executor server-only separado do ator e não contorna invariantes.

### PD-018 — Global Competency Concepts and Tenant Mapping

Esta ADR materializa arquiteturalmente, sem alterar, as decisões de produto sobre
conceitos globais, mapping humano, resolução determinística, atomicidade,
Application Snapshot, lineage, auditoria e fronteira da IA.

## Critérios arquiteturais de aceitação

A futura implementação estará aderente quando:

- toda aplicação possuir identidade tenant-owned distinta do Plan;
- toda aplicação consumir versão exata e imutável do template;
- um Resolver puro servir readiness e aplicação;
- company-owned resolver diretamente no tenant;
- global resolver somente por mapping humano válido e inequívoco;
- qualquer ausência ou ambiguidade falhar fechada;
- sucesso persistir resultado, snapshot, lineage e auditoria atomicamente;
- falha não persistir Plan parcial e permanecer auditável quando houver contexto
  confiável;
- retries e concorrência produzirem no máximo um resultado por intenção;
- conflito idempotente não criar nova aplicação;
- snapshot e lineage não forem reescritos;
- ator humano e executor técnico forem registrados separadamente;
- composição concreta permanecer server-only;
- UI, Action, Resolver, Application, repositories, banco e RLS respeitarem suas
  responsabilidades;
- contrato público evoluir sem duplicar regra ou quebrar consumidor
  silenciosamente;
- IA permanecer somente sugestiva;
- nenhuma referência tenant-owned atravessar empresas.

## Reconciliação necessária após aprovação

- **Product Decisions:** nenhuma alteração. Esta ADR não modifica a PD-018.
- **Discovery:** nenhuma mudança substantiva. Pode receber referência cruzada e
  registrar que as questões arquiteturais foram decididas.
- **Implementation Plan:** atualização obrigatória para detalhar a PR 3C,
  reconciliar o encerramento da PR 3B e definir persistência, rollout, contratos e
  testes sem contrariar esta ADR.
- **PROJECT_STATE:** atualização necessária para registrar a ADR aceita e o novo
  gate, sem ativar implementação automaticamente.
- **Índice de ADRs e documentação:** inclusão desta ADR e correção das referências
  aplicáveis pertencem à reconciliação posterior.

## Próximos passos

1. revisão e aprovação desta ADR pelo Product Architect;
2. reconciliação documental;
3. atualização do Implementation Plan da PR 3C;
4. nova autorização explícita antes de implementação;
5. somente então migrations, código e testes poderão ser propostos.

Esta ADR não autoriza a PR 3C nem antecipa detalhes físicos de implementação.
