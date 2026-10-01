alter table public.orders
  drop constraint if exists orders_payment_method_check;

alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('bank_transfer', 'pay_on_delivery', 'paystack'));

alter table public.orders
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists payment_reference text,
  add column if not exists paid_at timestamptz;

alter table public.orders
  drop constraint if exists orders_payment_status_check;

alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in ('unpaid', 'pending', 'paid', 'failed'));

create unique index if not exists orders_payment_reference_unique
  on public.orders (payment_reference)
  where payment_reference is not null;

create or replace function public.create_store_order(
  p_customer_name text,
  p_email text,
  p_phone text,
  p_address text,
  p_city text,
  p_notes text,
  p_payment_method text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
  v_subtotal integer := 0;
  v_shipping integer;
  v_lines jsonb;
begin
  if nullif(btrim(p_customer_name), '') is null or nullif(btrim(p_email), '') is null
    or nullif(btrim(p_phone), '') is null or nullif(btrim(p_address), '') is null
    or nullif(btrim(p_city), '') is null then
    raise exception 'Customer details are required';
  end if;
  if p_payment_method is null or p_payment_method not in ('bank_transfer', 'pay_on_delivery', 'paystack') then
    raise exception 'Invalid payment method';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then
    raise exception 'Invalid order items';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.products where id = v_item ->> 'id' and active;
    if not found then raise exception 'Product unavailable'; end if;
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity < 1 or v_quantity > 20 then raise exception 'Invalid quantity'; end if;
    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  end loop;

  v_shipping := case when v_subtotal >= 100000 then 0 else 3500 end;
  insert into public.orders (order_number, customer_name, email, phone, address, city, notes, payment_method, payment_status, subtotal, shipping_fee, total)
  values ('PELZ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)), btrim(p_customer_name), lower(btrim(p_email)), btrim(p_phone), btrim(p_address), btrim(p_city), nullif(btrim(p_notes), ''), p_payment_method, case when p_payment_method = 'paystack' then 'pending' else 'unpaid' end, v_subtotal, v_shipping, v_subtotal + v_shipping)
  returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.products where id = v_item ->> 'id' and active;
    v_quantity := (v_item ->> 'quantity')::integer;
    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price, line_total)
    values (v_order.id, v_product.id, v_product.name, v_quantity, v_product.price, v_product.price * v_quantity);
  end loop;

  select jsonb_agg(jsonb_build_object('name', product_name, 'quantity', quantity, 'line_total', line_total) order by created_at)
  into v_lines from public.order_items where order_id = v_order.id;
  return jsonb_build_object('order_number', v_order.order_number, 'subtotal', v_order.subtotal, 'shipping_fee', v_order.shipping_fee, 'total', v_order.total, 'items', coalesce(v_lines, '[]'::jsonb));
end;
$$;

create or replace function public.finalize_paystack_payment(
  p_reference text,
  p_amount_kobo bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_items jsonb;
  v_newly_paid boolean := false;
begin
  select * into v_order
  from public.orders
  where payment_reference = p_reference and payment_method = 'paystack'
  for update;

  if not found then raise exception 'Paystack order not found'; end if;
  if v_order.total::bigint * 100 <> p_amount_kobo then
    raise exception 'Paystack amount does not match order total';
  end if;

  if v_order.payment_status <> 'paid' then
    update public.orders
    set payment_status = 'paid', status = 'confirmed', paid_at = coalesce(paid_at, now())
    where id = v_order.id
    returning * into v_order;
    v_newly_paid := true;
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('name', product_name, 'quantity', quantity, 'line_total', line_total) order by created_at),
    '[]'::jsonb
  ) into v_items
  from public.order_items
  where order_id = v_order.id;

  return jsonb_build_object(
    'newly_paid', v_newly_paid,
    'order', jsonb_build_object(
      'order_number', v_order.order_number,
      'customer_name', v_order.customer_name,
      'email', v_order.email,
      'total', v_order.total,
      'items', v_items
    )
  );
end;
$$;

revoke all on function public.finalize_paystack_payment(text, bigint) from public, anon, authenticated;
grant execute on function public.finalize_paystack_payment(text, bigint) to service_role;
