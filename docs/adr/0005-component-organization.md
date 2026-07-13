# ADR 0005 — Organização de Componentes

## Status

Accepted

---

## Contexto

À medida que o Evol OS cresce, formulários e páginas tendem a aumentar de complexidade.

Durante a implementação do módulo de Cargos (PR-079), o `PositionForm` passou a concentrar:

- regras de submissão;
- campos organizacionais;
- jornada de trabalho;
- regime contratual;
- validações visuais;
- botões de ação.

Essa evolução indicou a necessidade de definir um padrão arquitetural para componentes de maior porte.

---

# Decisão

### 1. Formulários grandes tornam-se diretórios

Quando um formulário crescer além de aproximadamente 150 linhas ou possuir múltiplos grupos de campos, ele deve ser convertido em uma pasta.

Exemplo:

```
position-form/

index.tsx
types.ts
position-form-options.ts
position-basic-information-section.tsx
position-organization-section.tsx
position-work-arrangement-section.tsx
position-actions-section.tsx
```

---

### 2. O index.tsx é o ponto de entrada

Os consumidores devem importar apenas:

```tsx
import { PositionForm } from "./position-form"
```

Nunca:

```tsx
import { PositionForm } from "./position-form/index"
```

---

### 3. Cada componente possui apenas uma responsabilidade

Exemplos:

- Basic Information
- Organization
- Work Arrangement
- Compensation
- Career
- Actions

---

### 4. Tipos compartilhados permanecem próximos do formulário

Os tipos utilizados exclusivamente pelo formulário permanecem em:

```
types.ts
```

Isso evita duplicação de interfaces entre diálogos, páginas e componentes.

---

### 5. Opções de domínio ficam fora dos componentes React

Listas como:

- níveis hierárquicos;
- modalidades;
- regimes;
- status;

devem permanecer em:

```
position-form-options.ts
```

Os componentes React devem preocupar-se apenas com renderização.

---

### 6. Feature First

Todo código específico do domínio deve permanecer dentro da própria feature.

Exemplo:

```
features/
    positions/
        components/
        actions/
        repositories/
        queries/
        schemas/
        types/
```

Evitar criar pastas globais para componentes exclusivos de uma única feature.

---

### 7. Refatoração incremental

A extração de componentes deve preservar integralmente o comportamento existente.

Mudanças estruturais não devem alterar regras de negócio.

---

## Consequências

### Positivas

- Componentes menores.
- Melhor reutilização.
- Navegação mais simples.
- Facilidade para testes.
- Crescimento sustentável do projeto.
- Menor acoplamento.

### Negativas

- Maior quantidade de arquivos.
- Necessidade de manter convenções consistentes.

---

## Aplicação

Este padrão passa a ser adotado para novos formulários do Evol OS.

Exemplos futuros:

- EmployeeForm
- DevelopmentPlanForm
- AssessmentForm
- FeedbackForm
- GoalForm

---

## Revisão

Esta ADR poderá ser revisada caso surjam necessidades diferentes durante a evolução da arquitetura.
