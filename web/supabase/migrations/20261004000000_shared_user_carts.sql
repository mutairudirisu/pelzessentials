create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.carts enable row level security;

grant select, insert, update on public.carts to authenticated;

drop policy if exists "Users can manage their own cart" on public.carts;
create policy "Users can manage their own cart"
  on public.carts
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

do $$
begin
  if to_regclass('public.cart_items') is null then
    create table public.cart_items (
      cart_id uuid not null references public.carts(id) on delete cascade,
      product_id text not null references public.products(id) on delete cascade,
      quantity integer not null check (quantity between 0 and 20),
      updated_at timestamptz not null default now(),
      primary key (cart_id, product_id)
    );
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cart_items'
      and column_name = 'user_id'
  ) then
    insert into public.carts (user_id)
    select distinct user_id
    from public.cart_items
    on conflict (user_id) do nothing;

    alter table public.cart_items
      add column if not exists cart_id uuid;

    update public.cart_items as item
    set cart_id = cart.id
    from public.carts as cart
    where cart.user_id = item.user_id
      and item.cart_id is null;

  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cart_items'
      and column_name = 'user_id'
  ) then
    drop policy if exists "Users can manage their own cart" on public.cart_items;
    drop policy if exists "Users can manage their own cart items" on public.cart_items;

    alter table public.cart_items
      drop constraint if exists cart_items_pkey;
    alter table public.cart_items
      drop column user_id;
    alter table public.cart_items
      alter column cart_id set not null;
    alter table public.cart_items
      add constraint cart_items_pkey primary key (cart_id, product_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.cart_items'::regclass
      and conname = 'cart_items_cart_id_fkey'
  ) then
    alter table public.cart_items
      add constraint cart_items_cart_id_fkey
      foreign key (cart_id) references public.carts(id) on delete cascade;
  end if;
end
$$;

alter table public.cart_items enable row level security;

grant select, insert, update on public.cart_items to authenticated;

drop policy if exists "Users can manage their own cart items" on public.cart_items;
create policy "Users can manage their own cart items"
  on public.cart_items
  for all
  to authenticated
  using (
    exists (
      select 1 from public.carts
      where carts.id = cart_items.cart_id
        and carts.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.carts
      where carts.id = cart_items.cart_id
        and carts.user_id = auth.uid()
    )
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'carts'
    ) then
      alter publication supabase_realtime add table public.carts;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'cart_items'
    ) then
      alter publication supabase_realtime add table public.cart_items;
    end if;
  end if;
end
$$;
