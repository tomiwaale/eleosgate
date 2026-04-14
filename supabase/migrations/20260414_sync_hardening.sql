-- Sync hardening for Eleosgate POS
-- 1. Adds category.updated_at for cross-device renames
-- 2. Adds stock adjustment ledger + atomic RPC for quantity updates
-- 3. Enforces store-scoped RLS on every synced table

alter table if exists public.eg_categories
  add column if not exists updated_at timestamptz;

update public.eg_categories
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table if exists public.eg_categories
  alter column updated_at set not null;

alter table if exists public.eg_products
  alter column quantity_in_stock set default 0;

update public.eg_products
set quantity_in_stock = coalesce(quantity_in_stock, 0)
where quantity_in_stock is null;

alter table if exists public.eg_products
  alter column quantity_in_stock set not null;

create table if not exists public.eg_stock_adjustments (
  id uuid primary key,
  store_id uuid not null,
  product_id uuid not null references public.eg_products(id) on delete cascade,
  sale_id uuid references public.eg_sales(id) on delete set null,
  quantity_change integer not null,
  reason text not null check (reason in ('sale', 'manual_adjustment', 'initial_stock')),
  created_at timestamptz not null default now()
);

create index if not exists eg_stock_adjustments_store_created_idx
  on public.eg_stock_adjustments (store_id, created_at);

create index if not exists eg_stock_adjustments_product_idx
  on public.eg_stock_adjustments (product_id);

alter table if exists public.eg_users enable row level security;
alter table if exists public.eg_categories enable row level security;
alter table if exists public.eg_products enable row level security;
alter table if exists public.eg_sales enable row level security;
alter table if exists public.eg_sale_items enable row level security;
alter table if exists public.eg_stock_adjustments enable row level security;

drop policy if exists "store scoped access" on public.eg_users;
create policy "store scoped access" on public.eg_users
  for all
  to authenticated
  using (store_id = auth.uid())
  with check (store_id = auth.uid());

drop policy if exists "store scoped access" on public.eg_categories;
create policy "store scoped access" on public.eg_categories
  for all
  to authenticated
  using (store_id = auth.uid())
  with check (store_id = auth.uid());

drop policy if exists "store scoped access" on public.eg_products;
create policy "store scoped access" on public.eg_products
  for all
  to authenticated
  using (store_id = auth.uid())
  with check (store_id = auth.uid());

drop policy if exists "store scoped access" on public.eg_sales;
create policy "store scoped access" on public.eg_sales
  for all
  to authenticated
  using (store_id = auth.uid())
  with check (store_id = auth.uid());

drop policy if exists "store scoped access" on public.eg_sale_items;
create policy "store scoped access" on public.eg_sale_items
  for all
  to authenticated
  using (store_id = auth.uid())
  with check (store_id = auth.uid());

drop policy if exists "store scoped access" on public.eg_stock_adjustments;
create policy "store scoped access" on public.eg_stock_adjustments
  for all
  to authenticated
  using (store_id = auth.uid())
  with check (store_id = auth.uid());

create or replace function public.apply_stock_adjustment(
  p_adjustment_id uuid,
  p_store_id uuid,
  p_product_id uuid,
  p_quantity_change integer,
  p_reason text,
  p_sale_id uuid default null,
  p_created_at timestamptz default now()
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  adjustment_created_at timestamptz := coalesce(p_created_at, now());
  inserted_rows integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_store_id <> auth.uid() then
    raise exception 'store_id must match auth.uid()';
  end if;

  if p_reason not in ('sale', 'manual_adjustment', 'initial_stock') then
    raise exception 'Unsupported stock adjustment reason: %', p_reason;
  end if;

  insert into public.eg_stock_adjustments (
    id,
    store_id,
    product_id,
    sale_id,
    quantity_change,
    reason,
    created_at
  )
  values (
    p_adjustment_id,
    p_store_id,
    p_product_id,
    p_sale_id,
    p_quantity_change,
    p_reason,
    adjustment_created_at
  )
  on conflict (id) do nothing;

  get diagnostics inserted_rows = row_count;

  if inserted_rows = 0 then
    return false;
  end if;

  update public.eg_products
  set
    quantity_in_stock = greatest(0, quantity_in_stock + p_quantity_change),
    updated_at = greatest(coalesce(updated_at, adjustment_created_at), adjustment_created_at)
  where id = p_product_id
    and store_id = p_store_id;

  if not found then
    raise exception 'Product % not found for store %', p_product_id, p_store_id;
  end if;

  return true;
end;
$$;

grant execute on function public.apply_stock_adjustment(
  uuid,
  uuid,
  uuid,
  integer,
  text,
  uuid,
  timestamptz
) to authenticated;
