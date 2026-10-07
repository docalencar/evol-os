-- F-GATE1 — repo-wide sweep: every tenant-owned FK must be composite (ADR-0012).
--
-- WHY A SWEEP AND NOT ANOTHER PER-TABLE SUITE
--
-- ADR-0012 has been applied in four slices (0064 Organization/People/Competencies,
-- 0065 Recruitment, 0066 operational Development, 0128 Feedback), each with its
-- own pgTAP suite asserting its own tables. Nothing asks the question globally,
-- so a table nobody listed is silently compliant: it passes every suite because
-- no suite mentions it. This file asks the catalog instead of a list.
--
-- THE RULE IS DERIVED, NOT INVENTED
--
-- ADR-0012 §"FK composta": mandatory when source and target are both
-- Tenant-Owned (Root or Child). §"FK simples": permitted ONLY for
--
--   1. company_id references companies(id)
--   2. Tenant-Owned → Global Entity
--   3. reference to a global System Entity, such as auth.users(id)
--   4. Derived Entity → parent, when the child has no company_id
--
-- Every one of those four is characterized by ONE SIDE HAVING NO company_id:
-- `companies` has none; a Global Entity "não possui company_id" (§Global
-- Entity); `auth.users` is in another schema; and case 4 is explicitly
-- conditioned on the child lacking company_id. So the operational test for
-- "tenant-owned" that the ADR itself gives — company_id present — makes the
-- whole exception list fall out of the rule. This suite therefore carries NO
-- hand-written allow-list, and cannot be weakened by quietly adding a name to
-- one.
--
-- Column ORDER is deliberately not asserted. ADR-0012 states that pre-existing
-- composite constraints in a different column order remain valid and are not
-- rewritten for uniformity, so the invariant is membership of company_id in both
-- key lists, never a position.
--
-- This suite ASSERTS THE CONTRACT, not the current state. It is expected to fail
-- today: F-P0 found the Assessment execution chain, two Feedback child tables
-- and development_template_actions still carrying single-column FKs to
-- tenant-owned roots. A legitimate RED is the point — it is the before half of
-- the proof for the slice that fixes them. Do not add exceptions to turn it
-- green.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

-- ---------------------------------------------------------------------------
-- Catalog views. `company_id` present is the ADR's own operational test for
-- tenant ownership, applied to both sides of every FK in `public`.
-- ---------------------------------------------------------------------------
create temporary view f_gate1_tenant_owned as
select c.oid, c.relname, a.attnum as company_attnum, a.attnotnull as company_required
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid
                     and a.attname = 'company_id'
                     and a.attnum > 0
                     and not a.attisdropped
 where n.nspname = 'public'
   and c.relkind = 'r';

create temporary view f_gate1_fk as
select con.conname,
       src.relname as source_table,
       tgt.relname as target_table,
       con.conkey,
       con.confkey,
       src_owned.company_attnum as source_company_attnum,
       tgt_owned.company_attnum as target_company_attnum
  from pg_constraint con
  join pg_class src on src.oid = con.conrelid
  join pg_namespace sn on sn.oid = src.relnamespace
  join pg_class tgt on tgt.oid = con.confrelid
  join f_gate1_tenant_owned src_owned on src_owned.oid = con.conrelid
  join f_gate1_tenant_owned tgt_owned on tgt_owned.oid = con.confrelid
 where con.contype = 'f'
   and sn.nspname = 'public';

-- A tenant-owned→tenant-owned FK is compliant when company_id participates on
-- BOTH sides. Anything else makes a cross-tenant row physically insertable.
create temporary view f_gate1_violation as
select conname, source_table, target_table
  from f_gate1_fk
 where not (source_company_attnum = any(conkey) and target_company_attnum = any(confkey))
 order by source_table, conname;

-- ---------------------------------------------------------------------------
-- The sweep is real: it must see FKs at all, and must see the slices that are
-- already compliant. A sweep that matches nothing would pass vacuously, which
-- is the failure mode this whole gate exists to prevent.
-- ---------------------------------------------------------------------------
select cmp_ok((select count(*) from f_gate1_fk), '>', 0::bigint,
  'the sweep observes tenant-owned FOREIGN KEY constraints');

