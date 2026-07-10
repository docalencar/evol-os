# Evol OS Architecture

## Visão

O Evol OS é um SaaS de Gestão de Pessoas focado em organização, competências, avaliações, desenvolvimento e inteligência de talentos.

O objetivo do sistema não é apenas cadastrar dados, mas responder perguntas estratégicas como:

- Quais competências existem na empresa?
- Quais competências são esperadas para cada cargo?
- Quais colaboradores possuem gaps de desenvolvimento?
- Quais pessoas estão prontas para assumir novas responsabilidades?
- Onde a empresa deve investir em treinamento e desenvolvimento?

## Stack

- Next.js 15
- React 19
- TypeScript
- Supabase
- Server Actions
- Tailwind CSS
- Zod
- Monorepo

## Estrutura do Monorepo

```txt
evol-os/
├── apps/
│   └── web/
├── docs/
└── supabase/
