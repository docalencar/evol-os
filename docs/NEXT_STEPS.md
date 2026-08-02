# Evol OS — Próxima entrega

## Hardening de acesso às notificações

### Objetivo

Definir policies para as tabelas de Notifications e corrigir o diretório de
destinatários para usar a entidade `people` existente.

### Vínculo

- Roadmap: Fundação confiável, item 1.
- MVP Plan: Fundação, operação segura dos dados.
- Épico: Fundação e Governança de Dados.
- Evidência: `HCOS_DOMAIN_AUDIT.md` (HCOS-009), migration
  `0034_create_notifications_foundation.sql` e recipient directory atual.

### Critérios objetivos de aceite

- matriz de acesso de Notifications definida antes da migration;
- todas as tabelas de Notifications possuem policies explícitas;
- isolamento por `company_id` é obrigatório;
- o destinatário acessa somente as próprias notificações e preferências;
- operações administrativas recebem apenas o acesso aprovado pelo produto;
- recipient directory usa `people` e não consulta entidade inexistente;
- testes adversariais cobrem acesso permitido e negado;
- migration, testes, TypeScript, lint e build passam;
- documentação de segurança e do domínio é atualizada.

### Fora de escopo

- criar novos canais ou tipos de notificação;
- alterar Activity ou outbox;
- alterar outros domínios sensíveis;
- adicionar novas funcionalidades.

## Débito técnico conhecido — validação global

Este registro não altera a prioridade operacional acima.

- desacoplar o teste `create-employee-intelligence.test.ts` dos barrels que
  carregam `server-only`, preservando a execução pelo runner `tsx`;
- corrigir a resolução de `digest` em `save_approval_request`, definida na
  migration `0046_create_approval_foundation.sql`, e tornar
  `supabase db lint --local` integralmente limpo.

Critério de conclusão: a suíte TypeScript completa e o lint local do banco passam
sem dispensas.
