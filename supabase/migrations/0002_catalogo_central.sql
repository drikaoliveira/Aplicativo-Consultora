-- Catálogo central (ex.: Natura), compartilhado por todas as consultoras.
-- - Todas as usuárias logadas LEEM o catálogo central.
-- - Só administradoras (tabela app_admins) criam, editam ou apagam itens dele.
-- - Produtos de outras marcas (Tupperware, etc.) continuam em public.products,
--   separados por consultora.

-- ------------------------------------------------------------ administradoras
create table public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.app_admins enable row level security;
-- cada uma só consegue ver se ela mesma é admin; ninguém entra/sai pelo app
create policy "app_admins: ver a si mesma" on public.app_admins
  for select to authenticated using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid())
$$;
grant execute on function public.is_admin() to authenticated;

-- --------------------------------------------------------- catálogo central
create table public.catalog_products (
  id          uuid primary key default gen_random_uuid(),
  brand       text not null default 'Natura',
  barcode     text unique,                 -- EAN/GTIN como texto
  code        text,
  name        text not null check (length(trim(name)) > 0),
  price       numeric(10,2) check (price is null or price >= 0),
  active      boolean not null default true,
  updated_at  timestamptz not null default now()
);
create index catalog_products_name_idx on public.catalog_products (lower(name));

create trigger catalog_products_touch before update on public.catalog_products
  for each row execute function public.touch_updated_at();

alter table public.catalog_products enable row level security;
create policy "catalog: todas leem" on public.catalog_products
  for select to authenticated using (true);
create policy "catalog: admin insere" on public.catalog_products
  for insert to authenticated with check (public.is_admin());
create policy "catalog: admin edita" on public.catalog_products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "catalog: admin apaga" on public.catalog_products
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------- vínculo da venda com o catálogo
alter table public.entries
  add column catalog_product_id uuid references public.catalog_products(id) on delete set null;
