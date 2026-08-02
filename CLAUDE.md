# CLAUDE.md — Guia de Trabalho no Evol OS

> Porta de entrada para qualquer implementação no **Evol OS** — humana ou assistida
> por IA. Este documento é **perene e enxuto**: concentra princípios,
> responsabilidades, fluxo de trabalho e tomada de decisão. Ele **não reproduz**
> detalhes técnicos que já vivem na documentação canônica; sempre que precisar de
> profundidade, vá à fonte:
>
> - `ARCHITECTURE.md` — visão da arquitetura e fluxo das features.
> - `docs/engineering/EVOL_ENGINEERING_PRINCIPLES.md` — princípios de engenharia.
> - `docs/engineering/ENGINEERING_GUIDE.md` — guia oficial de engenharia.
> - `docs/engineering/backend-standards.md` · `frontend-standards.md` ·
>   `development-workflow.md` — padrões por área.
> - `docs/adr/` — decisões de arquitetura (em especial `0001-feature-architecture`,
>   `0004-layer-responsibilities`, `0005-component-organization`).
>
> **Regra de ouro:** o código existente é a fonte de verdade. Na dúvida, siga o
> padrão que já está em uso e documentado — não invente um novo.

> **Hierarquia da documentação.** Este documento descreve princípios permanentes
> de desenvolvimento. Quando houver conflito entre este guia e a arquitetura
> vigente do projeto, prevalecem a arquitetura oficial (`ARCHITECTURE.md`) e as
> ADRs. O `CLAUDE.md` complementa essa documentação; não a substitui.

---

## 1. Workflow de Implementação

Antes de escrever qualquer código, leia **integralmente e nesta ordem**:

1. `CLAUDE.md`;
2. `docs/engineering/`;
3. `ARCHITECTURE.md` e a documentação de arquitetura aplicável;
4. `docs/Product/PRODUCT_VISION.md`;
5. `docs/ROADMAP.md`;
6. `docs/MVP_PLAN.md`;
7. `docs/EPICS.md`;
8. `docs/NEXT_STEPS.md`.

Depois da leitura, siga obrigatoriamente esta sequência de trabalho:

1. **Entenda** a funcionalidade solicitada.
2. **Localize** uma implementação semelhante no repositório.
3. **Reutilize** os padrões existentes.
4. **Preserve** os contratos públicos.
5. **Implemente** a menor mudança possível para atingir o objetivo.
6. **Valide** rodando os comandos realmente definidos no projeto e os testes
   aplicáveis à mudança.
7. **Conclua** apenas depois que todas as verificações passarem.

Regras de governança:

- nenhuma PR de produto é criada fora da prioridade definida no `ROADMAP.md`;
- toda PR de produto aponta para a capacidade correspondente no `MVP_PLAN.md`;
- `NEXT_STEPS.md` contém somente a próxima entrega operacional;
- divergência entre documentação e código interrompe a implementação e exige
  reconciliação documental;
- prioridade ausente nunca é presumida nem inventada;
- uma PR por vez, com um único objetivo verificável.

A referência a espelhar é a feature `organization-planning`: é a mais completa e
demonstra todas as camadas na prática.

---

## 2. Visão do produto

**Evol OS é um Organization Operating System.** O objetivo é transformar RH de um
conjunto de telas de cadastro em uma **plataforma operacional de gestão
organizacional** — um sistema capaz de representar, projetar e operar organizações
reais.

O produto e o código são orientados por quatro pilares:

- **Cenários** — versões alternativas da organização, criadas a partir de um
  snapshot base e evoluídas por conjuntos de mudanças.
- **Projeções** — o motor determinístico que aplica as mudanças de um cenário
  sobre o snapshot e produz o estado organizacional resultante, sem tocar em banco.
- **Inteligência organizacional** — análises determinísticas (span of control,
  capacidade, impacto estrutural, custo) e camadas de IA que **explicam, resumem
  e sugerem** sobre esses resultados.
- **Tomada de decisão** — comparação de cenários, propostas de reorganização,
  aprovação e publicação de snapshots.

