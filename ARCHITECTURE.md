# Arquitetura do Evol OS

A documentação oficial está em `docs/`.

Detalhes vigentes:

- ADRs: `docs/adr/`;
- Organization Planning: `docs/Architecture/organization-planning.md`;
- Organization Sync: `docs/Architecture/organization-sync-engine.md`;
- padrões por camada: `docs/engineering/`;
- contratos locais complexos: README da própria feature.

Documentos marcados como históricos não definem a arquitetura atual.

## Fluxo das features

Supabase
→ Repository
→ Query
→ Presenter
→ ViewModel
→ Product Component
→ Feature Home
→ Page

## Princípios

- Vertical Slice.
- Pages sem lógica de negócio.
- Repositories isolam persistência.
- Engines não acessam banco.
- Presenters produzem ViewModels.
- PRs pequenas e build verde.
