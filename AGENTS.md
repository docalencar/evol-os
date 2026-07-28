# AGENTS.md — Colaboração entre Agentes no Evol OS

> Como os agentes (humanos e de IA) trabalham **juntos** para desenvolver o Evol OS.
> Este documento trata de **papéis, fronteiras de decisão e colaboração** — não de
> arquitetura nem de padrões de código, que vivem no `CLAUDE.md` e na documentação
> de engenharia.
>
> Leitura obrigatória antes de qualquer trabalho: **`CLAUDE.md`** (princípios,
> arquitetura e workflow de implementação). Este `AGENTS.md` **complementa** o
> `CLAUDE.md`; não o substitui nem o repete. Onde houver detalhe técnico, a
> referência é sempre o `CLAUDE.md` e `docs/engineering/`.
>
> Operacionalização deste guia (o *como* da colaboração assíncrona):
> `docs/engineering/agent-protocol.md` (protocolo e handoff), `code-review.md`
> (revisão), `pr-template.md` (especificação de PR) e `release-process.md`.

---

## 1. Objetivo

O Evol OS usa **agentes especializados** para acelerar o desenvolvimento sem abrir
mão de qualidade, arquitetura e consistência. Cada agente tem um papel claro e uma
fronteira de decisão definida. O ganho de velocidade vem da divisão de
responsabilidades — não do relaxamento das regras descritas no `CLAUDE.md`.

---

## 2. Princípios de Colaboração

Princípios permanentes que regem como os agentes trabalham juntos:

- **Especialização.** Cada agente atua dentro do seu papel; nenhum agente decide
  fora do seu domínio de decisão.
- **Decisões baseadas em evidências.** O que orienta uma decisão é o código
  existente e a documentação oficial — nunca suposição.
- **Evolução incremental.** A colaboração produz mudanças pequenas e revisáveis,
  não grandes saltos.
- **Responsabilidade clara.** Cada mudança tem um responsável identificável e uma
  fronteira de decisão explícita (§5).

---

## 3. Papéis

**Product Architect** — dono da direção técnica e do produto. Responsável por:
arquitetura e sua evolução, definição e recorte das PRs, decisões estruturais,
criação/alteração de contratos públicos e engines, e revisão arquitetural.

**Implementation Agent** — executa dentro das fronteiras definidas. Responsável
por: implementação, refatoração pontual, testes, build, correções e documentação
técnica da mudança. Segue o *Workflow de Implementação* do `CLAUDE.md` (§1) e
espelha os padrões já existentes.

**Quality Reviewer** — é uma **função**, não uma pessoa: em cada momento pode ser
exercida pelo autor humano, por um agente de IA ou por outro desenvolvedor.
Responsável por: revisão técnica e arquitetural, validação da aderência ao
`CLAUDE.md`, identificação de dívida técnica e validação da Definition of Done. Não
aprova merge e não altera arquitetura — seu objetivo é garantir qualidade e
consistência.

**Human Reviewer** — palavra final sobre negócio e integração. Responsável por:
validação funcional, decisões de negócio, aprovação, execução de migrações e
merge. Ações irreversíveis ou que tocam dados de produção são sempre suas.

Papéis são **fronteiras de decisão**, não cargos: um mesmo participante pode
acumular papéis, e o que não muda é o limite de decisão de cada um.

---

## 4. Fluxo de trabalho

O ciclo abaixo é a aplicação colaborativa do workflow oficial
(`docs/engineering/development-workflow.md`) e do `CLAUDE.md` (§1):

```text
Ideia
  → Arquitetura                          (Product Architect)
  → Planejamento da PR                   (Product Architect)
  → Implementação                        (Implementation Agent)
  → Build + Testes                       (Implementation Agent)
  → Revisão técnica / de qualidade       (Quality Reviewer)      ← recebe o handoff
  → Revisão arquitetural, quando aplicável (Product Architect)
  → Correções                            (Implementation Agent)
  → Aprovação final + Merge              (Human Reviewer)
```

