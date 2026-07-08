# NEXT_STEPS.md

## Próximo passo imediato

Abrir este projeto no Cursor.

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

## Depois

1. Criar projeto Supabase.
2. Copiar URL e anon key para `.env.local`.
3. Executar migrations:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_rls_policies.sql`
4. Executar `supabase/seed.sql`.
5. Conectar telas aos services reais.
6. Implementar autenticação real.
7. Subir para GitHub.
8. Fazer deploy na Vercel.

## Ordem de desenvolvimento

1. Auth real
2. Company onboarding
3. CRUD real de pessoas
4. CRUD real de departamentos
5. CRUD real de cargos
6. Importação por planilha
7. Organograma
