# Executive Context

Subdomínio responsável por resolver o contexto necessário para compor experiências executivas que dependem de outros domínios.

## Responsabilidades

- identificar a empresa do contexto atual;
- representar explicitamente o workspace de planejamento disponível;
- representar explicitamente o cenário de planejamento disponível;
- gerar timestamp usando `Clock` injetado;
- retornar warnings tipados quando algum contexto estiver ausente.

## Fluxo

```text
ExecutiveContextProvider
  -> ExecutiveContextService
  -> ExecutiveContextResolution
  