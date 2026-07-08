# EXECUTION_CHECKLIST.md
## Próximos passos práticos

## Etapa 1 — GitHub

1. Criar uma organização ou repositório chamado `evol-os`.
2. Subir os arquivos já gerados:
   - AI_CONTEXT.md
   - README.md
   - Database/schema.sql
   - Database/rls.sql
   - Database/seed.sql
   - Architecture/FRONTEND_ARCHITECTURE.md
   - Prompts/LOVABLE_MASTER_PROMPT.md

## Etapa 2 — Supabase

1. Criar projeto no Supabase.
2. Abrir SQL Editor.
3. Executar:
   - `schema.sql`
   - `rls.sql`
   - `seed.sql`
4. Criar um usuário de teste pelo Supabase Auth.
5. Validar se as tabelas foram criadas.

## Etapa 3 — Lovable

1. Criar novo projeto no Lovable.
2. Colar o conteúdo do `LOVABLE_MASTER_PROMPT.md`.
3. Pedir para gerar apenas a primeira versão do módulo Gestão de Pessoas.
4. Não pedir avaliações, feedbacks ou IA ainda.

## Etapa 4 — Cursor

1. Exportar/abrir o projeto gerado.
2. Conectar ao Supabase.
3. Revisar estrutura de pastas.
4. Corrigir chamadas de banco.
5. Testar login e CRUD inicial de pessoas.

## Etapa 5 — Primeiro teste real

O MVP técnico inicial só estará pronto quando for possível:

- criar conta;
- entrar no sistema;
- criar empresa;
- criar departamento;
- criar cargo;
- adicionar pessoa;
- abrir perfil da pessoa.

## Definição de pronto desta fase

A fase estará pronta quando a Evol possuir uma aplicação navegável com:

- autenticação;
- layout principal;
- gestão de pessoas;
- estrutura da empresa;
- dados persistindo no Supabase.
