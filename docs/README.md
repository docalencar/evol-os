# Evol OS — Documentação Oficial

Este diretório contém a documentação oficial de produto, arquitetura, engenharia, domínio, experiências e evolução da plataforma Evol OS.

O Evol OS evolui como uma plataforma organizacional capaz de representar a empresa, preservar seu histórico, projetar cenários, produzir inteligência e apoiar decisões.

## Hierarquia de decisão

```text
Vision
    ↓
Platform Blueprint
    ↓
Product and Experience Architecture
    ↓
Domain and Platform Architecture
    ↓
Architecture Decision Records
    ↓
Engineering Standards
    ↓
Playbooks
    ↓
Implementation
```

Documentos inferiores devem respeitar as decisões estabelecidas nos documentos superiores.

## Documentos fundamentais

### Visão e princípios

- [Visão](./VISION.md)
- [Visão de Produto](./Product/PRODUCT_VISION.md)
- [Manifesto](./Product/MANIFESTO.md)
- [Princípios de Produto](./PRODUCT_PRINCIPLES.md)
- [Princípios de Design](./Product/DESIGN_PRINCIPLES.md)
- [Glossário](./Product/GLOSSARY.md)

### Fundação da plataforma

- [Platform Blueprint](./PLATFORM_BLUEPRINT.md)
- [Mapa da Documentação](./DOCUMENTATION_MAP.md)
- [Fontes Canônicas](./CANONICAL_SOURCES.md)
- [Evolução do Monorepo](./MONOREPO_EVOLUTION.md)
- [Estratégia de ADRs](./ADR_STRATEGY.md)

### Arquitetura e execução

- [Arquitetura](./architecture/ARCHITECTURE.md)
- [ADRs](./adr/README.md)
- [Experiências](./experiences/README.md)
- [Engineering](./engineering/)
- [Playbooks](./playbooks/)
- [Roadmap](./roadmap/)

## Tipos de documento

- **Vision:** direção de longo prazo.
- **Platform Blueprint:** constituição estrutural.
- **Product:** problemas, usuários e valor.
- **Experience:** jornadas completas.
- **Architecture:** fronteiras, dependências e responsabilidades.
- **ADR:** decisão arquitetural específica.
- **Engineering Standard:** regra recorrente de implementação.
- **Playbook:** procedimento executável.
- **Roadmap:** sequência planejada de evolução.

## Regras de manutenção

1. Verificar a fonte canônica antes de criar um documento.
2. Não duplicar decisões.
3. Documentos secundários devem apontar para a fonte oficial.
4. Mudanças arquiteturais relevantes exigem ADR.
5. Documentos incompletos devem declarar `Planned`.
6. Código e documentação devem evoluir juntos quando contratos ou comportamentos mudarem.
7. Arquivos dentro de aplicações não substituem a documentação global em `docs/`.

## Status documentais

- **Canonical**
- **Accepted**
- **Active**
- **Draft**
- **Planned**
- **Deprecated**
- **Superseded**

## Ordem recomendada de leitura

1. `VISION.md`
2. `PLATFORM_BLUEPRINT.md`
3. `Product/PRODUCT_VISION.md`
4. `architecture/ARCHITECTURE.md`
5. `DOCUMENTATION_MAP.md`
6. `adr/README.md`

## Agentes de IA

Agentes devem ler fontes canônicas, preservar decisões aceitas, distinguir estado atual de direção futura e manter rastreabilidade entre visão, arquitetura, engenharia e código.
