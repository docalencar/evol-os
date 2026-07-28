# Agent Protocol — Colaboração assíncrona entre agentes

> Documento canônico de **como** os agentes transferem contexto, trabalho,
> decisões e revisões no Evol OS sem depender da memória de uma conversa.
>
> Os **papéis** (Product Architect, Implementation Agent, Quality Reviewer,
> Human Reviewer), suas fronteiras de decisão e o escalonamento estão definidos no
> `AGENTS.md` — este protocolo os **aplica**, não os redefine. Princípios,
> arquitetura e checklist de conclusão estão no `CLAUDE.md`. Em caso de conflito,
> prevalecem as ADRs e a arquitetura canônica, depois o `CLAUDE.md`, depois o
> `AGENTS.md`.

---

## 1. Objetivo

Permitir que humanos e agentes de IA colaborem de forma **assíncrona**: cada
participante entra, entende o estado atual a partir de artefatos permanentes,
executa sua parte e entrega o próximo passo — sem precisar reconstruir o contexto
a partir do histórico de um chat. O objetivo é eliminar a cópia manual de
informação entre ferramentas: o repositório (Git + Pull Request) é a fonte de
verdade compartilhada.

Este protocolo descreve exclusivamente o **fluxo de colaboração entre papéis**.
Arquitetura, padrões de implementação e decisões de produto permanecem definidos
nos respectivos documentos canônicos.

---

## 2. Princípios

- **Rastreável.** Todo trabalho relevante existe como artefato versionado (commit,
  PR, ADR), não como mensagem efêmera.
- **Baseado em evidências.** Afirmações apontam para arquivo, contrato, comando
  executado ou documento. Sem suposição (`AGENTS.md` §7).
- **Incremental.** Uma unidade de trabalho = uma PR pequena com objetivo único.
- **Independente de ferramenta.** O processo usa os nomes dos papéis; qual modelo
  ou pessoa os executa é secundário (ver §9).
- **Simples.** O protocolo não adiciona burocracia além do que a PR já oferece.
- **Auditável.** Qualquer pessoa consegue reconstruir *o que foi feito, por quem e
  com base em quê* lendo os artefatos.
- **Seguro para assíncronia.** Nenhum passo depende de contexto que só existe na
  cabeça de um participante ou numa janela de conversa.

---

## 3. Ciclo de colaboração

O ciclo abaixo detalha o fluxo do `AGENTS.md` (§4) e do
`development-workflow.md`, indicando o papel responsável e o artefato produzido em
cada etapa:

| Etapa                     | Papel responsável     | Artefato                          |
| ------------------------- | --------------------- | --------------------------------- |
| Ideia                     | Product Architect     | Issue / nota de contexto          |
| Especificação da PR       | Product Architect     | Spec (ver `pr-template.md`)       |
| Implementação             | Implementation Agent  | Commits na branch                 |
| Relatório de implementação| Implementation Agent  | Descrição da PR (handoff, §4)     |
| Revisão de qualidade      | Quality Reviewer      | Comentários classificados (code-review.md) |
| Correções                 | Implementation Agent  | Novos commits + resposta          |
| Aprovação humana          | Human Reviewer        | Aprovação da PR                   |
| Merge                     | Human Reviewer        | Merge na branch de integração     |

Cada transição entre papéis é um **handoff** (§4) e muda o **estado** da PR (§6).

---

## 4. Handoff

Um handoff é o registro que um papel deixa para o próximo. Vive na **descrição da
PR** (ou num comentário), não em arquivo separado. Deve ser **enxuto**: informação
acionável, não narrativa. Registrar, quando aplicável:

- identificação da PR/tarefa e objetivo único;
- escopo e o que ficou **fora** de escopo;
- arquivos/áreas alterados;
- decisões tomadas e padrões reutilizados (com referência a onde já existiam);
- validações executadas e resultado dos testes/build;
- riscos, pendências e dúvidas;
- desvios em relação ao planejado;
- próximo papel responsável.

Campos sem conteúdo são omitidos — não se preenche com "N/A" decorativo. O que não
é acionável não entra.

---

## 4.1 Orçamento de contexto e prompts incrementais

O contexto enviado a cada agente deve ser o menor pacote capaz de sustentar sua
responsabilidade atual. Referencie fontes canônicas pelo caminho e avance por
prompts incrementais; não copie histórico completo de conversa, documentação
integral, decisões não relacionadas nem explicações já registradas no repositório.

**Pacote mínimo para implementação:** objetivo único, escopo, fora de escopo,
contratos preservados, arquivos ou áreas permitidos, critérios de aceitação, nível
de risco e caminhos dos documentos canônicos.

**Pacote mínimo para revisão:** especificação, diff, validações declaradas e
contratos ou ADRs diretamente afetados. A revisão analisa regressões introduzidas
pelo diff, prioriza P0/P1 (`BLOCKER`/`REQUIRED`), ignora estilo sem impacto, não
amplia escopo e não revisa novamente toda a base após uma correção pequena.

