# ADR-0013 — Platform Global Authority and Trusted Execution

**Status:** Accepted

## Contexto

O Evol OS autentica pessoas por `auth.users` e autoriza operações tenant-owned
por `company_members`. Operações técnicas confiáveis podem usar `service_role`.
A PD-018 também exige autoridade humana global para governar conceitos, versões,
aliases e publicações, sem transformar papéis corporativos ou credenciais técnicas
em autoridade de produto.

## Problema

É necessário representar autoridade global, curadores delegados, revogação,
menor privilégio e auditoria, separando quem decide da identidade que executa a
operação técnica. Nenhum mecanismo existente cobre integralmente essa necessidade.

## Decisão

O Evol OS adota três identidades distintas:

1. **Human Global Authority:** pessoa autenticada, identificada canonicamente por
   `auth.users.id`, com delegação global ativa;
2. **Global Delegation:** concessão interna explícita, granular, revogável,
   temporal e auditável de capacidades globais;
3. **Trusted Technical Principal:** identidade server-only que executa operação
   já autorizada, sem representar aprovação humana.

Papéis tenant-owned nunca concedem autoridade global. Toda escrita global passa
por fronteira server-only e falha antes da mutação quando a autoridade não puder
ser comprovada.

## Identidade humana global

`auth.users.id` é a identidade humana global canônica. Cadastros internos podem
persistir estado, delegações e governança, mas não criam identidade humana
paralela. Email, domínio, membership ou payload do cliente não provam autoridade.

## Delegações

Uma delegação identifica concedente humano, beneficiário humano, capacidades,
motivo, início, expiração e eventual revogação. Seu histórico é append-only.
Ausência, expiração ou revogação falha fechado e tem efeito na próxima resolução
server-side.

Somente autoridade ativa com capacidade própria de administrar curadores pode
delegar ou revogar. Curadoria de conteúdo não implica administração de curadores.

## Capacidades

O catálogo é fechado e versionado, seguindo o padrão capability-based do projeto.
Ele distingue leitura global, edição de drafts, publicação, descontinuação,
administração de aliases, publicação de templates e administração de curadores.
Os identificadores físicos pertencem à implementação, sem alterar essas
separações.

## Autenticação e autorização

A fronteira server-only:

1. autentica o usuário pelo provedor oficial;
2. resolve `auth.users.id` sem aceitar ator do cliente;
3. carrega delegações ativas;
4. exige a capability específica;
5. valida expiração e revogação;
6. registra a decisão;
7. somente então chama o executor técnico;
8. persiste mutação e auditoria atomicamente.

Ator, capability e delegação fornecidos pelo cliente não são confiáveis. Erros
não revelam a existência de curadores ou delegações.

## Fronteira server-only e service_role

Clientes não recebem credencial técnica nem escrita direta sobre conteúdo global.
`service_role` executa somente operação técnica previamente autorizada, nunca
comprova aprovação humana e nunca é registrado como ator humano. Ele permanece
submetido a FKs, checks, unicidades, imutabilidade e invariantes físicas e aparece
separadamente como executor na auditoria.

## Bootstrap

A primeira autoridade é estabelecida por processo operacional controlado, com
identificação explícita do ator humano, executor técnico e auditoria obrigatória.
O ator não recebe credencial técnica. Nenhuma autoridade deriva de email, domínio
ou membership.

## Automações

Automação sem ator humano usa identidade técnica explícita, finalidade e escopo
fechados. Pode executar manutenção previamente autorizada, mas não publica,
descontinua, altera significado, administra curadores ou representa decisão
humana. Publicação, descontinuação, mudança semântica e gestão de curadores exigem
autoridade humana global válida.

## Auditoria

Toda tentativa relevante registra ator humano, executor técnico, delegação,
capability exigida, operação, alvo, motivo, timestamp, correlação, resultado e,
quando aplicável, estados anterior e posterior. Secrets, tokens e chaves técnicas
nunca são registrados. Auditorias de delegação e conteúdo são append-only.

## Separação de papéis

`owner`, `admin`, `hr`, `manager` e `employee` permanecem exclusivamente
tenant-owned. Autoridade global não concede autoridade sobre qualquer tenant. Um
usuário pode possuir ambas, mas elas são resolvidas e avaliadas separadamente.

## Defesa em profundidade e menor privilégio

- conteúdo global não publicado permanece invisível a tenants;
- `authenticated` não recebe escrita direta global;
- cadastro de delegações não é exposto a tenants;
- funções técnicas revalidam contexto e invariantes;
- falha de autorização ou auditoria impede mutação;
- cada delegação e principal técnico recebe somente o escopo necessário;
- administração de curadores permanece separada da curadoria de conteúdo.

## Alternativas rejeitadas

- **Claims como fonte única:** revogação depende de renovação do token e a
  auditoria de delegação é insuficiente;
- **allowlist externa permanente:** pouca granularidade, auditoria fraca e
  revogação dependente de deploy;
- **service_role como autoridade:** confunde execução técnica com decisão humana;
- **papel derivado de company_members:** rompe a separação plataforma/tenant;
- **operações somente por migration:** não suporta curadoria administrativa
  permanente; continua válida apenas para bootstrap e mudança estrutural.

## Consequências

A solução oferece autoridade comprovável, revogação imediata, granularidade e
auditoria completa. Em contrapartida, exige contexto global separado, persistência
de delegações, bootstrap controlado, composição server-only e testes adversariais.

## Critérios de aceitação

- autoridade global depende de delegação ativa ligada a `auth.users`;
- papéis corporativos não concedem capability global;
- delegação e revogação são auditáveis e imediatas;
- publicação e descontinuação possuem ator humano;
- executor técnico é registrado separadamente;
- cliente não acessa credenciais nem escrita global;
- automações possuem identidade e escopo explícitos;
- testes comprovam isolamento, revogação e resistência a escalonamento.

## Impacto na PR 3B

A PR 3B deve materializar cadastro de autoridades e delegações, catálogo fechado
de capabilities, contexto global server-only, bootstrap controlado, execução
técnica restrita e auditoria separando ator, delegação e executor. Tenant Mappings
continuam administrados por `owner`, `admin` e `hr` apenas na própria empresa.
