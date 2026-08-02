# Release Process — Da PR ao ambiente

> Como uma mudança sai da PR e chega (quando aplicável) a um ambiente, no estágio
> **atual** do Evol OS. Este documento descreve apenas o que existe e é comprovado;
> o que ainda não existe é declarado como **lacuna / evolução futura**, nunca como
> processo já implantado.
>
> Papéis e fronteiras: `AGENTS.md`. Conclusão de uma mudança: checklist do
> `CLAUDE.md` (§8). Migrations de banco: `database-standards.md`.

---

## Conceitos (não são sinônimos)

Estes termos designam coisas distintas e não devem ser confundidos:

- **Conclusão de uma PR** — a mudança atende à Definition of Done e recebeu
  aprovação técnica e humana. Ainda não está integrada.
- **Merge** — a branch é integrada à branch principal. É a única etapa hoje
  necessária para uma mudança "entrar" no projeto.
- **Deploy** — publicar o código em um ambiente executável.
- **Release** — marcar/versionar um conjunto de mudanças como uma entrega.
- **Migration** — alterar o esquema/dados do banco. Independente do deploy de
  código e com responsabilidade humana explícita.

Uma PR pode ser concluída e mergeada sem que haja um "release" formal, e uma
migration pode ser necessária **antes** que o código correspondente seja mergeado.

---

## O que existe hoje

### 1. Validação automática (CI)

Há um workflow de integração contínua (`.github/workflows/ci.yml`) que roda em cada
Pull Request e em push para a branch principal. Ele executa, em ambiente limpo,
**instalação de dependências, lint e build**.

> **Importante:** a suíte de testes **não** roda no CI atualmente — o CI cobre lint
> e build. A execução dos testes aplicáveis é responsabilidade local do autor. O
> projeto ainda não possui scripts agregados `check` ou `test`. Ver Lacunas.

### 2. Validação local (antes de pedir revisão)

O autor executa `npm run build`, `npm run lint`, `npx tsc --noEmit` no workspace
web e os testes aplicáveis com o runner usado pelo projeto. O comando e o escopo
dos testes são declarados no handoff da PR (`agent-protocol.md` §4) e no template
de PR do GitHub.

### 3. Aprovação e merge

Fluxo de revisão em `code-review.md` e `agent-protocol.md` (§3). A **aprovação
técnica** é do Quality Reviewer; a **aprovação final e o merge** são do Human
Reviewer (`AGENTS.md` §5). Trabalha-se em branches curtas (`feat/*`, `docs/*`, …)
integradas à branch principal por PR pequena.

### 4. Migrations

As migrations vivem em `supabase/migrations/` e seguem `database-standards.md`
(uma migration, um objetivo; nunca editar migration já aplicada em ambiente
compartilhado). A **aplicação** de uma migration é uma ação com responsabilidade
**humana** (Human Reviewer) — é um gatilho de escalonamento para qualquer agente
(`agent-protocol.md` §7) e nunca é executada automaticamente por um agente.

---

## Verificação após integração

Depois do merge (e de uma migration, quando houver), o Human Reviewer **deve
confirmar** que o resultado esperado ocorreu: o CI da branch principal passou e o
comportamento alvo está presente. Problemas encontrados **devem ser tratados** por
nova PR pequena, seguindo o ciclo normal — não se corrige direto na branch
principal.

---

## Correções após integração

Problemas identificados após a integração **devem ser registrados** como
issue/tarefa e **tratados** por PR dedicada. Decisões estruturais tomadas no
caminho **devem ser registradas** como ADR (`docs/adr/`), conforme o
`development-workflow.md`.

---

## Lacunas e evolução futura

Os itens abaixo **ainda não existem** no repositório e não devem ser descritos como
se existissem. Ficam registrados como evolução futura:

- **Scripts e testes no CI.** Hoje o CI roda lint + build; não existem scripts
  agregados `test`/`check`, e os testes dependem de execução local. A evolução
  deve primeiro definir um runner geral confiável e depois incluí-lo no workflow.
- **Pipeline de deploy.** A stack prevê hospedagem (ver `README.md`), mas não há
  workflow/configuração de deploy versionada no repositório. Enquanto não houver,
  o deploy não é um passo automatizado deste processo.
- **Versionamento / release formal.** Não há convenção de tags, changelog ou
  cadência de release. "Merge na branch principal" é a unidade de entrega atual.
- **Rollback automatizado.** Não há mecanismo de rollback implantado. Na ausência
  dele, uma reversão **deve ocorrer** por PR dedicada que desfaz a mudança
  (revert), com a mesma revisão de qualquer outra. O rollback de migration **deve
  usar** migration compensatória e decisão humana.

Cada um desses itens, quando for implementado, deve ser adicionado a este documento
com o mecanismo real — e qualquer um deles é uma mudança de processo que passa pelo
Product Architect e Human Reviewer, não uma decisão de agente.
