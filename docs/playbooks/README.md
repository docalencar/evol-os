# Evol OS Playbooks

## Objetivo

Os Playbooks descrevem como implementar funcionalidades no Evol OS seguindo os padrões oficiais de engenharia.

Enquanto a documentação da pasta `engineering` explica **os princípios e padrões**, os Playbooks mostram **como executar uma tarefa específica**, passo a passo.

Eles funcionam como receitas reutilizáveis para desenvolvimento.

---

# Estrutura

Os Playbooks disponíveis são:

- create-feature.md
- create-crud.md
- create-form.md
- create-server-action.md
- create-repository.md
- create-page.md

Cada Playbook apresenta:

- quando utilizar;
- pré-requisitos;
- sequência recomendada;
- arquivos normalmente envolvidos;
- checklist de conclusão;
- erros comuns.

---

# Fluxo recomendado

Sempre que iniciar uma nova funcionalidade:

1. Consulte o `ENGINEERING_GUIDE.md`.
2. Revise as ADRs relacionadas.
3. Escolha o Playbook adequado.
4. Siga as etapas propostas.
5. Atualize a documentação, quando necessário.
6. Abra uma PR pequena.

---

# Filosofia

Os Playbooks não substituem a experiência da equipe.

Eles reduzem variabilidade, evitam esquecimentos e tornam o desenvolvimento mais previsível.

Sempre que um padrão recorrente surgir no projeto, um novo Playbook deve ser criado ou atualizado.
