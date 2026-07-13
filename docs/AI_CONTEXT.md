# AI_CONTEXT.md
## Evol People

Versão: 1.0

## Identidade
Nome da empresa: Evol People  
Produto atual: Evol Performance MVP

A Evol People é uma plataforma de desenvolvimento de liderança e performance. Não é um sistema tradicional de RH.

## Missão
Ajudar gestores a desenvolver pessoas através de tecnologia simples, inteligência artificial e uma metodologia própria.

## Problemas principais
- Turnover elevado
- Lideranças despreparadas
- Feedbacks inexistentes ou ruins
- Processos dependentes de pessoas
- PDIs esquecidos
- Promoções sem critérios claros

## Cliente ideal
Empresas brasileiras com 20 a 300 colaboradores.

Usuários principais:
- Gestores
- RH
- Diretores
- Colaboradores

## Filosofia
O protagonista da plataforma é o gestor.  
O RH configura.  
O gestor desenvolve.  
O colaborador evolui.  
O diretor acompanha.

## Princípios
1. Simplicidade acima de tudo.
2. Toda tela deve indicar o próximo passo.
3. Nenhuma tarefa importante deve levar mais de cinco minutos.
4. A IA auxilia, mas não decide.
5. O sistema deve ensinar liderança.
6. Todo dado deve gerar uma ação.
7. Nenhuma tela deve ficar vazia.

## MVP
Capabilities:
- Organização
- Pessoas
- Avaliações
- Feedbacks
- PDI
- Dashboard
- IA contextual

Fora do MVP:
- Folha
- Ponto
- Benefícios
- Medicina ocupacional
- Recrutamento completo
- OKRs
- Pesquisa de clima
- LMS completo


## Position Form Architecture

- O `PositionForm` passou a seguir o padrão de componentes em diretório (`components/position-form/`).
- O `index.tsx` é o ponto de entrada do formulário.
- Formulários grandes devem ser divididos em seções por responsabilidade.
- Tipos compartilhados permanecem em `types.ts`.
- Opções de selects permanecem em `position-form-options.ts`.
- O componente principal atua apenas como orquestrador da submissão e composição das seções.


## Engineering Decisions (Jul/2026)

### Position Form Architecture

- PositionForm passou a seguir o padrão de componentes em diretório (`components/position-form/`).
- O `index.tsx` atua como ponto de entrada.
- Formulários grandes devem ser divididos em seções.
- Tipos compartilhados permanecem em `types.ts`.
- Opções de domínio permanecem em `position-form-options.ts`.
- O componente principal apenas orquestra submissão e composição das seções.

### Development Workflow

O fluxo oficial do Evol OS passa a ser:

1. Modelagem do domínio
2. Arquitetura (quando necessário)
3. Persistência
4. Interface
5. Build verde
6. Testes funcionais
7. Documentação
8. Commit
9. Push