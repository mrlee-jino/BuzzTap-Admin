do $$
declare
  function_definition text;
begin
  function_definition := pg_catalog.pg_get_functiondef(
    'public.admin_load_customer_bp(uuid,bigint,text,text,text)'::regprocedure
  );

  if pg_catalog.strpos(function_definition, 'p_customer_id::text') = 0 then
    raise notice 'admin_load_customer_bp has no p_customer_id::text cast; no change was needed';
    return;
  end if;

  function_definition := pg_catalog.replace(
    function_definition,
    'p_customer_id::text',
    'p_customer_id'
  );

  execute function_definition;
end
$$;

notify pgrst, 'reload schema';