-- D'Conde Barbearia — schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / OR REPLACE.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth.users row (customers AND admins).
-- Created automatically by the handle_new_user trigger below.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

-- migration safety net for projects that ran an earlier version of this file
alter table public.profiles add column if not exists email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', new.phone)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- barbers
-- ---------------------------------------------------------------------------
create table if not exists public.barbers (
  id text primary key,
  name text not null,
  role_title text not null default 'Barbeiro',
  instagram text,
  photo_path text not null,
  gallery_paths text[] not null default '{}',
  sort_order int not null default 0
);

-- weekly recurring hours + the discrete slot grid customers can pick from
create table if not exists public.barber_hours (
  id bigint generated always as identity primary key,
  barber_id text not null references public.barbers (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6), -- 0 = domingo ... 6 = sábado
  is_open boolean not null default true,
  label text not null default '',   -- e.g. "09:00 — 20:00", shown as-is in the UI
  slots time[] not null default '{}', -- bookable start times for this weekday
  unique (barber_id, weekday)
);

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id text primary key,
  name text not null,
  description text not null default '',
  duration_minutes int not null,
  price_cents int not null,
  sort_order int not null default 0,
  active boolean not null default true
);

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles (id) on delete set null,
  barber_id text not null references public.barbers (id),
  service_id text not null references public.services (id),
  scheduled_date date not null,
  scheduled_time time not null,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'completed', 'cancelled', 'no_show')),
  price_cents int not null,
  customer_name text not null,
  customer_phone text not null,
  created_at timestamptz not null default now(),
  unique (barber_id, scheduled_date, scheduled_time)
);

create index if not exists bookings_customer_idx on public.bookings (customer_id);
create index if not exists bookings_barber_date_idx on public.bookings (barber_id, scheduled_date);

-- ---------------------------------------------------------------------------
-- shop: products, orders (pickup-in-store reservations), order_items
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('Cabelo', 'Barba', 'Pele')),
  price_cents int not null,
  stock int not null default 0,
  image_path text,
  active boolean not null default true
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles (id) on delete set null,
  customer_name text,
  customer_phone text,
  status text not null default 'pending'
    check (status in ('pending', 'ready', 'completed', 'cancelled')),
  total_cents int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id),
  quantity int not null check (quantity > 0),
  unit_price_cents int not null
);

-- ---------------------------------------------------------------------------
-- gallery
-- ---------------------------------------------------------------------------
create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  kind text not null default 'autoral' check (kind in ('autoral', 'dia')),
  service_label text,
  client_label text,
  barber_id text references public.barbers (id),
  taken_on date,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------------
-- financial ledger shown in the admin panel
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id bigint generated always as identity primary key,
  occurred_on date not null default current_date,
  description text not null,
  payment_method text not null check (payment_method in ('Pix', 'Crédito', 'Débito', 'Dinheiro')),
  amount_cents int not null,
  booking_id uuid references public.bookings (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- helper: is the current user an admin?
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.barbers enable row level security;
alter table public.barber_hours enable row level security;
alter table public.services enable row level security;
alter table public.bookings enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.gallery_photos enable row level security;
alter table public.transactions enable row level security;

-- profiles: everyone can read their own row, admins can read/update all
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- catalog tables: public read, admin write
drop policy if exists "barbers_read_all" on public.barbers;
create policy "barbers_read_all" on public.barbers for select using (true);
drop policy if exists "barbers_write_admin" on public.barbers;
create policy "barbers_write_admin" on public.barbers for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "barber_hours_read_all" on public.barber_hours;
create policy "barber_hours_read_all" on public.barber_hours for select using (true);
drop policy if exists "barber_hours_write_admin" on public.barber_hours;
create policy "barber_hours_write_admin" on public.barber_hours for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "services_read_all" on public.services;
create policy "services_read_all" on public.services for select using (true);
drop policy if exists "services_write_admin" on public.services;
create policy "services_write_admin" on public.services for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "gallery_read_all" on public.gallery_photos;
create policy "gallery_read_all" on public.gallery_photos for select using (true);
drop policy if exists "gallery_write_admin" on public.gallery_photos;
create policy "gallery_write_admin" on public.gallery_photos for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products_read_active_or_admin" on public.products;
create policy "products_read_active_or_admin" on public.products for select
  using (active or public.is_admin());
drop policy if exists "products_write_admin" on public.products;
create policy "products_write_admin" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

-- bookings: customers manage their own, admins manage all
drop policy if exists "bookings_select_own_or_admin" on public.bookings;
create policy "bookings_select_own_or_admin" on public.bookings for select
  using (customer_id = auth.uid() or public.is_admin());

drop policy if exists "bookings_insert_own" on public.bookings;
create policy "bookings_insert_own" on public.bookings for insert
  with check (customer_id = auth.uid() or public.is_admin());

drop policy if exists "bookings_update_own_or_admin" on public.bookings;
create policy "bookings_update_own_or_admin" on public.bookings for update
  using (customer_id = auth.uid() or public.is_admin());

drop policy if exists "bookings_delete_admin" on public.bookings;
create policy "bookings_delete_admin" on public.bookings for delete
  using (public.is_admin());

-- orders / order_items: customers manage their own, admins manage all
drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin" on public.orders for select
  using (customer_id = auth.uid() or public.is_admin());
drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders for insert
  with check (customer_id = auth.uid() or public.is_admin());
drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin" on public.orders for update
  using (public.is_admin());

drop policy if exists "order_items_select_own_or_admin" on public.order_items;
create policy "order_items_select_own_or_admin" on public.order_items for select
  using (
    public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  );
drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own" on public.order_items for insert
  with check (
    public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  );

-- transactions: admin only
drop policy if exists "transactions_admin_all" on public.transactions;
create policy "transactions_admin_all" on public.transactions for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: public buckets for gallery/product photos uploaded from the
-- admin panel. Anyone can read (public site), only admins can write.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true), ('products', 'products', true)
on conflict (id) do nothing;

drop policy if exists "gallery_bucket_read" on storage.objects;
create policy "gallery_bucket_read" on storage.objects for select
  using (bucket_id in ('gallery', 'products'));

drop policy if exists "gallery_bucket_admin_write" on storage.objects;
create policy "gallery_bucket_admin_write" on storage.objects for insert
  with check (bucket_id in ('gallery', 'products') and public.is_admin());

drop policy if exists "gallery_bucket_admin_delete" on storage.objects;
create policy "gallery_bucket_admin_delete" on storage.objects for delete
  using (bucket_id in ('gallery', 'products') and public.is_admin());
