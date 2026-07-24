# Evol OS — Estratégia de Evolução do Monorepo

**Status:** Canonical

## Contexto

A principal aplicação está em `apps/web`. A maior parte do domínio e das regras ainda pode permanecer nela. A visão futura de Kernel e Engines não exige extração prematura.

## Princípio central

Código é extraído por evidência, não por expectativa.

Um pacote surge quando possui responsabilidade estável, contrato claro, reutilização real, independência técnica, testes e benefício justificável.

## Estrutura-alvo possível

```text
evol-os/
├── apps/
│   ├── web/
│   ├── mobile/
│   ├── api/
│   ├── worker/
│   └── cli/
├── packages/
│   ├── kernel/
│   ├── organization/
│   ├── projection/
│   ├── intelligence/
│   ├── decision/
│   ├── workflow/
│   ├── rules/
│   ├── events/
│   ├── sdk/
│   ├── ui/
│   ├── integrations/
│   └── testing/
├── tooling/
├── docs/
└── supabase/
```

Essa estrutura é direção, não obrigação imediata.

## Permanece em `apps/web`

Páginas, layouts, rotas, componentes específicos, Server Actions, sessão, cookies, cache, redirects, formulários, presenters e integrações diretas com o framework.

## Candidatos a `packages`

Tipos estáveis, entidades, value objects, regras determinísticas, serviços puros, Engines, eventos, políticas, algoritmos, SDKs e ferramentas compartilhadas.

## Não pertence ao Kernel

React, estilos, páginas, formulários, Server Actions, queries acopladas ao Supabase, rotas, hooks de UI, cache do Next.js e clientes concretos.

## Critérios de extração

1. Responsabilidade clara.
2. Contrato explícito.
3. Estabilidade.
4. Independência de UI e infraestrutura.
5. Testabilidade isolada.
6. Reutilização real.
7. Ownership.
8. Redução comprovada de acoplamento.

## Estratégia

1. Estabilizar localmente.
2. Remover dependências desnecessárias.
3. Definir contratos públicos.
4. Criar testes.
5. Extrair sem alterar comportamento.
6. Adicionar adaptadores.
7. Validar build, testes e dependências.
8. Atualizar documentação e ADR.

## Dependências desejadas

```text
apps
  ↓
capability packages
  ↓
engine packages
  ↓
kernel packages
```

O Kernel não importa aplicações. Engines não importam interfaces.

## Projection Engine

Permanece em `apps/web` enquanto houver apenas a web como consumidora e os contratos estiverem evoluindo.

Antes da extração: consolidar executores, estabilizar contratos, ampliar testes, remover dependências, registrar ADR e validar novos consumidores.

## Qualidade obrigatória

Um pacote novo deve possuir README, propósito, API pública, configuração, testes, lint, build, exports explícitos, owner e consumidores identificados.

## Decisão atual

- `apps/web` continua como principal espaço de implementação;
- features organizam o domínio localmente;
- Engines nascem isolados dentro da aplicação;
- `packages/` será introduzido incrementalmente;
- extrações relevantes exigem ADR.

## Princípio final

O monorepo cresce conforme fronteiras reais aparecem, sem antecipar todo o custo da arquitetura futura.