Após correção, o handoff contém somente o finding corrigido, arquivos alterados,
decisão aplicada, validações e novo diff relevante. Finding bloqueante recebe uma
única revalidação focada; outro ciclo só começa se a correção introduzir novo
P0/P1 comprovado.

---

## 5. Artefatos de comunicação

A ponte entre agentes são artefatos rastreáveis, priorizando Git e GitHub:

- **Especificação da PR** — o combinado antes de implementar (`pr-template.md`).
- **Descrição da Pull Request** — handoff da implementação (§4).
- **Relatório de implementação** — parte da descrição da PR, não um arquivo à parte.
- **Revisão técnica** — comentários classificados (ver `code-review.md`).
- **ADR** — quando a decisão é arquitetural e permanente (`docs/adr/`).
- **Comentário de revisão** — discussão pontual ancorada em linha/arquivo.
- **Checklist da Definition of Done** — a do `CLAUDE.md` (§8), referenciada, não
  copiada.

Não criar um sistema paralelo de arquivos temporários de "status" ou "log" quando
a própria PR já cumpre a função. Arquivos versionados são para conteúdo permanente
(ADR, padrão, documento); estado transitório vive na PR.

---

## 6. Estados de trabalho

Estados de uma unidade de trabalho (PR), do início ao fim:

- **Planned** — ideia registrada; ainda sem especificação.
- **Ready for Implementation** — especificação aprovada pelo Product Architect.
- **In Progress** — Implementation Agent trabalhando.
- **Ready for Review** — implementação entregue com handoff; aguarda Quality Reviewer.
- **Changes Requested** — revisão pediu ajustes (há comentário BLOCKER ou REQUIRED).
- **Ready for Human Approval** — revisão técnica ok; aguarda Human Reviewer.
- **Done** — mergeado.
- **Blocked** — parado por um gatilho de escalonamento (§7); registra o motivo.

O estado é comunicado pelo mecanismo da ferramenta (rótulo, coluna, status de PR).
Não se inventa um workflow além destes estados.

---

## 7. Bloqueios e escalonamento

O agente **para e escala** (marca **Blocked** e registra o motivo) diante de:

- ausência de padrão aplicável;
- conflito entre documentos;
- necessidade de mudar arquitetura;
- alteração de contrato público;
- necessidade de migration;
- qualquer ação irreversível;
- dúvida de negócio;
- risco de segurança;
- teste que não pode ser executado;
- escopo maior que o planejado.

A ordem de escalonamento (procurar padrão → consultar `CLAUDE.md`/docs → propor →
aguardar aprovação) está no `AGENTS.md` (§6). Bloqueio não é falha: é o
comportamento correto quando falta base para decidir.

---

## 8. Proibições

Um agente **nunca**:

- inventa ou presume uma aprovação;
- afirma ter executado um teste/comando que não executou;
- esconde uma falha, erro ou resultado negativo;
- altera o escopo silenciosamente;
- introduz arquitetura nova sem aprovação;
- executa ação irreversível sem participação humana;
- faz merge por conta própria quando isso é do Human Reviewer.

Estas proibições espelham o `AGENTS.md` e são inegociáveis, independentemente da
ferramenta ou do modelo.

---

## 9. Independência de ferramentas

O protocolo é escrito em torno de **papéis**, não de produtos. Um papel pode ser
exercido por uma pessoa ou por diferentes assistentes de IA em momentos diferentes;
o processo permanece válido quando os participantes mudam.

Ferramentas e modelos aparecem apenas como **exemplos de atribuição** — nunca como
parte indispensável. Exemplo: um agente de IA pode atuar como Implementation Agent
enquanto outro atua como Quality Reviewer, mas os artefatos e as fronteiras são os
mesmos que se o trabalho fosse todo humano.

---

## 10. Exemplo enxuto

Colaboração numa PR pequena e incremental, que evolui algo já existente:

1. **Product Architect** abre a especificação: objetivo único, escopo, contratos a
   preservar, critérios de aceitação e restrições (`pr-template.md`). Estado →
   *Ready for Implementation*.
2. **Implementation Agent** implementa na branch, reutiliza os padrões já adotados
   em código semelhante, executa as validações do projeto e escreve o handoff na
   descrição da PR: arquivos tocados, decisão de reuso, resultado das validações.
   Estado → *Ready for Review*.
3. **Quality Reviewer** confere aderência à spec, contratos e testes; deixa um
   `SUGGESTION` e nenhum `BLOCKER`. Aprova tecnicamente. Estado → *Ready for Human
   Approval*.
4. **Human Reviewer** valida o comportamento e faz o merge. Estado → *Done*.

Nenhuma etapa dependeu do histórico de um chat: cada papel entrou pelos artefatos e
saiu deixando o próximo handoff.