-- Regression is asserted PER CONSTRAINT, not per table.
--
-- The first version of this suite asserted "these TABLES have zero violations"
-- for each hardened slice, and 0066 and 0128 went red. Both were this suite
-- overclaiming, not a regression:
--
--   * 0066 hardened five constraints on the Development aggregate. It never
--     touched `development_plans.template_id`, added by 0011:5-8 as a
--     single-column nullable FK to `development_templates`.
--   * 0128 hardened seven Feedback constraints. It never touched the legacy
--     origin columns `feedback_threads.assessment_id`/`.development_plan_id`/
--     `.competency_id`, declared simple at 0043:36,40,44.
--
-- A slice is only answerable for what it created. Naming the constraints keeps
-- the regression check honest and leaves the untouched FKs where they belong —
-- in the unfiltered contract assertion below, as debt.
-- The expected set is held once, as data, and compared by DIFFERENCE rather
-- than by count. The first version asserted `count = 32` and went red saying
-- only that — it could not name what was missing, so the cause had to be
-- reconstructed by hand from the migration history. A gate that cannot print
-- its own evidence is a defect in itself.
create temporary view f_gate1_expected_constraint as
select unnest(array[
        -- 0064 Organization / People / Competencies
        'people_manager_company_fkey','people_position_company_fkey','people_team_company_fkey',
        'departments_manager_company_fkey','departments_parent_department_company_fkey',
        'teams_department_company_fkey','teams_manager_company_fkey','teams_parent_team_company_fkey',
        'positions_department_company_fkey',
        -- 0064 also hardened position_competencies_{competency,position}_company_fkey.
        -- Both are deliberately ABSENT from this list: 0125:69 retired the whole
        -- `position_competencies` table (canonical Position expectations moved to
        -- `position_seniority_competencies`, and the retirement is terminal — no
        -- later migration recreates it), so the constraints went with it. Their
        -- absence is the intended end state of the canonical history, not a
        -- regression. This is what the original `count = 32` assertion was
        -- actually reporting.
        'position_requirements_position_company_fkey',
        'employee_competencies_competency_company_fkey','employee_competencies_employee_company_fkey',
        -- 0065 Recruitment
        'recruitment_job_openings_approver_company_fkey','recruitment_job_openings_department_company_fkey',
        'recruitment_job_openings_position_company_fkey','recruitment_job_openings_recruiter_company_fkey',
        'recruitment_job_openings_replaced_employee_company_fkey',
        'recruitment_job_openings_requesting_manager_company_fkey',
        -- 0066 operational Development
        'development_actions_goal_company_fkey','development_goals_competency_company_fkey',
        'development_goals_plan_company_fkey','development_plans_employee_company_fkey',
        'development_plans_owner_company_fkey',
        -- 0128 Feedback
        'feedback_acknowledgements_employee_company_fkey','feedback_acknowledgements_thread_company_fkey',
        'feedback_messages_author_company_fkey','feedback_messages_thread_company_fkey',
        'feedback_threads_assessment_response_company_fkey',
        'feedback_threads_receiver_company_fkey','feedback_threads_sender_company_fkey']) as conname;

create temporary view f_gate1_missing_constraint as
select e.conname
  from f_gate1_expected_constraint e
 where not exists (
   select 1 from pg_constraint con
     join pg_class src on src.oid = con.conrelid
     join pg_namespace n on n.oid = src.relnamespace
    where n.nspname = 'public' and con.contype = 'f' and con.conname = e.conname)
 order by e.conname;

select is(
  (select count(*) from f_gate1_missing_constraint),
  0::bigint,
  'every constraint created by the 0064/0065/0066/0128 slices is still present — missing: ' ||
  coalesce((select string_agg(conname, ', ') from f_gate1_missing_constraint), '<none>'));

-- The expected set must not silently shrink either: a name quietly deleted from
-- the list above would make the assertion pass for the wrong reason.
select is((select count(*) from f_gate1_expected_constraint), 30::bigint,
  'the expected set is the 30 surviving slice constraints (32 created, 2 retired with position_competencies by 0125)');

select is(
  (select count(*) from f_gate1_violation
    where conname like '%_company_fkey'),
  0::bigint,
  'no constraint created by a hardening slice has regressed to single-column');

