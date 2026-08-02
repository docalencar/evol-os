# ADR 0010 — Assessment Authorization

## Status

Accepted

## Contexto

`assessment_responses` identifica o avaliado por `employee_id` e o autor por
`evaluator_id`. `assessment_answers` contém o conteúdo detalhado da resposta. As
policies originais autorizam leitura e alteração pela simples condição de
membership da empresa, o que não representa a política aprovada em PD-016.

Além da participação, ciclos passam a definir `Assessment Visibility`. Como
score, competências e comentários compartilham os mesmos registros persistidos,
RLS por linha não é suficiente para produzir todos os recortes de visibilidade
sem expor colunas adicionais. Leituras administrativas também precisam gerar
auditoria, garantia que um `SELECT` direto não oferece sozinho.

## Motivação

Respostas de avaliação são dados sensíveis. A autorização precisa ser aplicada em
profundidade, manter isolamento por empresa, impedir alteração por terceiros e
oferecer somente o recorte aprovado ao avaliado.

## Decisão

PD-016 é a política canônica do domínio. A arquitetura aplica essa política em
duas fronteiras complementares:

1. a Application Layer resolve o ator autenticado, avalia papel, participação,
   estado e visibilidade e impede a operação antes do acesso ao repository;
2. o banco aplica as mesmas condições mínimas por RLS e não permite que chamadas
   diretas contornem a política.

As tabelas de respostas brutas permanecem a fonte canônica. Recortes de resultado
para o avaliado não são construídos por seleção irrestrita dessas tabelas: uma
fronteira de leitura server-side retorna somente os campos permitidos por
`Assessment Visibility`.

Leituras administrativas de conteúdo bruto atravessam uma operação server-side
auditável. A existência de papel administrativo não autoriza escrita em responses
ou answers.

## Política de autorização

| Operação | Autorização |
| --- | --- |
| Criar ciclo, avaliação ou atribuição | `owner`, `admin` ou `hr` |
| Ler response/answers em preenchimento | evaluator associado |
| Alterar ou enviar response/answers | evaluator associado, apenas em `draft` ou `in_progress` |
| Ler response/answers submetida ou concluída | evaluator associado; `owner`, `admin` ou `hr` por leitura auditável |
| Ler resultado como evaluatee | recorte definido por `Assessment Visibility` |
| Exportar | `owner`, `admin` ou `hr`, por operação auditável |
| Reabrir | proibido até existir decisão e funcionalidade próprias |

`manager` não recebe privilégio por hierarquia. Quando for o evaluator associado,
recebe apenas as permissões dessa participação.

## Responsabilidades da Application Layer

- obter `company_id`, usuário e pessoa atuais por fronteiras server-side;
- distinguir papel administrativo de participação como evaluator/evaluatee;
- validar estado antes de qualquer escrita;
- impedir que identificadores fornecidos pelo cliente definam o ator;
- selecionar o read model correspondente à visibilidade do ciclo;
- registrar leituras e operações administrativas no mecanismo de auditoria;
- retornar erros sem revelar a existência de dados não autorizados.

Actions permanecem fronteiras finas. A regra reutilizável de autorização pertence
à camada de Application/Service e repositories continuam responsáveis apenas por
persistência.

## Responsabilidades do RLS

- preservar `company_id` em toda operação;
- permitir ao evaluator ler sua própria response e answers;
- permitir escrita somente ao evaluator associado e somente enquanto a response
  estiver em `draft` ou `in_progress`;
- impedir escrita administrativa em responses e answers;
- impedir acesso de managers e membros não relacionados;
- não usar a policy ampla de membership como autorização de conteúdo sensível;
- manter respostas brutas inacessíveis ao evaluatee quando o read model não
  autorizar o conteúdo integral.

Operações administrativas auditáveis e recortes do evaluatee não podem depender
de acesso direto irrestrito às tabelas. Suas fronteiras de banco devem validar o
ator e retornar apenas o contrato necessário.

## Consequências arquiteturais

- `assessment_cycles` precisa persistir `Assessment Visibility` como enum
  fechado;
- autorização passa a ser regra testável e compartilhada pelas Actions;
- testes adversariais precisam cobrir aplicação e banco separadamente;
- consultas administrativas existentes devem migrar para a fronteira auditável;
- consultas do evaluatee consomem read models, não registros brutos;
- respostas submetidas e concluídas tornam-se imutáveis também no banco;
- a trilha de auditoria precisa identificar empresa, ator, operação e alvo sem
  copiar o conteúdo sensível da resposta.

## Implementação de referência

A migration `0062_harden_assessment_authorization.sql` materializa esta decisão.
Ela restringe as policies das tabelas brutas, torna responses submetidas
imutáveis e expõe duas fronteiras explícitas:

- `read_assessment_administratively`, para leitura administrativa auditada;
- `read_assessment_result_for_evaluatee`, para o read model limitado pela
  visibilidade do ciclo.

A operação administrativa reutiliza `audit_secure_administrative_read` e grava
somente metadados de acesso. A suíte
`supabase/tests/assessment_authorization_rls.test.sql` é a prova executável de
paridade entre os papéis definidos nesta ADR e a autorização do banco.

## Impactos futuros

Assessment 360, Calibration, Succession e Performance Review devem reutilizar a
mesma distinção entre papel administrativo, evaluator e evaluatee. Novos recortes
de visibilidade ampliam o read model existente; não relaxam o acesso às tabelas
brutas. Anonimato, reabertura e novas formas de compartilhamento exigem decisões
de produto próprias antes de alterar esta política.

## Alternativas rejeitadas

- autorizar qualquer membro da empresa;
- tratar `manager` como administrador implícito;
- confiar apenas na Application Layer;
- usar apenas RLS por linha para ocultar colunas conforme a visibilidade;
- conceder leitura administrativa direta sem auditoria.
