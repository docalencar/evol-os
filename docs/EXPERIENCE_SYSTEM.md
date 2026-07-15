# Evol OS — Experience System

## Objetivo

O Experience System define os blocos de experiência reutilizáveis do Evol OS.

Diferentemente de um Design System tradicional, estes blocos representam problemas de negócio e jornadas do usuário, não apenas componentes visuais.

---

# Filosofia

Toda tela do Evol OS deve responder, nesta ordem:

1. Onde estou?
2. O que está acontecendo?
3. O que é prioridade?
4. O que devo fazer agora?
5. Quais informações de apoio existem?
6. Como me aprofundar?

---

# Experience Blocks

## ProductHero

### Objetivo

Apresentar o contexto da jornada.

### Responde

- Onde estou?
- O que posso fazer?

### Exemplo

Avaliações

Aplique avaliações, acompanhe respostas e desenvolva pessoas.

[ Nova Avaliação ]

---

## ProductPriorityCard

### Objetivo

Mostrar a ação mais importante do momento.

### Futuro

Pode ser alimentado por IA.

---

## ProductMetricCard

### Objetivo

Apresentar indicadores resumidos.

Nunca deve ser utilizado isoladamente.

---

## ProductInsightCard

### Objetivo

Mostrar recomendações.

Sempre responder:

"O que merece atenção?"

---

## ProductActionBar

### Objetivo

Agrupar ações principais da tela.

---

## ProductTimeline

### Objetivo

Mostrar evolução ao longo do tempo.

---

## ProductEmptyState

### Objetivo

Ensinar o usuário quando não existir conteúdo.

Todo Empty State deve:

- explicar o contexto;
- sugerir a próxima ação;
- possuir CTA principal.

---

# Regras

Um componente só pode entrar em:

src/components/product

quando:

- não conhecer banco;
- não conhecer Supabase;
- não conhecer uma feature específica;
- representar um padrão reutilizável.

Caso contrário, ele permanece em:

features/*/components

---

# IA

A IA não é um módulo separado.

Ela participa dos Experience Blocks.

Exemplos:

- ProductPriorityCard
- ProductInsightCard
- ProductTimeline

Todos podem ser alimentados por IA.

---

# Evolução

Novos blocos só poderão ser adicionados após documentação neste arquivo.
