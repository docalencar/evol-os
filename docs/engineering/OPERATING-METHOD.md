# Operating Method — método permanente de execução governada

> Este documento é **permanente**. Ele descreve *como* trabalhamos, nunca *o que*
> já foi feito. Não contém SHAs, números de migration, runs de CI nem histórico de
> slices fechados — esses fatos vivem no Git e nos closure docs, e são
> **descobertos**, não transcritos.
>
> Complementa o `CLAUDE.md` (arquitetura e método de produto). Onde o `CLAUDE.md`
> diz como construir uma feature, este documento diz como executar, validar,
> publicar e promover com segurança.

---

## 1. Autoridade

**O repositório é a memória canônica. O Git é a prova do estado.**

Fato descobrível — SHA, branch, conteúdo de arquivo, número da última migration,
ACL de uma tabela, presença de um arquivo, resultado de um teste — é *descoberto*,
nunca presumido a partir de um resumo e nunca pedido ao humano para colar.

Regra de conflito, sem exceção:

- **Git vence** para estado factual do repositório;
- **documentação canônica vence** para intenção, prioridade e contrato;
- **contradição entre os dois interrompe o trabalho** e é classificada
  (`CONTRACT_CONFLICT`), nunca resolvida silenciosamente.

## 2. Inspecionar antes de editar

Todo slice começa reconstruindo o estado real: branch, HEAD, `origin/main`,
worktree, e a arquitetura efetiva da área tocada. Não se assume nome de arquivo,
não se assume que o resumo do prompt está atualizado, não se assume que o padrão
lembrado ainda é o padrão vigente.

Quando uma busca puder ter falso negativo — `grep` de linha única contra um
`GRANT` multi-linha, por exemplo — usa-se a ferramenta que entende a gramática
(parser SQL, AST, `git ls-files`) antes de concluir ausência.

## 3. Slices pequenos e rastreáveis

Um slice tem **um objetivo verificável**. Não se mistura correção com refactor,
nem implementação com publicação. Cada fase é distinta e tem critério próprio:

```
diagnóstico → correção → validação → commit → publicação → promoção
```

Diagnosticar não autoriza corrigir. Corrigir não autoriza publicar. Publicar
código **não** autoriza promover migration. Cada fronteira exige autorização
explícita.

## 4. Git

- **Staging explícito, sempre.** Nunca `git add .`, nunca `git add -A`.
- Inspecionar o diff staged antes de commitar.
- **Nunca**: `git clean`, `reset --hard`, `checkout -- .`, `restore .`, stash de
  estado protegido, force push, amend ou rebase de história já publicada.
- Reconciliação de branch com `main` é feita por **merge**, preservando a
  ancestralidade do candidate original — nunca por rebase ou squash.
- Preferência de merge na publicação: **merge commit**. Verificar os dois pais e
  a ancestralidade depois, não confiar no badge do PR.

### Estado protegido

Arquivos untracked de evidência (backups de ambiente, auditorias em andamento,
runners de promoção históricos, diretórios de evidência, stashes preexistentes)
são **preservados**: presentes, untracked, intocados. Não são staged, movidos,
renomeados nem limpos. Quando um slice declara um conjunto protegido, esse
conjunto é auditado no início e no fim.

### Casing no macOS

O sistema de arquivos do macOS é case-insensitive; **o índice do Git é a
autoridade de casing**. Caminhos canônicos não são "normalizados" porque o shell
os resolveu de outra forma. Diretórios que diferem apenas por maiúsculas coexistem
legitimamente no índice.

## 5. Classificação de falhas

**Classificar antes de corrigir.** Nunca reexecutar cegamente, nunca enfraquecer
um teste para destravar um gate, nunca escolher a classe conveniente.

