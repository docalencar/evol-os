# Evol OS

Organization Operating System para representar, planejar e operar organizações.

## Objetivo

Transformar dados organizacionais em contexto, projeções determinísticas,
inteligência e decisões humanas melhores.

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
- Vercel

## Estrutura

```txt
apps/web        Aplicação principal
supabase        Migrations e seed
docs            Documentação de produto e engenharia
packages        Pacotes futuros compartilhados
```

## Como começar

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

## Documentação

Antes de implementar, comece por [CLAUDE.md](./CLAUDE.md) e siga a ordem de
leitura definida nele. O mapa completo de fontes oficiais está em
[docs/README.md](./docs/README.md).

Prioridade atual: [docs/ROADMAP.md](./docs/ROADMAP.md). Próxima entrega:
[docs/NEXT_STEPS.md](./docs/NEXT_STEPS.md).

## Supabase

1. Crie um projeto no Supabase.
2. Copie a URL e a anon key para `.env.local`.
3. Execute as migrations em `supabase/migrations`.
4. Execute `supabase/seed.sql`.