O Evol OS **não é um conjunto de telas**: é um conjunto de **Engines** que
representam e operam organizações. A UI apenas consome os resultados dessas
engines. IA nunca substitui uma engine determinística — ela apenas explica,
resume, sugere ou interpreta linguagem natural sobre os resultados.

---

## 3. Princípios

Detalhamento completo em `docs/engineering/EVOL_ENGINEERING_PRINCIPLES.md`. O
essencial:

- **Clareza acima de esperteza.** Código fácil de entender vale mais que código
  inteligente.
- **Código legível por humanos.** Nomes explícitos que revelam intenção; nunca
  nomes genéricos como `doStuff` ou `helper`.
- **Arquitetura antes de velocidade.** O domínio vem primeiro; a arquitetura
  serve ao negócio, nunca o contrário.
- **Baixo acoplamento.** Cada camada depende de contratos, não de implementações.
- **Alta coesão (Feature First).** Todo código vive próximo do domínio ao qual
  pertence; nada de estruturas globais para código de uma única feature.

### Princípio da Simplicidade

**A solução mais simples que preserva a arquitetura é preferível à solução mais
sofisticada.** Evite abstrações prematuras: uma pequena duplicação incidental é
melhor que uma abstração errada. (Regra de negócio, no entanto, nunca se
duplica — ver §5.)

### Princípio da Evolução

O Evol OS evolui continuamente. A arquitetura deve **evoluir, não ser
reinventada**. Toda solução nova deve se integrar ao ecossistema existente. Quando
houver dúvida entre **criar algo novo** ou **evoluir um componente existente**,
prefira evoluir o existente.

---

## 4. Arquitetura e responsabilidades

O detalhe técnico de cada camada está em `ARCHITECTURE.md`,
`docs/engineering/backend-standards.md` e `frontend-standards.md`. Aqui ficam as
fronteiras que **nunca** devem ser cruzadas.

**A direção do fluxo nunca se inverte:**

```text
Escrita:  UI → Action  → Service → Repository → Supabase
Leitura:  UI → Query   → Service → Repository → Supabase
```

Domínios com cálculo/projeção acrescentam uma camada de **Application**
(orquestração de casos de uso) que aciona **Engines** determinísticas sobre os
dados já carregados pelos repositories.

Responsabilidade — e limite — de cada camada:

- **Domain** — o núcleo do negócio: entidades, invariantes e eventos. Não conhece
  banco, React nem framework.
- **Application** — orquestra casos de uso e depende de contratos (ports), não de
  implementações concretas.
- **Engines** — determinísticas; operam apenas sobre contratos. **Não acessam
  banco** e não conhecem a UI. Por serem determinísticas, são sempre testadas.
- **Repository** — o **único** ponto de acesso a dados. Faz leitura/escrita e
  mapeia a persistência para o domínio. Não contém regra de negócio, validação,
  composição ou cálculo.
- **Factory** — compõe dependências (injeção) e entrega um service pronto para uso
  no servidor.
- **Service** — regra de negócio reutilizável e composição. Se uma regra pode ser
  usada por mais de uma Action ou Query, ela vive num Service. Não persiste
  diretamente.
- **Presenter** — transforma modelos de domínio/persistência em **ViewModels**. A
  UI consome ViewModels, nunca entidades.
- **Component** — UI fina: apresenta informação; não calcula, não decide, não
  valida regra complexa.
- **Action** — escrita. Valida a entrada, chama services/handlers, revalida o
  cache e retorna um estado tipado. Não implementa regra de negócio.
- **Query** — leitura. Valida a entrada, consulta via repository e devolve o
  formato que a UI espera. Nunca modifica dados nem acessa o banco diretamente.
- **Schema** — validação de toda entrada de usuário, com mensagens claras em
  português.
- **Types** — contratos **serializáveis** compartilhados da feature. Objetos que
  cruzam camadas são contratos planos, não instâncias de classe.

---

## 5. Organização de features e regras de ouro

