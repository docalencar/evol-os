# Evol OS — Próxima entrega

## Discovery e autorização da Phase 5 do MVP-PR1

### Objetivo

Preparar o gate de autorização da Phase 5 — Invitation issuance, revocation &
resend — do MVP-PR1 Tenant Multiuser Activation. Nenhuma implementação está
autorizada automaticamente.

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
- Phase 4 encerrada como **Complete by Prior Delivery**, sem execução autônoma ou
  implementação adicional;
- nenhuma segunda Application Layer deve ser criada;
- nenhum consumer funcional, token utility, Delivery Port, provider adapter ou
  Action de convite foi implementado;
- Phase 5 não iniciada nem autorizada.

### Gate atual

Antes de qualquer implementação da Phase 5:

1. obter autorização explícita do Product Architect;
2. confirmar token lifecycle server-only;
3. selecionar humanamente o provider de e-mail antes do adapter real;
4. confirmar secret management;
5. confirmar domínio e remetente;
6. confirmar URL base e redirects permitidos dos links de convite;
7. confirmar timeout, retry e idempotência mínimos do provider.

O primeiro slice futuro esperado é o Block B — Token utility: geração segura de
no mínimo 256 bits, base64url, SHA-256, persistência exclusiva do digest e raw
token restrito a boundaries server-only. Depois vem o Block C — Delivery
boundary. Nenhum dos dois está autorizado por este documento.

Estado:

**Phase 4 complete by prior delivery — Phase 5 not started and awaiting explicit authorization.**

### Regra de parada

- não iniciar a Phase 5 sem aprovação explícita;
- não escolher provider nem implementar token utility, Delivery Port, adapter ou
  Actions neste gate;
- não duplicar o serviço, port, adapter de persistence ou Composition Root já
  incorporados;
- manter acceptance/Auth na Phase 6 e tenant resolution/selection na Phase 7;
- preservar a separação `ACTOR != EXECUTOR`, menor privilégio e fail closed;
- não conceder privilégio permanente à role `cli_login_postgres` para contornar
  limitações do runner remoto.
