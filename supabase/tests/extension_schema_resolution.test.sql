begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select plan(4);

select ok(
  to_regprocedure('extensions.plan(integer)') is not null,
  'pgTAP is installed in the extensions schema'
);

select ok(
  to_regprocedure('extensions.digest(text,text)') is not null,
  'pgcrypto digest is installed in the extensions schema'
);

select ok(
  position(
    'extensions.digest('
    in pg_get_functiondef(
      'public.save_approval_request(jsonb,jsonb,integer)'::regprocedure
    )
  ) > 0,
  'save_approval_request qualifies the pgcrypto digest call'
);

select is(
  (
    select array_to_string(proconfig, ',')
    from pg_proc
    where oid =
      'public.save_approval_request(jsonb,jsonb,integer)'::regprocedure
  ),
  'search_path=public, pg_temp',
  'save_approval_request preserves its restricted search_path'
);

select * from finish();
rollback;