Todo código de domínio vive em `apps/web/src/features/<feature>/` como um **vertical
slice** autocontido: cada feature reúne suas próprias camadas (actions, queries,
services, repositories, domain, components, schemas, types, constants) e expõe sua
**API pública** por um `index.ts`. O que não está no barrel é detalhe interno e não
deve ser importado de fora. Subdomínios grandes seguem o mesmo padrão como
mini-features. Convenções detalhadas em `docs/adr/0001-feature-architecture` e
`docs/engineering/`.

**Ao criar ou evoluir uma feature, espelhe uma existente** (`organization-planning`
é a referência) em vez de definir uma estrutura nova.

Regras que sustentam a manutenção de longo prazo:

- **Regra de negócio nunca se duplica.** Antes de escrever, procure a
  implementação equivalente e reutilize.
- **Reutilize as peças existentes** — services, factories, schemas/validators e
  presenters — em vez de reimplementá-las.
- **Não reinvente engines.** Projeção, inteligência e comparação já têm engines;
  estenda-as, não crie paralelas.
- **Preserve os contratos públicos.** Os `index.ts` e os contratos serializáveis
  são a superfície estável do sistema; evolua-os de forma retrocompatível.

---

## 6. Padrões de código

Alinhados ao `strict` do TypeScript e ao que já está no repositório (detalhe em
`docs/engineering/`):

- **Evite `any`.** Prefira tipos precisos, ou `unknown` com narrowing.
- **Tipos explícitos nas fronteiras públicas** (retornos de services, actions,
  queries e contratos).
- **Contratos serializáveis** para objetos que cruzam camadas.
- **`index.ts` consistentes**, com re-exports nomeados.
- **Imports organizados** em grupos: builtins, pacotes externos, absolutos e
  relativos.
- **Nomes explícitos** que revelam intenção.

Para versões de dependências e configuração, consulte `apps/web/package.json` e os
arquivos de config — não os replique aqui.

---

## 7. Qualidade e testes

O build e o lint fazem parte da definição de pronto. Hoje não existe script
agregado `check` nem script geral `test`: execute `npm run build`, `npm run lint`,
`npx tsc --noEmit` no workspace web e os testes aplicáveis com o runner usado pelo
projeto. Declare no handoff exatamente quais comandos foram executados.

Testes acompanham **domínio e lógica determinística**, que têm prioridade sobre a
interface. Deve existir teste correspondente sempre que houver **engine, regra de
negócio, cálculo, inteligência ou projeção**. Padrões de teste e organização em
`docs/engineering/development-workflow.md`.

---

## 8. Metodologia de PR e checklist

Cada PR deve ter **um único objetivo**, **não misturar refactors** com features ou
correções não relacionadas, **preservar compatibilidade** e **minimizar o impacto**
(mudança pequena e revisável). Mudanças relevantes atualizam a documentação
correspondente — a documentação faz parte da entrega.

Antes de concluir:

- [ ] **Build OK** (`npm run build`)
- [ ] **Lint OK** (`npm run lint`)
- [ ] **Testes aplicáveis OK** (comando e escopo declarados no handoff)
- [ ] **Tipagem OK** (`npx tsc --noEmit`, sem erros `strict`, sem `any` novo)
- [ ] **Diff íntegro** (`git diff --check`)
- [ ] **Imports organizados**
- [ ] **Sem duplicação de regra** (nada reimplementado que já existe)
- [ ] **Sem código morto** e sem TODO sem contexto
- [ ] **API pública preservada** (`index.ts` e contratos)
- [ ] **Documentação atualizada** quando a mudança for relevante

---

## 9. Em resumo

Este projeto **evolui incrementalmente**: PRs pequenas, cada uma com valor próprio
e build verde. A arquitetura e a direção dos fluxos devem ser **preservadas**;
novas implementações **seguem e evoluem** os padrões existentes. Na dúvida,
encontre onde algo semelhante já foi feito, siga esse padrão e, se necessário,
documente-o.

Se nenhum padrão semelhante existir, não invente uma nova arquitetura
silenciosamente. Primeiro proponha o novo padrão, apresente a justificativa
arquitetural e somente depois implemente a solução aprovada.
