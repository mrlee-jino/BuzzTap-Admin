do $$
declare
  constraint_name text;
  constraint_definition text;
  check_expression text;
begin
  select constraint_row.conname,
         pg_catalog.pg_get_constraintdef(constraint_row.oid)
  into constraint_name, constraint_definition
  from pg_catalog.pg_constraint as constraint_row
  where constraint_row.conrelid = 'public.transactions'::regclass
    and constraint_row.conname = 'transactions_transaction_type_check'
    and constraint_row.contype = 'c';

  if constraint_definition is null then
    raise exception 'Could not find the transactions_transaction_type_check constraint';
  end if;

  if pg_catalog.strpos(constraint_definition, 'CUSTOMER_LOAD') > 0 then
    return;
  end if;

  if pg_catalog.left(constraint_definition, 7) <> 'CHECK ('
     or pg_catalog.right(constraint_definition, 1) <> ')' then
    raise exception 'Unexpected transaction type constraint definition: %', constraint_definition;
  end if;

  check_expression := pg_catalog.substring(
    constraint_definition,
    8,
    pg_catalog.char_length(constraint_definition) - 8
  );

  execute pg_catalog.format(
    'alter table public.transactions drop constraint %I',
    constraint_name
  );

  execute pg_catalog.format(
    'alter table public.transactions add constraint %I check ((%s) or transaction_type = %L)',
    constraint_name,
    check_expression,
    'CUSTOMER_LOAD'
  );
end
$$;

notify pgrst, 'reload schema';