# ADR-001 — Organization Sync Engine

**Status:** Aceito

## Contexto

O Evol OS precisa acompanhar mudanças em pessoas, departamentos, times, cargos e gestores vindas de XLSX, CSV, APIs, ERPs ou alterações internas.

## Problema

A importação inicial aplica alterações diretamente, dificultando revisão, conflitos, auditoria, histórico e integrações futuras.

## Decisão

Criar um Organization Sync Engine independente de banco, interface e origem dos dados.

## Fluxo

Origem → Connector → Normalização → Snapshot → Compare → Classification → Sync Plan → Revisão humana → Apply → Timeline → Insights.

## Identidade das pessoas

O e-mail não é identificador principal.

Prioridade:

1. ID interno do Evol OS
2. Matrícula ou identificador externo
3. Documento oficial, quando adotado
4. Nome completo com atributos auxiliares
5. Revisão humana para ambiguidades

## Regras

- O Engine não acessa Supabase.
- O Engine não conhece CSV ou XLSX.
- Mudanças relevantes exigem plano prévio.
- Conflitos não são resolvidos silenciosamente.
- Ausência na fonte não significa exclusão automática.
- A IA explica e recomenda, mas não confirma ações sensíveis.

## Próximos passos

1. Comparar departamentos.
2. Comparar times.
3. Comparar cargos.
4. Resolver identidades.
5. Comparar pessoas.
6. Gerar e aplicar o Sync Plan.
