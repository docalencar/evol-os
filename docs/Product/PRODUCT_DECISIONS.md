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