-- ---------------------------------------------------------------------------
-- THE CONTRACT. Expected RED today; the diagnostic names every offender so the
-- correction slice has a precise worklist instead of a prose summary.
-- ---------------------------------------------------------------------------
select is(
  (select count(*) from f_gate1_violation),
  0::bigint,
  'ADR-0012: every tenant-owned FK is composite — offenders: ' ||
  coalesce((select string_agg(source_table || '.' || conname || ' -> ' || target_table, ', ')
              from f_gate1_violation), '<none>'));

-- ---------------------------------------------------------------------------
-- Census, not verdict. ADR-0012 §Global Entity warns that `company_id is null`
-- alone does not prove global ownership: a hybrid table needs a discriminator
-- and explicit constraints. Classifying those is a product/architecture
-- decision, so this gate REPORTS them and judges none of them. Folding them
-- into the verdict would be inventing policy.
-- ---------------------------------------------------------------------------
select ok(true,
  'census — tenant-owned tables with NULLABLE company_id (hybrid): ' ||
  coalesce((select string_agg(relname, ', ' order by relname)
              from f_gate1_tenant_owned where not company_required), '<none>'));

-- Classification of each offender, so the correction slice does not have to
-- guess and nobody has to take my word for which are real.
--
-- The discriminator is mechanical, not editorial: ADR-0012 marks a Tenant-Owned
-- Root by the candidate key `unique (id, company_id)`. A target that HAS it can
-- receive a composite FK today — the offender is plain debt. A target that LACKS
-- it cannot, so the correction must add the candidate key first; reporting those
-- separately prevents a slice from being planned against an impossible step.
--
-- A nullable company_id on either side does NOT excuse the offender. Precedent
-- 0067:207,223 already builds a composite FK into `development_templates`, whose
-- company_id is nullable by the hybrid check at 0009:40 — so the project has
-- already decided that a hybrid target still takes a composite FK.
select ok(true, 'census — offenders whose target HAS unique(id, company_id) (plain debt): ' ||
  coalesce((select string_agg(v.source_table || '.' || v.conname, ', ' order by v.source_table, v.conname)
    from f_gate1_violation v
   where exists (
     select 1 from pg_constraint u
       join pg_class t on t.oid = u.conrelid
      where t.relname = v.target_table and u.contype = 'u'
        and (select count(*) from unnest(u.conkey)) = 2
        and exists (select 1 from pg_attribute a
                     where a.attrelid = u.conrelid and a.attname = 'company_id'
                       and a.attnum = any(u.conkey))
        and exists (select 1 from pg_attribute a
                     where a.attrelid = u.conrelid and a.attname = 'id'
                       and a.attnum = any(u.conkey)))), '<none>'));

select ok(true, 'census — offenders whose target LACKS unique(id, company_id) (candidate key needed first): ' ||
  coalesce((select string_agg(v.source_table || '.' || v.conname || ' -> ' || v.target_table, ', '
                              order by v.source_table, v.conname)
    from f_gate1_violation v
   where not exists (
     select 1 from pg_constraint u
       join pg_class t on t.oid = u.conrelid
      where t.relname = v.target_table and u.contype = 'u'
        and (select count(*) from unnest(u.conkey)) = 2
        and exists (select 1 from pg_attribute a
                     where a.attrelid = u.conrelid and a.attname = 'company_id'
                       and a.attnum = any(u.conkey))
        and exists (select 1 from pg_attribute a
                     where a.attrelid = u.conrelid and a.attname = 'id'
                       and a.attnum = any(u.conkey)))), '<none>'));

select ok(true, 'census — offenders with a NULLABLE company_id on either side: ' ||
  coalesce((select string_agg(v.source_table || '.' || v.conname, ', ' order by v.source_table, v.conname)
    from f_gate1_violation v
    join f_gate1_tenant_owned s on s.relname = v.source_table
    join f_gate1_tenant_owned t on t.relname = v.target_table
   where not s.company_required or not t.company_required), '<none>'));

select ok(true,
  'census — FKs from a tenant-owned table to a table without company_id (ADR-0012 permits simple here): ' ||
  coalesce((select count(*)::text from pg_constraint con
              join pg_class src on src.oid = con.conrelid
              join pg_namespace sn on sn.oid = src.relnamespace
              join f_gate1_tenant_owned o on o.oid = con.conrelid
             where con.contype = 'f' and sn.nspname = 'public'
               and con.confrelid not in (select oid from f_gate1_tenant_owned)), '0'));

select * from finish();
rollback;
