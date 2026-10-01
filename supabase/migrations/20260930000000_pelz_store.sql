create extension if not exists pgcrypto;

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null,
  description text not null default '',
  price integer not null check (price >= 0),
  image_url text not null,
  badge text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  email text not null,
  phone text not null,
  address text not null,
  city text not null,
  notes text,
  payment_method text not null check (payment_method in ('bank_transfer', 'pay_on_delivery')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'fulfilled', 'cancelled')),
  subtotal integer not null check (subtotal >= 0),
  shipping_fee integer not null check (shipping_fee >= 0),
  total integer not null check (total = subtotal + shipping_fee),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  product_name text not null,
  quantity integer not null check (quantity between 1 and 20),
  unit_price integer not null check (unit_price >= 0),
  line_total integer not null check (line_total = quantity * unit_price),
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

grant select on public.products to anon, authenticated;
drop policy if exists "Active products are visible to everyone" on public.products;
create policy "Active products are visible to everyone" on public.products for select to anon, authenticated using (active);

insert into public.products (id, name, category, description, price, image_url, badge, sort_order) values
  ('cloud-plush-blanket', 'Cloud Plush Blanket', 'Plush blankets', 'A softer kind of slow morning', 28500, '/plush_blanket/Cozy%20Sherpa%20Throw%20-%20Ultimate%20Knit%20Blanket_%20Cozy%20Comfort.jpg', 'Bestseller', 1),
  ('everyday-tote', 'Everyday Tote Bag', 'Tote bags', 'Room for all your little things', 18500, '/tote_bag/Light%20Tote%20Bag.jpg', 'Everyday favorite', 2),
  ('studio-gym-mat', 'Studio Gym Mat', 'Gym mats', 'A little space to reset', 32000, '/Gym-Mat/Premium%20Ribbed%20Yoga%20Mat%20with%20Carrying%20Straps%20for%20Home%20Workouts.jpg', 'New arrival', 3),
  ('daily-essentials-set', 'Daily Essentials Set', 'Personal essentials', 'The details that make a day', 14500, '/Personal-Essentials/Groomsmen%20Gifts%20Personalized%20Leather%20Toiletry%20Bag%20_%20Custom%20Dopp%20Kit%20_%20Shaving%20Kit%20_%20Gift%20for%20Him.jpg', 'A thoughtful pick', 4),
  ('dolphin-weekender', 'Dolphin Weekender Bag', 'Dolphin bags', 'Ready when you are', 26000, '/Dolphin-bags/Personalised%20Gym%20Bag%20for%20the%20Motivated%20Fitness%E2%80%A6.jpg', 'Just landed', 5)
on conflict (id) do nothing;

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
  if p_payment_method is null or p_payment_method not in ('bank_transfer', 'pay_on_delivery') then
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
  insert into public.orders (order_number, customer_name, email, phone, address, city, notes, payment_method, subtotal, shipping_fee, total)
  values ('PELZ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)), btrim(p_customer_name), lower(btrim(p_email)), btrim(p_phone), btrim(p_address), btrim(p_city), nullif(btrim(p_notes), ''), p_payment_method, v_subtotal, v_shipping, v_subtotal + v_shipping)
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

revoke all on function public.create_store_order(text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_store_order(text, text, text, text, text, text, text, jsonb) to service_role;