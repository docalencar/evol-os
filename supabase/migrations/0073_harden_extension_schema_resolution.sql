-- Keep extension function resolution deterministic without widening the
-- SECURITY DEFINER search_path of save_approval_request.
do $migration$
declare
  v_function_definition text;
  v_unqualified_digest text := E'\n        digest(';
  v_qualified_digest text := E'\n        extensions.digest(';
begin
  select pg_get_functiondef(
    'public.save_approval_request(jsonb,jsonb,integer)'::regprocedure
  )
  into v_function_definition;

  if position(v_qualified_digest in v_function_definition) > 0 then
    return;
  end if;

  if position(v_unqualified_digest in v_function_definition) = 0 then
    raise exception
      'save_approval_request digest call does not match the expected definition';
  end if;

  v_function_definition := replace(
    v_function_definition,
    v_unqualified_digest,
    v_qualified_digest
  );

  execute v_function_definition;
end;
$migration$;
