# Arquitetura do Evol OS

A documentação oficial está em `docs/`.

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
