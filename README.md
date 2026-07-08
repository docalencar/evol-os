# evol-os

Repositório inicial da Evol People / Evol Performance MVP.

## Objetivo

Criar um SaaS B2B para desenvolvimento de liderança e performance, começando pela capability Gestão de Pessoas.

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

## Supabase

1. Crie um projeto no Supabase.
2. Copie a URL e a anon key para `.env.local`.
3. Execute as migrations em `supabase/migrations`.
4. Execute `supabase/seed.sql`.
