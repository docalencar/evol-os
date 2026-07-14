# Frontend Standards

## Objetivo

Este documento define os padrões oficiais para desenvolvimento frontend do Evol OS.

Seu objetivo é garantir consistência, previsibilidade e facilidade de manutenção em toda a aplicação.

---

# Stack

O frontend utiliza:

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide Icons
- Server Components
- Server Actions

---

# Organização

A estrutura segue:

```
src/
    app/
    components/
    features/
    lib/
```

Código de domínio sempre pertence à Feature correspondente.

---

# Componentes

## Componentes pequenos

Cada componente deve possuir uma única responsabilidade.

Exemplo:

```
EmployeeForm

↓

EmployeeBasicInformationSection

↓

EmployeeOrganizationSection

↓

EmployeeActionsSection
```

---

## Componentes grandes

Quando um componente ultrapassar aproximadamente 150 linhas ou possuir múltiplas responsabilidades, ele deve ser dividido em um diretório.

Exemplo:

```
employee-form/

index.tsx
types.ts
employee-basic-information-section.tsx
employee-address-section.tsx
employee-actions-section.tsx
```

---

# Feature First

Todo código específico da feature permanece dentro da própria feature.

Evitar componentes globais quando o uso for exclusivo de um domínio.

---

# Server Components

Utilizar Server Components por padrão.

Client Components somente quando necessário.

Exemplos:

- useState
- useEffect
- useTransition
- eventos do navegador
- bibliotecas dependentes do cliente

---

# Formulários

Todo formulário deve possuir:

- schema Zod
- mensagens claras
- estados de carregamento
- feedback de sucesso
- feedback de erro

---

# Estados obrigatórios

Sempre considerar:

- Loading
- Empty State
- Error State
- Success State

Nenhuma tela deve ignorar esses estados.

---

# Componentes compartilhados

Componentes reutilizáveis devem permanecer em:

```
components/
```

Exemplos:

- DataTable
- PageHeader
- ConfirmDialog
- EntityDialog
- Dashboard Cards

---

# Componentes exclusivos

Componentes exclusivos permanecem na Feature.

Exemplo:

```
features/organization/positions/components/
```

---

# Estilo

Utilizar:

- Tailwind
- classes legíveis
- espaçamentos consistentes
- componentes do shadcn/ui

Evitar CSS isolado sempre que possível.

---

# Nomenclatura

Componentes:

```
EmployeeForm
PositionOverviewCard
DevelopmentPlanDialog
```

Arquivos:

```
employee-form.tsx
position-overview-card.tsx
development-plan-dialog.tsx
```

---

# Boas práticas

Preferir:

- composição;
- reutilização consciente;
- baixo acoplamento;
- props explícitas;
- tipagem forte.

Evitar:

- componentes gigantes;
- lógica de negócio na UI;
- acesso direto ao banco;
- duplicação desnecessária.

---

# Referências

Este documento complementa:

- ADR-0001
- ADR-0004
- ADR-0005
- FRONTEND_ARCHITECTURE.md
