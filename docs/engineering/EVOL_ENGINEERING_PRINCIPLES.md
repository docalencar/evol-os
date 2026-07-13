# Evol Engineering Principles

## Objetivo

Este documento define os princípios que orientam todas as decisões de engenharia do Evol OS.

Antes de introduzir uma nova arquitetura, padrão ou tecnologia, verifique se ela está alinhada com estes princípios.

---

# 1. O domínio vem primeiro

A arquitetura deve servir ao domínio do negócio.

Nunca modelamos o negócio para se adaptar ao framework.

---

# 2. Simplicidade acima de sofisticação

Preferimos uma solução simples, previsível e fácil de manter.

Código fácil de entender é mais valioso do que código excessivamente inteligente.

---

# 3. Evolução incremental

Grandes mudanças devem ser divididas em pequenas entregas.

Cada PR deve gerar valor por si só.

---

# 4. Responsabilidade única

Cada camada possui apenas uma responsabilidade.

Exemplos:

- Components → interface
- Actions → escrita
- Queries → leitura
- Services → regras de negócio
- Repositories → acesso ao banco

---

# 5. Feature First

Todo código deve permanecer próximo do domínio ao qual pertence.

Evitar estruturas globais para código específico de uma única feature.

---

# 6. Build sempre verde

Nenhuma funcionalidade está concluída enquanto o projeto não compilar.

O build é parte da definição de pronto.

---

# 7. Refatoração com propósito

Refatorações devem resolver problemas reais.

Evitar mudanças estruturais apenas por preferência pessoal.

---

# 8. Reutilização consciente

Reutilizar quando houver ganho claro.

Evitar abstrações prematuras.

Duplicações pequenas são preferíveis a abstrações incorretas.

---

# 9. Documentação acompanha a evolução

Mudanças importantes devem atualizar a documentação correspondente:

- Architecture
- ADR
- Engineering
- Playbooks

A documentação faz parte da entrega.

---

# 10. Consistência acima de preferência

A consistência do projeto é mais importante do que preferências individuais.

Quando houver dúvida, seguir os padrões já adotados pelo Evol OS.

---

# Resumo

Toda decisão técnica deve buscar:

- Clareza
- Simplicidade
- Coesão
- Baixo acoplamento
- Evolução incremental
- Consistência
- Facilidade de manutenção

Esses princípios servem como base para a evolução sustentável do Evol OS.
