# Evol OS — Próxima entrega

## Hardening de acesso às avaliações

### Objetivo

Impedir que um membro da empresa leia ou altere respostas e respostas detalhadas
de avaliações sem ser um ator autorizado pelo domínio.

### Vínculo

- Roadmap: Fundação confiável, item 1.
- MVP Plan: Fundação, autorização de dados sensíveis.
- Épico: Avaliações e Performance.
- Evidência: `HCOS_DOMAIN_AUDIT.md` (HCOS-003) e policies atuais da migration
  `0028_align_assessment_execution.sql`.

### Critérios objetivos de aceite

- matriz de acesso por papel e participação definida antes da migration;
- evaluator acessa somente as respostas que lhe pertencem;
- acesso do avaliado respeita estado e regra de visibilidade definidos;
- owner/admin/hr recebem apenas o acesso explicitamente aprovado pelo produto;
- usuários não relacionados não leem nem alteram responses ou answers;
- isolamento por `company_id` permanece obrigatório;
- actions validam o ator além de depender da RLS;
- testes adversariais cobrem leitura e escrita permitidas e negadas;
- migration, testes, TypeScript, lint e build passam;
- documentação de segurança e do domínio é atualizada.

### Fora de escopo

- mudar cálculo, interface ou fluxo das avaliações;
- criar anonimização nova sem decisão de produto;
- alterar outros domínios sensíveis;
- adicionar novas funcionalidades.
