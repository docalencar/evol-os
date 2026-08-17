# Evol OS — Próxima entrega

## MVP Closure PR I2 — People + Organization Core Mutation App Integration

### Objetivo

Integrar as páginas, Server Actions e repositories navegáveis de People,
Departments, Teams e Positions às trusted mutation boundaries da migration 0089.

### Estado confirmado

- PR H foi incorporada na baseline `7854120`;
- a auditoria de mutations classificou People e Organization core como P0;
- a migration 0089 entrega doze RPCs DB-first para create/update/archive;
- o ator e a matriz `owner/admin/hr` são validados no banco;
- referências tenant-owned falham fechadas;
- creates são idempotentes, archives determinísticos e Activity é atômica;
- encerrar uma Person desativa acesso vinculado conforme PD-019, sem apagar o
  vínculo histórico;
- grants DML continuam fechados e nenhum `service_role` participa do fluxo;
- 33 arquivos/1.129 testes DB e 961 testes web passam;
- páginas, Actions e repositories ainda não consomem as novas RPCs;
- Human Review permanece suspenso e o MVP continua em 98%.

### Gate atual — concluído nesta PR (I2)

A integração app das mutações core 0089 está entregue na baseline `e71abce`: as
doze Server Actions de People/Departments/Teams/Positions consomem um adapter
server-only RPC-only (`people-organization-mutations`), com `companyId`
server-derived, payload sem autoridade, sem DML direto protegido, sem Activity
duplicada e com erros públicos estáveis. `tsc`, `next lint` e 996 testes web
passam; a suíte DB não muda (sem migration nova).

### Próximo passo após aprovação

Executar smoke autenticado de create/update/archive em People e Organization
(incluindo os caminhos de erro: hierarchy cycle, last-owner/access conflict,
referência inválida). Human Review global só retoma depois desse smoke e dos gates
independentes.

Permanecem gates independentes: privacy de People/Development, participant email
de Assessment, hardening forward-only da timeline 0084 e writes P1/P2 dos demais
domínios.
