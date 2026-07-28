# Code Review — Padrão de revisão técnica

> Como o **Quality Reviewer** revisa uma mudança no Evol OS e como o **autor**
> (Implementation Agent) prepara o trabalho para revisão.
>
> A checklist de conclusão é a do `CLAUDE.md` (§8) — este documento **não a
> reproduz**, apenas a referencia. Papéis e fronteiras estão no `AGENTS.md`; o
> protocolo de handoff está em `agent-protocol.md`.

---

## Objetivo

A revisão existe para proteger **arquitetura, contratos e qualidade** — não para
impor gosto pessoal. Uma boa revisão confirma que a mudança faz o que a
especificação pediu, preserva os padrões existentes e é sustentável. O foco é o
código e as evidências, nunca a pessoa que o escreveu.

---

## Responsabilidades do autor

Antes de marcar a PR como *Ready for Review*, o autor:

- garante que a mudança tem **objetivo único** e não mistura refactors não
  relacionados;
- executa as validações exigidas para o tipo de mudança realizada e registra o
  resultado;
- escreve o **handoff** na descrição da PR (`agent-protocol.md` §4): escopo,
  decisões, padrões reutilizados, validações e riscos;
- declara honestamente **o que não foi executado** e por quê;
- aponta os pontos onde tem dúvida, para orientar o revisor.

Uma PR chega à revisão pronta para ser lida — não cabe ao revisor descobrir o
escopo por conta própria.

---

## Responsabilidades do Quality Reviewer

O Quality Reviewer verifica, **nesta ordem** (do mais estrutural ao mais local):

1. **Aderência à especificação.** A mudança atende ao objetivo e aos critérios de
   aceitação da spec? Ficou dentro do escopo e das restrições?
2. **Arquitetura e contratos.** Respeita a direção dos fluxos e as fronteiras de
   camada (`CLAUDE.md` §4)? Preserva os contratos públicos e os `index.ts`
   (`CLAUDE.md` §5)? Não reinventa engine existente?
3. **Reuso e duplicação.** Reutiliza services/factories/validators/presenters em
   vez de reimplementar? Não duplica regra de negócio?
4. **Testes e build.** Há teste para engine/regra/cálculo/inteligência/projeção
   (`CLAUDE.md` §7)? As validações passaram? O resultado declarado é coerente com o
   diff?
5. **Documentação.** A mudança relevante atualizou a documentação correspondente?
6. **Legibilidade local.** Nomes explícitos, tipos nas fronteiras, imports
   organizados (`CLAUDE.md` §6).

O revisor **não aprova merge nem altera arquitetura** (`AGENTS.md` §5): ele aprova
tecnicamente ou solicita mudanças, e escala o que for decisão de arquitetura ou de
negócio.

---

## Classificação de comentários

Todo comentário de revisão recebe um rótulo, para separar o que **bloqueia** do que
é opinião:

- **BLOCKER** — impede o merge: quebra de arquitetura/contrato, regra duplicada,
  bug, teste ausente onde é obrigatório, build/teste falhando, risco de segurança.
- **REQUIRED** — precisa ser resolvido antes de aprovar, mas não é uma falha
  crítica: aderência incompleta à spec, falta de teste esperado, documentação não
  atualizada.
- **SUGGESTION** — melhoria opcional; o autor pode acatar ou não, com justificativa.
- **QUESTION** — pedido de esclarecimento; pode virar BLOCKER/REQUIRED conforme a
  resposta.

`BLOCKER` e `REQUIRED` movem a PR para *Changes Requested*. Só `SUGGESTION` e
`QUESTION` em aberto não impedem a aprovação técnica.

---

## Erro, risco, sugestão e dúvida

Distinguir a natureza do apontamento evita ruído:

- **Erro** — algo comprovadamente incorreto (BLOCKER/REQUIRED, com evidência).
- **Risco** — algo que pode causar problema futuro (dívida técnica); registrar
  mesmo quando não bloqueia.
- **Sugestão** — alternativa preferível, sem que a atual esteja errada (SUGGESTION).
- **Dúvida** — falta de contexto do revisor (QUESTION), não um defeito.

Nunca tratar preferência pessoal como erro.

---

## Revisão automatizada

O revisor de IA usa o diff como escopo primário e revisa apenas comportamento
introduzido ou alterado pela PR. Procura bugs, regressões, quebra de contrato,
segurança, ausência de teste obrigatório e violações arquiteturais, priorizando
P0/P1 — equivalentes a `BLOCKER` e `REQUIRED`. Cada finding cita arquivo, linha,
cenário de falha e evidência, além de declarar limitações de verificação.

O revisor não deve:

- revisar arquivos não alterados sem dependência concreta;
- pedir reorganização estética ou bloquear por preferência pessoal;
- propor abstrações sem necessidade comprovada;
- ampliar o escopo;
- repetir findings corrigidos;
- reiniciar uma revisão completa depois de correção localizada.

**Critério de parada:**

1. Sem `BLOCKER` ou `REQUIRED`, aprovar tecnicamente.
2. Com finding bloqueante, solicitar correção focada.
3. Após a correção, revisar o novo diff uma única vez.
4. Sem novo problema bloqueante, aprovar.
5. Sugestões não prolongam o ciclo.

---

## Evidências e limitações

Todo apontamento aponta para **arquivo/linha, contrato ou comando** que o sustenta
(`AGENTS.md` §7). Ao aprovar ou pedir mudanças, o revisor declara **o que
verificou e o que não conseguiu verificar** — por exemplo, um comportamento que
depende de execução em ambiente que não estava disponível. Uma revisão com limites
declarados é honesta; uma revisão que finge cobertura total não é.

---

## Quando pedir mudanças e quando aprovar

- **Solicitar mudanças** (*Changes Requested*) quando houver qualquer `BLOCKER` ou
  `REQUIRED` em aberto.
- **Aprovar tecnicamente** (*Ready for Human Approval*) quando a mudança adere à
  spec, preserva arquitetura e contratos, tem as validações e a documentação
  necessárias, e restam no máximo `SUGGESTION`/`QUESTION` não críticos.

A aprovação técnica **não** é aprovação de merge: o merge e as decisões de negócio
permanecem com o Human Reviewer (`AGENTS.md` §5).
