# Engineering Guide

## Objetivo

Este documento define o padrão oficial de desenvolvimento do Evol OS.

Ele descreve como novas funcionalidades devem ser projetadas, implementadas, testadas e entregues.

Toda implementação deve seguir estas diretrizes.

---

# Filosofia

O Evol OS prioriza:

- simplicidade;
- previsibilidade;
- baixo acoplamento;
- alta coesão;
- evolução incremental;
- build sempre verde.

Preferimos uma solução simples e consistente a uma solução extremamente sofisticada.

---

# Fluxo oficial

Toda funcionalidade segue obrigatoriamente a sequência:

1. Modelagem do domínio
2. Arquitetura (quando necessária)
3. Persistência
4. Interface
5. Build
6. Testes funcionais
7. Documentação
8. Commit
9. Push

Nenhuma etapa deve ser ignorada.

---

# Estratégia de desenvolvimento

- Trabalhar em PRs pequenas.
- Evitar grandes refatorações junto com novas funcionalidades.
- Manter o projeto compilando durante toda a implementação.
- Fazer alterações incrementais.
- Validar cada etapa antes de seguir para a próxima.

---

# Arquitetura

O projeto utiliza:

- Vertical Slice Architecture
- Feature First
- Repository → Query → Action → UI
- Services para regras de negócio

A separação de responsabilidades está documentada nas ADRs.

---

# Organização das Features

Cada feature deve possuir, quando aplicável:

```text
feature/
├── actions/
├── components/
├── constants/
├── queries/
├── repositories/
├── schemas/
├── services/
├── types/
└── index.ts
```

Nem toda feature precisa conter todas as pastas, mas a organização deve permanecer consistente.

---

# Build

Após qualquer alteração relevante:

```bash
npm run build
```

A implementação só é considerada concluída quando o build estiver verde.

---

# Testes

Sempre validar:

- criação;
- edição;
- leitura;
- exclusão ou arquivamento (quando existir);
- persistência;
- navegação;
- estados vazios;
- mensagens de erro.

---

# Documentação

Mudanças arquiteturais:

→ ADR

Mudanças operacionais:

→ Engineering

Fluxos reutilizáveis:

→ Playbooks

---

# Revisão de Código

Antes do commit:

- revisar o `git diff`;
- remover código morto;
- remover imports não utilizados;
- conferir nomes;
- validar mensagens;
- confirmar ausência de arquivos temporários.

---

# Objetivo

Este guia deve permanecer pequeno.

Ele serve como referência principal para toda a engenharia do Evol OS.

Os detalhes ficam distribuídos nos documentos específicos da pasta `engineering`.