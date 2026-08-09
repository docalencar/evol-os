# Evol OS — Próxima entrega

## Revisão e aprovação da Phase 4 do MVP-PR1

### Objetivo

Revisar o escopo residual da Phase 4 — Application Layer — do MVP-PR1 Tenant
Multiuser Activation e submetê-lo à autorização explícita do Product Architect.
Esta etapa não autoriza implementação automaticamente.

### Estado confirmado

- PR 3C concluída historicamente no merge `5c2675b`; não é mais o gate ativo;
- Phase 1 do MVP-PR1 concluída e incorporada pela migration 0070;
- Phase 2 concluída e incorporada pelas migrations 0071/0072 e merge `dbf592c`;
- novo projeto Supabase canônico reconstruído exclusivamente por `0001`–`0073`;
- migration history Local/Remote alinhado;
- projeto antigo divergente removido da posição de autoridade canônica;
- hardening 0073 incorporado em `f77b229`, com `extensions.digest(...)` em
  `save_approval_request`;
- fresh reset local aprovado e pgTAP local 312/312;
- validação remota direcionada da 0073 aprovada;
- pgTAP remoto completo inconclusivo por privilégios da role técnica
  `cli_login_postgres`, sem regressão funcional confirmada e sem grant permanente;
- Phase 3 concluída e incorporada à `main` pelo merge `3559a9b`;
- migration 0074 aplicada ao projeto canônico e alinhada Local/Remote;
- sete RPCs v1 `SECURITY DEFINER`, com `search_path = public, pg_temp`, owner
  PostgreSQL e `EXECUTE` funcional somente para `authenticated`;
- ator humano derivado exclusivamente de `auth.uid()`, sem `actorUserId` em
  intenção pública e sem `service_role` no caminho funcional;
- serviço mínimo de aplicação, port, adapter autenticado e Composition Root
  server-only incorporados, ainda sem consumidor funcional;
- fresh reset `0001`–`0074`, pgTAP local 362/362, Tenant Access 50/50, testes
  TypeScript 8/8, regressões relevantes 18/18, DB lint local, TypeScript, lint,
  build e concorrência aprovados;
- quatro warnings de lint preexistentes e limitação remota de pgTAP/lint por
  `extensions`/`cli_login_postgres`, sem regressão da 0074 e sem grant permanente;
- Phase 4 não iniciada nem autorizada.

### Gate atual

Revisar o recorte da Phase 4 registrado no
[Implementation Plan do MVP-PR1](./Execution/MVP-PR1-TENANT-MULTIUSER-ACTIVATION-IMPLEMENTATION-PLAN.md)
contra a fundação mínima já entregue na Phase 3, identificar somente trabalho
residual sem duplicação e obter a decisão explícita do Product Architect.

Estado:

**Phase 3 complete — Phase 4 scope review awaiting explicit Product Architect approval.**

### Regra de parada

- não iniciar a Phase 4 sem aprovação explícita;
- não duplicar o serviço, port, adapter ou Composition Root já incorporados;
- não criar automaticamente migration, RPC, grant, RLS, Auth integration,
  Action ou UI;
- preservar a separação `ACTOR != EXECUTOR`, menor privilégio e fail closed;
- não conceder privilégio permanente à role `cli_login_postgres` para contornar
  limitações do runner remoto.