| Classe | Significado |
| --- | --- |
| `REGRESSION` | Comportamento correto quebrou por mudança nossa. |
| `PRE_EXISTING` | Já falhava antes do slice; não foi introduzido aqui. |
| `STALE_TEST` | A asserção codifica um contrato obsoleto. Re-ancorar, não deletar. |
| `ENVIRONMENTAL` | Causa externa (DNS, rede, toolchain ausente, serviço). Não reescrever produto por causa disso. |
| `HARNESS_DEFECT` | O próprio arnês/gate está errado; o alvo pode nem ter sido exercido. |
| `DOWNSTREAM_CASCADE` | Consequência de outra falha já classificada. |
| `PRODUCT_GAP` | O produto não possui a capacidade exigida. |
| `SECURITY_CONTRACT_FAILURE` | Uma invariante de segurança deixou de valer. |
| `CONTRACT_CONFLICT` | Duas fontes canônicas discordam. Parar e reportar. |
| `UNKNOWN_REMOTE_OUTCOME` | Mutação remota iniciou e o resultado é incerto. **Nunca é "não aplicou".** |
| `PARTIAL_REMOTE_APPLICATION` | Evidência indica estado remoto parcial. |
| `DB_CONTRACT_DEFICIENCY` | Falta boundary confiável no banco para a capacidade exigida. |
| `PRODUCT_DECISION_REQUIRED` | A escolha é do produto, não da engenharia. |

Um gate que falhou **sem executar o alvo** é `HARNESS_DEFECT`, não falha do alvo.
Um arnês que descarta a própria saída de erro é um defeito por si só: gates
preservam e imprimem evidência quando falham.

## 6. FAST PATH e GOVERNED PATH

O caminho é escolhido pelo **risco da mudança**, não pelo seu tamanho.

### FAST PATH

UI, application services, queries, presenters, refactors, testes, documentação —
trabalho de produto sem superfície de segurança.

FAST PATH **não é ausência de governança**. Mantém: inspeção prévia, escopo
mínimo, reutilização de padrão existente, testes aplicáveis, staging explícito,
`git diff --check`, e verificação de publicação (CI no SHA exato, merge verificado,
CI pós-main). Apenas dispensa controles que não se aplicam.

### GOVERNED PATH

**Obrigatório** para: migrations; ACL/RLS/policies; autenticação e autorização;
qualquer superfície de segurança; operações destrutivas; promoção para Review;
qualquer mutação remota; mudanças sensíveis a retenção; e E2E hosted canônico.

Acrescenta, conforme aplicável:

- **Gate em PostgreSQL real.** Inspeção estática e casamento de padrões não provam
  SQL — só um planner prova. O primeiro servidor a ler um snapshot de PRE/POST
  nunca deve ser o ambiente canônico.
- **Identidade da mutação.** Um nome de arquivo não é identidade. A identidade é o
  par *(commit canônico de origem, SHA256 do payload)*, reconferido imediatamente
  antes da mutação.
- **PRE.** Prova o estado exato que torna a operação um passo único e bem definido:
  identidade do alvo, histórico esperado, ausência do objeto a criar (provada por
  **contagem de nome**, não por uma assinatura), dependências presentes,
  invariantes de retenção e segurança saudáveis.
- **Fingerprints.** O que não deve mudar é capturado no PRE e comparado no POST.
- **TOCTOU.** O snapshot inteiro é retomado e comparado byte a byte imediatamente
  antes da mutação, junto com o hash do payload e a identidade da origem.
- **Uma única mutação autorizada.** Um ponto de invocação, sem fallback, sem
  segunda tentativa automática, sem SQL avulso para "terminar o serviço".
- **Resultado ambíguo.** Saída não-zero de uma mutação remota significa
  `UNKNOWN_REMOTE_OUTCOME`: a tentativa foi consumida e o único passo seguinte
  permitido é **inspeção read-only**.
- **POST.** Propriedades lidas do catálogo, não casadas em texto, quando o catálogo
  puder responder.

Ferramenta capaz de mutar ambiente canônico é **versionada, revisada e mergeada
antes de receber credencial**.

## 7. Ambientes

| Ambiente | Papel |
| --- | --- |
| **Local** | Descartável. Onde todo gate de banco é provado primeiro. |
| **Review** | Alvo canônico de promoção e validação. |
| **Production** | `UNKNOWN / REVERIFY BEFORE USE`. Nunca avançada por Review estar em dia. |
| **Legacy** | **NÃO é alvo de promoção.** |

