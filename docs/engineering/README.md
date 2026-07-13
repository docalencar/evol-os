# Engineering Foundation

## Objetivo

A pasta `docs/engineering` reúne os padrões operacionais utilizados para desenvolver o Evol OS.

Enquanto:

- `docs/architecture` descreve a arquitetura do sistema;
- `docs/adr` registra decisões arquiteturais permanentes;

esta pasta define **como a equipe desenvolve software no dia a dia**.

---

# Estrutura

## Guias

- ENGINEERING_GUIDE.md
- EVOL_ENGINEERING_PRINCIPLES.md

## Fluxo de desenvolvimento

- development-workflow.md

## Padrões

- frontend-standards.md
- backend-standards.md
- database-standards.md

## Qualidade

- testing-checklist.md
- pull-request-checklist.md

---

# Documentação relacionada

Arquitetura:

- ../architecture/ARCHITECTURE.md
- ../architecture/FRONTEND_ARCHITECTURE.md

ADRs:

- ../adr/0001-feature-architecture.md
- ../adr/0004-layer-responsibilities.md
- ../adr/0005-component-organization.md

Banco de dados:

- ../database/database_blueprint.md

---

# Como utilizar

Ao iniciar uma nova funcionalidade:

1. Consulte a arquitetura.
2. Verifique as ADRs relacionadas.
3. Siga os padrões definidos nesta pasta.
4. Utilize os Playbooks.
5. Abra uma PR pequena.
6. Execute o checklist antes do merge.

---

# Evolução

A Engineering Foundation evolui junto com o projeto.

Novos padrões devem ser registrados nesta pasta sempre que representarem uma convenção reutilizável para futuras implementações.
