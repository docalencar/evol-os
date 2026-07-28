# FRONTEND_ARCHITECTURE.md
## Evol People / Evol Performance MVP

Versão: 1.0

## Objetivo

Definir a arquitetura inicial do frontend para evitar que o projeto gerado por IA fique desorganizado.

O frontend deve ser simples, modular e fácil de evoluir.

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide Icons
- Supabase Client

## Princípios

1. Organizar por domínio, não por tipo de tela.
2. Reutilizar componentes.
3. Separar componentes visuais de regras de negócio.
4. Evitar componentes gigantes.
5. Toda tela deve ter estado de loading, vazio e erro.
6. Toda capability deve ter sua própria pasta.

## Estrutura sugerida

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

  hooks/

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
    database.types.ts
    people.types.ts
    company.types.ts
```

## Rotas iniciais

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

## Layout principal

A aplicação autenticada deve usar:

- Sidebar fixa no desktop
- Header superior
- Área de conteúdo
- Menu principal

Menu:

- Início
- Pessoas
- Avaliações
- Feedbacks
- Desenvolvimento
- Indicadores
- Empresa
- Configurações

## Padrão de componentes

### Componentes UI

Devem ficar em:

```txt
components/ui
```

Exemplos:

- Button
- Input
- Select
- Card
- Dialog
- Table
- Badge

### Componentes de domínio

Devem ficar dentro da capability.

Exemplo:

```txt
features/people/components/person-card.tsx
features/people/components/person-form.tsx
features/people/components/person-profile.tsx
features/people/components/people-table.tsx
```

## Padrão de services

Toda comunicação com Supabase deve passar por services.

Exemplo:

```txt
services/people.service.ts
```

Não chamar Supabase diretamente dentro de componentes visuais.

## Permissões

Perfis iniciais:

- owner
- admin
- hr
- manager
- employee

Regra inicial:

- owner/admin/hr veem tudo da empresa
- manager vê sua equipe
- employee vê apenas seus próprios dados

## Estados obrigatórios

Toda página deve possuir:

- loading state
- empty state
- error state
- success feedback

## Linguagem da interface

Usar linguagem humana.

Evitar termos técnicos.

Exemplos:

- Usar "Adicionar pessoa" em vez de "Cadastrar colaborador"
- Usar "Pessoas" em vez de "Funcionários"
- Usar "Não foi possível concluir essa ação" em vez de "Erro inesperado"

## MVP inicial

Implementar apenas:

1. Autenticação
2. Criação de empresa
3. Gestão de pessoas
4. Departamentos
5. Cargos
6. Gestores
7. Perfil da pessoa
8. Timeline básica
9. Empty states
10. Dashboard inicial simples

Não implementar ainda:

- Avaliações completas
- Feedbacks completos
- PDI completo
- IA real
- Pagamentos
- Recrutamento