Detalhes de identidade, refs e URLs vivem em `docs/Execution/ENVIRONMENT-IDENTITY.md`;
o ciclo de vida de promoção, em `docs/Execution/ENVIRONMENT-GOVERNANCE.md`.

Publicar código-fonte de migration **não** é permissão para aplicá-la remotamente.

## 8. Segredos

Segredo não aparece em: código, testes, fixtures, logs, argumentos de processo,
histórico do Git, corpo de PR ou resposta ao humano. Credenciais são lidas do
cofre do sistema, parseadas em processo, e entregues por variável de ambiente —
nunca por `argv`. Nunca se pede ao humano para colar um segredo. Validação
estrutural reporta apenas booleanos (`SECRET_PRESENT`, `SCHEME_OK`,
`PROJECT_REF_MATCH`). Nunca `set -x` em script que toca credencial.

## 9. Publicação

Push normal, nunca forçado. PR com base e head verificados no SHA exato. CI
**no SHA exato do candidate** — CI de outro SHA não é evidência, e um job de build
*pulado* não prova build. Merge commit, com os dois pais e a ancestralidade
verificados depois. CI pós-main no SHA exato do merge: CI do candidate sozinho não
fecha publicação. Sincronização local de `main` apenas por fast-forward.

Se a base moveu durante o processo: **parar**. Não rebasear, não mergear a nova
base automaticamente — a nova base exige adjudicação.

## 10. E2E hosted canônico

Jornada real de usuário, não simulação. Fixtures determinísticas e isoladas por
tenant. **Durable readback**: o efeito é reconfirmado após recarga, não aceito a
partir do otimismo da UI. Isolamento entre tenants é provado, não presumido.
Aposentadoria de run e evidência são governadas; journals operacionais não são
mutados por arnês.

## 11. Validação

- **Não existe PASS parcialmente verde.** Um gate vermelho invalida o conjunto.
- **Não reexecutar gate já verde** quando nenhuma mudança posterior pôde
  invalidá-lo. Candidate byte-idêntico preserva a evidência já obtida.
- Contagem de testes é *evidência*; o **exit status** é o contrato.
- Exceção ambiental é classificada explicitamente e o gate correspondente em CI
  passa a ser a autoridade — nunca se reescreve produto para contornar ambiente.

## 12. Protocolo de contexto

```
repositório   guarda o conhecimento
Git           prova o estado
prompts       expressam intenção e delta
a IA          descobre os fatos
relatórios    comunicam deltas
histórico     permanece disponível, fora do caminho quente
```

Leitura canônica de um slice normal: este documento, `CLAUDE.md`, o estado atual
do projeto, o slice ativo e — apenas quando o domínio for tocado — o contrato do
domínio. Closure docs e ADRs são consultados sob demanda, nunca carregados por
rotina.

O slice ativo responde somente: `SLICE`, `GOAL`, `WHY`, `IN_SCOPE`,
`OUT_OF_SCOPE`, `KNOWN_STATE`, `GATES`, `STOP_CONDITIONS`, `EXPECTED_NEXT`.

Se o slice ativo contradiz um contrato permanente: **parar**, `CONTRACT_CONFLICT`.

## 13. Relatórios

**Em PASS** — apenas o delta:

```
SLICE · RESULT · NEW_EVIDENCE · STATE_CHANGED · BLOCKERS · NEXT
```

Não se repete contexto que o leitor já tem.

**Em falha** — expandir **somente o gate afetado**:

```
FAILED_GATE · COMMAND/OPERATION · EXIT/OUTCOME · RELEVANT_STDOUT_STDERR
CLASSIFICATION · AFFECTED_SCOPE · REMOTE_MUTATION_STATE · NEXT_SAFE_ACTION
```

**Relatório completo** fica reservado a: fechamento de slice, contrato de
segurança, promoção remota, E2E canônico, ou pedido explícito.

---

## Em resumo

Estamos otimizando **transferência de contexto, não rigor de engenharia**. O rigor
permanece inteiro; o que sai do prompt é aquilo que o repositório já sabe provar.
