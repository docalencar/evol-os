# Evol OS — Mapa da Documentação

**Status:** Active

## Estrutura

```text
docs/
├── README.md
├── VISION.md
├── PRODUCT_PRINCIPLES.md
├── AI_CONTEXT.md
├── NEXT_STEPS.md
├── PLATFORM_BLUEPRINT.md
├── DOCUMENTATION_MAP.md
├── CANONICAL_SOURCES.md
├── MONOREPO_EVOLUTION.md
├── ADR_STRATEGY.md
├── Product/
├── architecture/
├── adr/
├── decisions/
├── domain/
├── database/
├── engineering/
├── experiences/
├── playbooks/
├── roadmap/
└── ux/
```

## Responsabilidades

- **Raiz:** entrada, visão, princípios, contexto global e fundação.
- **Product:** visão específica, manifesto, design, glossário e valor.
- **architecture:** arquitetura consolidada, fronteiras e fluxos.
- **adr:** decisões arquiteturais duráveis.
- **decisions:** decisões legadas ou complementares ainda não formalizadas.
- **domain:** entidades, invariantes, estados, relações e linguagem ubíqua.
- **database:** schemas, migrations, constraints, RLS e convenções SQL.
- **engineering:** padrões recorrentes de implementação.
- **experiences:** jornadas completas do usuário.
- **playbooks:** procedimentos executáveis.
- **roadmap:** planejamento, dependências e riscos.
- **ux:** linguagem, acessibilidade, mobile, dashboards e interação.

## Documentos locais

Arquivos em `apps/web/` possuem contexto local e não substituem documentos globais em `docs/`.

## Relação entre documentos

```text
Vision → Product → Experiences
Platform Blueprint → Architecture
Experiences + Architecture → ADRs
ADRs → Engineering Standards
Engineering Standards → Playbooks
Playbooks → Implementation
```

## Processo de criação

1. Identificar o tipo de conhecimento.
2. Consultar `CANONICAL_SOURCES.md`.
3. Verificar documentos relacionados.
4. Atualizar a fonte existente quando aplicável.
5. Criar arquivo apenas com responsabilidade própria.
6. Adicionar aos índices.
7. Verificar links.
8. Criar ADR quando houver decisão estrutural.

## Critério de qualidade

Um documento pronto possui objetivo, status, responsabilidade única, terminologia consistente, links válidos e independência de conversas anteriores.