Após a implementação, o handoff vai para o **Quality Reviewer** (revisão técnica).
A **revisão arquitetural** é acionada pelo Product Architect quando a mudança toca
arquitetura ou contratos. A **aprovação final, o merge, as migrations e qualquer
ação irreversível** são exclusivos do **Human Reviewer**.

O recorte de cada PR segue a metodologia do `CLAUDE.md` (§8): objetivo único e
ciclo curto (PR pequena → review simples → merge → próxima PR).

---

## 5. Responsabilidades (quem pode o quê)

| Ação                             | Product Architect | Implementation Agent | Quality Reviewer | Human Reviewer |
| -------------------------------- | :---------------: | :------------------: | :--------------: | :------------: |
| Criar/alterar arquitetura        |        Sim        |    Só se aprovado    |      Revisa      |     Aprova     |
| Alterar contratos públicos       |        Sim        |    Só se aprovado    |      Revisa      |     Aprova     |
| Criar novas engines              |        Sim        |    Só se aprovado    |      Revisa      |     Aprova     |
| Modificar padrões estabelecidos  |        Sim        |     Propõe (§6)      |      Revisa      |     Aprova     |
| Implementar / refatorar / testar |      Orienta      |         Sim          |      Revisa      |       —        |
| Atualizar documentação           |        Sim        |         Sim          |     Verifica     |     Aprova     |
| Validar Definition of Done       |     Recomenda     |       Prepara        |      Valida      |    Confirma    |
| Aprovar mudanças / merge         |     Recomenda     |          —           |        —         |      Sim       |
| Migrações e ações em produção    |     Recomenda     |          —           |        —         |      Sim       |

Regra prática: o Implementation Agent **preserva** contratos públicos, engines e
padrões (`CLAUDE.md` §5); qualquer mudança nessa superfície estável passa por
proposta e aprovação. O Quality Reviewer influencia por **recomendação** — aponta
desvios e dívida técnica, mas não aprova merge nem altera arquitetura.

---

## 6. Escalonamento

Quando um agente encontra uma situação **sem padrão existente**, a ordem é:

1. Procurar uma implementação semelhante no repositório.
2. Consultar o `CLAUDE.md` e a documentação de engenharia/ADRs.
3. Se ainda não houver padrão, **propor** um novo — com justificativa
   arquitetural.
4. **Aguardar aprovação** antes de introduzir a nova arquitetura.

Nunca inventar uma arquitetura nova silenciosamente (`CLAUDE.md` §9). A ausência
de padrão é um ponto de decisão, não uma licença para improvisar.

---

## 7. Comunicação

Toda comunicação entre agentes é baseada em **fatos observados, código existente e
documentação oficial** — nunca em suposições. Ao relatar algo, aponte o arquivo, o
contrato ou o documento que sustenta a afirmação.

Diante de **ambiguidade**, o agente deve **investigar** (buscar a resposta no
código e na documentação), **perguntar** (a quem detém o contexto) ou **escalar**
(ao papel responsável pela decisão). Nunca assumir.

---

## 8. Definition of Done

Uma PR só está pronta quando **build e testes passam** (`npm run check`),
**arquitetura e contratos foram preservados**, a **documentação foi atualizada
quando relevante** e a **revisão foi concluída**. A checklist marcável é a do
`CLAUDE.md` (§8), que é a fonte única — este documento não a duplica.

---

## 9. Filosofia

O Evol OS **evolui continuamente**, e a arquitetura evolui de forma **incremental**.
Mudanças pequenas são preferíveis a grandes refatorações, e a **consistência do
sistema vale mais que velocidade**. Agentes existem para tornar essa evolução mais
rápida — mantendo, e não corroendo, a integridade descrita no `CLAUDE.md`.

---

## 10. Evolução deste documento

Este `AGENTS.md` descreve o **processo de colaboração** entre agentes. Ele só deve
mudar quando o **processo de engenharia** mudar — novos papéis, novas fronteiras de
decisão ou um novo fluxo de trabalho. Mudanças de implementação, de frameworks ou
da estrutura do código normalmente **não** exigem alteração aqui: essas evoluções
pertencem ao `CLAUDE.md` e à documentação de engenharia.
