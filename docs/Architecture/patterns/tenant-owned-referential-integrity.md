# Tenant-Owned Referential Integrity Pattern

## Objetivo

Aplicar ADR-0012 em novos schemas e em hardenings incrementais sem repetir a
decisão arquitetural. A ADR define a política; este padrão descreve o procedimento.

## 1. Classifique antes de modelar

Para cada tabela, registre uma categoria:

| Categoria | `company_id` | Garantia principal |
| --- | --- | --- |
| Global Entity | nunca | PK/FK global e acesso de plataforma |
| Tenant-Owned Root | `not null` | FK Company + `unique (id, company_id)` |
| Tenant-Owned Child | `not null` | FK composta para o pai |
| Derived Entity | não | FK obrigatória para um único pai |
| Polymorphic Entity | quando tenant-scoped | discriminator + registry + constraint trigger |
| System Entity | somente se a operação for tenant-scoped | contrato técnico explícito |

Se houver dúvida entre Child e Derived, use Child. Derivação exige prova de pai
único, obrigatório, imutável e sem referências tenant-owned independentes.

## 2. Modele a identidade tenant-owned

O target mantém a PK UUID existente e acrescenta a chave candidata canônica:

```sql
alter table public.target_table
  add constraint target_table_id_company_key
  unique (id, company_id);
```

A origem referencia ID e tenant na mesma ordem:

```sql
alter table public.source_table
  add constraint source_table_target_company_fk
  foreign key (target_id, company_id)
  references public.target_table(id, company_id)
  on delete restrict
  not valid;
```

O `ON DELETE` do exemplo não é default universal. Preserve a semântica já aprovada
do relacionamento.

Para autorreferência:

```sql
foreign key (parent_id, company_id)
  references public.same_table(id, company_id)
```

## 3. Faça o preflight

Toda migration começa detectando violações e abortando com erro estável:

```sql
do $$
begin
  if exists (
    select 1
    from public.source_table source
    join public.target_table target on target.id = source.target_id
    where source.target_id is not null
      and source.company_id <> target.company_id
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_SOURCE_TARGET';
  end if;
end
$$;
```

O preflight real também verifica órfãos, duplicidades, nulos e scopes híbridos.
Não atualize nem apague registros para fazê-lo passar.

## 4. Crie somente índices necessários

- unique `(id, company_id)` no target;
- índice na origem iniciando pela coluna usada nos joins da FK, quando não houver
  equivalente;
- índice tenant-first separado para consultas comprovadas.

```sql
create index source_table_company_target_idx
  on public.source_table(company_id, target_id);
```

Não trate a unique de identidade como substituta do índice de consulta.

## 5. Faça rollout incremental

1. preflight;
2. unique do target;
3. índices da origem;
4. FK composta `not valid`, quando suportado;
5. `validate constraint`;
6. remover FK simples substituída;
7. executar pgTAP adversarial;
8. seguir para o próximo agregado.

Uma migration deve ter um objetivo e um recorte revisável. Prefira:

```text
Organization roots → People relations → Competency relations
→ Assessment → Development → Feedback → Recruitment
```

Não misture correção de autorização, mudança de cascade ou regra funcional.

## 6. Trate casos especiais

### Derived Entity

Não replique `company_id` quando o filho possuir um único pai obrigatório e não
tiver vida, autorização ou referências independentes. Policies e queries derivam
o tenant pelo pai. Se uma segunda raiz for introduzida, promova-o a Child.

### Global ou company-owned

Use `scope` explícito e um `CHECK` que relacione scope e `company_id`. Uma
referência tenant-owned só pode apontar para linha global ou da mesma empresa.
Prefira tabelas/associações tipadas; use constraint trigger se a alternativa não
puder ser expressa declarativamente.

### Polimorfismo

Prefira colunas ou tabelas de associação tipadas. Para legado:

- `CHECK` fecha discriminadores;
- registry mapeia tipo para target;
- constraint trigger valida existência e empresa;
- `search_path` é fixo;
- tipo não registrado falha fechado.

### Nullable

Mantenha `related_id` nullable quando esse for o contrato atual. Valor não nulo
sempre participa da FK composta; `company_id` da linha não se torna nullable.

## 7. Divida responsabilidades

| Camada | Responsabilidade |
| --- | --- |
| Banco | existência, tenant, FK, unique, check e cascade |
| RLS | autorização de operação sobre linhas |
| Application | derivar tenant e orquestrar o caso de uso |
| Service | invariantes funcionais aprovadas |
| Repository | persistência e mapping, sem decidir ownership |

Uma policy que compara `company_id` não corrige uma FK simples. Uma validação de
Service não protege contra RPC, SQL técnico ou outro caminho de escrita.

## 8. Teste a garantia

O pgTAP mínimo cobre:

- mesma relação no mesmo tenant: permitida;
- mesmo ID relacionado em tenant diferente: rejeitado pelo banco;
- escrita como usuário autenticado e como papel técnico;
- relação nullable;
- autorreferência;
- `ON DELETE` preservado;
- preflight diante de fixture inválida;
- tipo global/híbrido/polimórfico, quando existir no recorte.

Rode também toda a suíte de banco, porque novas candidate keys e cascades afetam
consumidores indiretos.

## 9. Checklist de review

- classificação de cada tabela está explícita;
- nenhuma relação tenant-owned depende apenas de `id`;
- target possui `unique (id, company_id)`;
- FK usa `(related_id, company_id)`;
- preflight não repara dados;
- índices não são redundantes;
- nullability e `ON DELETE` foram preservados;
- RLS não foi confundida com integridade;
- Application não aceita tenant do cliente como autoridade;
- migration aplicada não foi editada;
- rollback é compensatório;
- testes adversariais comprovam a constraint.

## Referências

- ADR-0012;
- `docs/engineering/database-standards.md`;
- `docs/playbooks/05-add-database-change.md`;
- precedentes: Approval, Planning, KPI e Notifications.
