-- App da consultora — esquema inicial
-- Modelo "conta corrente", igual à ficha de papel:
--   clientes (customers) + lançamentos (entries) + catálogo (products).
-- O saldo NUNCA é guardado: é a soma de entries.delta.
-- Lançamentos não podem ser alterados nem apagados: corrige-se com estorno.
-- Cada consultora (auth.users) só enxerga as próprias linhas (RLS).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- clientes
create table public.customers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name          text not null check (length(trim(name)) > 0),
  phone         text,
  street        text,
  number        text,
  complement    text,
  neighborhood  text,
  city          text,
  reference     text,
  notes         text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index customers_user_idx on public.customers (user_id);

-- ---------------------------------------------------------------- catálogo
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  barcode     text,                       -- EAN/GTIN como texto (preserva zeros)
  code        text,                       -- código interno Natura/PDV (opcional)
  name        text not null check (length(trim(name)) > 0),
  price       numeric(10,2) check (price is null or price >= 0),
  active      boolean not null default true,
  updated_at  timestamptz not null default now(),
  unique (user_id, barcode)
);
create index products_user_idx on public.products (user_id);

-- ------------------------------------------------------------- lançamentos
create table public.entries (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  customer_id        uuid not null references public.customers(id) on delete restrict,
  kind               text not null check (kind in ('venda','pagamento','saldo_anterior','estorno')),
  quantity           integer check (quantity is null or quantity > 0),
  description        text not null,
  amount             numeric(10,2) not null check (amount > 0),
  delta              numeric(10,2) not null default 0, -- efeito no saldo (+ débito, − crédito); preenchido pelo trigger
  payment_method     text check (payment_method is null or payment_method in ('dinheiro','pix','cartao','transferencia','outro')),
  product_id         uuid references public.products(id) on delete set null,
  sale_group         uuid,                -- itens lançados juntos numa mesma venda
  reverses_entry_id  uuid unique references public.entries(id) on delete restrict,
  occurred_on        date not null default current_date,
  created_at         timestamptz not null default now()
);
create index entries_customer_idx on public.entries (customer_id, occurred_on);
create index entries_user_idx on public.entries (user_id, occurred_on);

-- Calcula delta e valida estornos.
create or replace function public.entries_before_insert()
returns trigger language plpgsql as $$
declare
  orig public.entries;
begin
  if new.kind in ('venda', 'saldo_anterior') then
    new.delta := new.amount;
  elsif new.kind = 'pagamento' then
    new.delta := -new.amount;
  else -- estorno
    if new.reverses_entry_id is null then
      raise exception 'Estorno precisa indicar o lançamento corrigido';
    end if;
    select * into orig from public.entries where id = new.reverses_entry_id;
    if not found then
      raise exception 'Lançamento a corrigir não encontrado';
    end if;
    if orig.kind = 'estorno' then
      raise exception 'Não é possível estornar um estorno';
    end if;
    if orig.customer_id <> new.customer_id or orig.user_id <> new.user_id then
      raise exception 'Estorno deve ser da mesma cliente';
    end if;
    new.amount := orig.amount;
    new.delta  := -orig.delta;
  end if;
  return new;
end $$;

create trigger entries_before_insert
  before insert on public.entries
  for each row execute function public.entries_before_insert();

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger customers_touch before update on public.customers
  for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- RLS
alter table public.customers enable row level security;
alter table public.products  enable row level security;
alter table public.entries   enable row level security;

create policy "customers: dona" on public.customers
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "products: dona" on public.products
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- entries: só ler e inserir. Sem política de update/delete => proibido.
create policy "entries: ler" on public.entries
  for select to authenticated using (user_id = auth.uid());
create policy "entries: inserir" on public.entries
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.customers c where c.id = customer_id and c.user_id = auth.uid())
  );

-- Clientes com lançamentos não podem ser apagados (on delete restrict);
-- o caminho é marcar active = false.

-- ---------------------------------------------------------------- views
-- security_invoker: a view respeita o RLS de quem consulta.
create or replace view public.customer_balances
with (security_invoker = true) as
select
  c.id,
  c.user_id,
  c.name,
  c.phone,
  c.street, c.number, c.complement, c.neighborhood, c.city, c.reference,
  c.active,
  coalesce(sum(e.delta), 0)::numeric(10,2)                                   as balance,
  max(e.occurred_on) filter (where e.kind = 'pagamento' and r.id is null)    as last_payment_on,
  max(e.occurred_on)                                                         as last_entry_on,
  min(e.occurred_on) filter (where e.kind in ('venda','saldo_anterior') and r.id is null) as first_debit_on
from public.customers c
left join public.entries e on e.customer_id = c.id
left join public.entries r on r.reverses_entry_id = e.id   -- lançamento estornado
group by c.id;

grant select on public.customer_balances to authenticated;
