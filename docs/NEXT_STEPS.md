# Evol OS — Próximas Entregas

Este arquivo é a fila operacional derivada do `ROADMAP.md`, que é a fonte oficial
de priorização. Ele não cria prioridades próprias e não mantém histórico de PRs
concluídas; capacidades incorporadas à `main` são registradas em `EPICS.md`.

## Próxima entrega — Faixa salarial do cargo

### Objetivo

Adicionar a faixa salarial como dado estrutural do cargo, preservando a
arquitetura atual da feature Organization.

### Dependências

- CRUD e workspace de cargos existentes;
- contratos atuais de cargo;
- persistência e isolamento por empresa existentes.

### Critérios objetivos de aceite

- o cargo representa limites mínimo e máximo opcionais da faixa salarial;
- entradas inválidas ou faixa invertida são rejeitadas;
- criação e edição persistem os valores;
- detalhes e overview apresentam a faixa sem realizar cálculo financeiro;
- registros existentes continuam válidos sem faixa definida;
- isolamento por empresa e contratos públicos são preservados;
- testes cobrem validação, persistência e apresentação;
- validações canônicas do projeto passam;
- documentação afetada é atualizada.

### Fora de escopo

- salário individual de colaboradores;
- folha de pagamento;
- cálculo de custo de cenário;
- alteração do painel financeiro;
- recomendações por IA.

## Fila seguinte

### 1. Responsabilidades do cargo

Depende da estrutura atual de cargos.

Critério de saída: responsabilidades persistidas, editáveis e apresentadas no
workspace do cargo, com validação e compatibilidade com registros existentes.

### 2. Perfil ideal do cargo

Depende de responsabilidades e competências do cargo.

Critério de saída: perfil estruturado e apresentado sem duplicar o contrato de
competências.

### 3. Trilha de carreira

Depende de cargos enriquecidos e níveis hierárquicos.

Critério de saída: relações de progressão explícitas, válidas dentro da empresa e
apresentadas no workspace do cargo.

### 4. Organograma avançado

Depende da estrutura organizacional e das relações de carreira consolidadas.

Critério de saída: leitura hierárquica baseada nos contratos existentes, sem
regra de negócio na UI.

### 5. Talent Intelligence

Ordem: risco de desligamento determinístico, Nine Box, sucessão, Talent Review e
recomendações explicativas.

Depende de pessoas, competências, avaliações e desenvolvimento. Cada engine deve
ser entregue e testada antes da camada de IA correspondente.

### 6. Jornadas de liderança

Ordem: workspace de one-on-one, check-ins acompanháveis, reconhecimentos e planos
de ação.

Depende de pessoas, feedback, timeline e notificações.

### 7. Performance, IA avançada e Enterprise

- OKRs e acompanhamento operacional;
- projeções financeiras após os dados estruturais de custo;
- predições e benchmark organizacional sobre engines determinísticas;
- API pública, integrações, white label e marketplace.

Esses itens exigem novo recorte no `ROADMAP.md` antes de entrarem como próxima
entrega.

## Itens removidos desta fila

- PR-079A — concluída e absorvida;
- PR-079B — concluída e absorvida;
- PR-080 — concluída e absorvida;
- Avaliações, Feedback e Analytics genéricos — já possuem fundações e jornadas
  implementadas; evoluções remanescentes estão descritas por capacidade.

## Regra de atualização

Quando a próxima entrega for incorporada à `main`:

1. atualizar seu estado em `EPICS.md`;
2. atualizar a macrocapacidade correspondente em `ROADMAP.md`;
3. promover o primeiro item elegível desta fila;
4. remover da fila qualquer trabalho absorvido por implementação posterior.
