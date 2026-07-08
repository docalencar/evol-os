# LOVABLE_MASTER_PROMPT.md
## Evol People — Prompt Mestre para geração inicial

Use este prompt no Lovable para criar a primeira versão funcional do MVP.

---

Você é um desenvolvedor sênior especialista em SaaS B2B, Next.js, Supabase, Tailwind CSS, shadcn/ui e arquitetura modular.

Crie a primeira versão da aplicação web Evol People, produto Evol Performance MVP.

## Contexto do produto

A Evol People é uma plataforma de desenvolvimento de liderança e performance.

Não é um sistema tradicional de RH.

O objetivo do MVP é permitir que uma empresa organize pessoas, departamentos, cargos e gestores para iniciar ciclos futuros de avaliação, feedback e desenvolvimento.

O protagonista do sistema é o gestor.

O RH configura.
O gestor desenvolve.
O colaborador evolui.
O diretor acompanha.

## Stack obrigatória

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide Icons
- Supabase

## Arquitetura

Organize o projeto seguindo este padrão:

```txt
src/
  app/
    (auth)/
      login/
      signup/
    (dashboard)/
      layout.tsx
      page.tsx
      people/
      company/
      assessments/
      feedbacks/
      development/
      indicators/

  components/
    ui/
    layout/
    empty-state/
    data-table/
    timeline/
    avatar/
    status-badge/

  features/
    auth/
    company/
    people/
    assessments/
    feedbacks/
    development/
    dashboard/

  lib/
    supabase/
    permissions/
    utils/

  services/
    companies.service.ts
    people.service.ts
    teams.service.ts
    positions.service.ts

  types/
```

## Design

Siga estes princípios:

- Interface limpa
- Muito espaço em branco
- Sidebar fixa
- Header superior
- Cards simples
- Linguagem humana
- Nenhuma tela vazia sem próximo passo
- Toda página com CTA principal

Use componentes shadcn/ui sempre que possível.

Use ícones Lucide.

## Paleta

Use uma identidade visual sóbria:

- Azul como cor primária
- Verde como cor de evolução/sucesso
- Cinzas claros para fundos
- Vermelho apenas para erro
- Amarelo para alertas

## Rotas que devem existir

```txt
/login
/signup
/app
/app/people
/app/people/new
/app/people/import
/app/people/[id]
/app/company
/app/company/teams
/app/company/positions
```

## Funcionalidades obrigatórias da primeira versão

### Autenticação

Criar telas de:

- Login
- Criar conta
- Logout

Usar Supabase Auth.

### Layout autenticado

Criar um layout principal com:

- Sidebar
- Header
- Nome da empresa
- Avatar do usuário
- Menu lateral

Menu:

- Início
- Pessoas
- Avaliações
- Feedbacks
- Desenvolvimento
- Indicadores
- Empresa
- Configurações

### Dashboard inicial

A tela inicial deve mostrar ações, não apenas gráficos.

Exemplo:

- Pessoas cadastradas
- Gestores definidos
- Feedbacks pendentes (placeholder)
- Avaliações abertas (placeholder)
- Próximo passo recomendado

### Pessoas

Criar tela de listagem de pessoas com:

- Busca por nome
- Filtro por departamento
- Filtro por cargo
- Filtro por status
- Botão "Adicionar pessoa"
- Botão "Importar planilha"

Tabela:

- Avatar
- Nome
- Cargo
- Departamento
- Gestor
- Status
- Ações

### Adicionar pessoa

Criar formulário em etapas:

Etapa 1:
- Nome
- Email
- Telefone

Etapa 2:
- Departamento
- Cargo
- Gestor

Etapa 3:
- Perfil DISC
- Data de admissão
- Status

### Perfil da pessoa

Criar página de perfil contendo:

- Foto/avatar
- Nome
- Cargo
- Departamento
- Gestor
- Tempo de empresa
- Última avaliação placeholder
- Último feedback placeholder
- PDI placeholder
- Timeline básica

### Empresa

Criar páginas simples para:

- Dados da empresa
- Departamentos
- Cargos

Permitir criar, editar e arquivar departamentos e cargos.

## Supabase

Preparar integração com Supabase usando variáveis:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Não invente tabelas novas além das definidas abaixo.

Tabelas principais:

- companies
- company_members
- people
- teams
- positions
- competencies
- assessment_templates
- assessment_questions
- assessments
- assessment_answers
- feedbacks
- development_plans
- development_actions
- events

## Regras importantes

- Não implementar pagamento.
- Não implementar IA real ainda.
- Não implementar recrutamento.
- Não implementar folha, ponto ou benefícios.
- Não criar telas complexas.
- Não criar dashboard com muitos gráficos.
- Priorizar fluxo simples e utilizável.

## Critérios de qualidade

A aplicação deve permitir:

1. Criar conta
2. Entrar no sistema
3. Criar/visualizar empresa
4. Criar departamentos
5. Criar cargos
6. Adicionar pessoas
7. Visualizar lista de pessoas
8. Abrir perfil de pessoa
9. Ver timeline básica
10. Navegar sem erros

## Tom de interface

Use textos como:

- "Adicionar pessoa"
- "Importar planilha"
- "Sua equipe"
- "Próximo passo"
- "Vamos começar adicionando sua primeira pessoa"

Evite:

- "CRUD"
- "Funcionário"
- "Erro inesperado"
- "Operação realizada com sucesso"

## Resultado esperado

Gere uma aplicação funcional, limpa, organizada e pronta para ser refinada no Cursor.

Priorize arquitetura, simplicidade e clareza.
