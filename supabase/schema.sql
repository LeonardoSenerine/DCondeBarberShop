-- D'Conde Barbearia — schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / OR REPLACE.

create extension if not exists pgcrypto;
-- Lets a GiST index enforce equality (barber_id, scheduled_date) alongside a
-- range overlap check in the same exclusion constraint (see bookings_no_overlap).
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth.users row (customers AND admins).
-- Created automatically by the handle_new_user trigger below.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'staff', 'owner')),
  created_at timestamptz not null default now()
);

-- migration safety net for projects that ran an earlier version of this file
alter table public.profiles add column if not exists email text;

-- Projects that predate the staff/owner split had everyone on 'admin' —
-- drop the old constraint first so the rename below doesn't violate it,
-- promote those accounts to 'owner' (full access), then re-add the
-- constraint pointed at the new role names.
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'owner' where role = 'admin';
alter table public.profiles add constraint profiles_role_check
  check (role in ('customer', 'staff', 'owner'));

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
  email text,
  phone text,
  photo_path text not null,
  gallery_paths text[] not null default '{}',
  sort_order int not null default 0
);

-- which barber a staff/owner account operates as — drives the "só vejo o
-- meu" scoping on Agenda, Financeiro and Clientes for role = 'staff'.
alter table public.profiles add column if not exists barber_id text references public.barbers (id) on delete set null;

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
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  price_cents int not null,
  -- Snapshot of the service's duration at booking time (same idea as
  -- price_cents above) — how many consecutive hourly slots this booking
  -- occupies. Drives both slot-availability checks (client) and the
  -- bookings_no_overlap exclusion constraint below (database).
  duration_minutes int not null default 60,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  -- Set by the send-booking-reminders Edge Function once the "3h antes"
  -- reminder went out, so the scheduled job never sends it twice for the
  -- same booking (see supabase/sql/schedule-booking-reminders.sql).
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.bookings add column if not exists duration_minutes int not null default 60;

-- Re-sync the status check for projects created before "pending" (or a
-- later status) was added to the allowed list.
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show'));

-- Old "same exact start time" guard, fully superseded by the
-- bookings_no_overlap exclusion constraint below (any exact-time collision
-- is trivially an overlap too). Dropped rather than kept alongside it
-- because, unlike the new constraint, this one ignored status — a
-- cancelled booking still permanently occupied its slot for anyone else.
-- Named per Postgres's default naming for an unnamed inline `unique(...)`
-- table constraint, so this also cleans up projects that ran the table
-- definition before this column existed.
alter table public.bookings drop constraint if exists bookings_barber_id_scheduled_date_scheduled_time_key;

-- Belt-and-suspenders for the exclusion constraint below: `time + interval`
-- wraps at midnight instead of erroring, so without this a booking whose
-- span would cross into the next day (an extremely late slot combined with
-- a multi-hour service) produces a range with its end before its start,
-- which the exclusion constraint rejects with a confusing low-level GiST
-- error. This turns that into a clear, named constraint violation instead.
alter table public.bookings drop constraint if exists bookings_duration_fits_in_day;
alter table public.bookings add constraint bookings_duration_fits_in_day
  check (extract(epoch from scheduled_time) + duration_minutes * 60 <= 86400);

-- A custom range type over `time` so the exclusion constraint below can use
-- the standard range-overlap operator (&&) — Postgres has no built-in one.
do $$ begin
  if to_regtype('public.timerange') is null then
    create type public.timerange as range (subtype = time);
  end if;
end $$;

-- An index expression must call only IMMUTABLE functions, but a range
-- type's auto-generated constructor (public.timerange(...) below) is not
-- marked IMMUTABLE — using it directly in the exclusion constraint fails
-- with "functions in index expression must be marked IMMUTABLE". Wrapping
-- it in our own function lets us assert immutability ourselves, which is
-- safe here: same (start_time, duration_minutes) always produces the same
-- range, nothing about it depends on other rows or the current time.
create or replace function public.booking_timerange(start_time time, duration_minutes int)
returns public.timerange
language sql
immutable
as $$
  select public.timerange(start_time, start_time + (duration_minutes || ' minutes')::interval, '[)');
$$;

-- Prevents two bookings from the same barber on the same day from covering
-- any of the same time, at the database level. A 4h "luzes" starting at
-- 10:00 now also blocks someone else starting at 11:00, 12:00 or 13:00 for
-- that barber that day. Unlike a check-then-insert guard (e.g. a trigger
-- that queries for conflicts), a GiST exclusion constraint is enforced by
-- the index itself, so two concurrent inserts racing for an overlapping
-- time can't both slip through — the same class of guarantee a primary key
-- gives against duplicate ids.
alter table public.bookings drop constraint if exists bookings_no_overlap;
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (
    barber_id with =,
    scheduled_date with =,
    -- The extra outer parens are required here: an EXCLUDE element that
    -- isn't a bare column name must be wrapped as `(expression)`, same as
    -- an expression index.
    (public.booking_timerange(scheduled_time, duration_minutes)) with &&
  )
  where (status <> 'cancelled');

-- Every legitimate UPDATE in this app only ever changes `status` (customer
-- cancel, admin accept/decline/complete) or `reminder_sent_at` (the
-- send-booking-reminders Edge Function). Nothing should ever rewrite a
-- booking's time, barber, price or duration after the fact — the RLS
-- insert policy validates price_cents/duration_minutes and the exclusion
-- constraint above only guards against overlaps at insert/update time, so
-- without this, updating just those two columns on an existing row would
-- silently dodge both checks (e.g. shrinking duration_minutes to free up
-- slots the barber is still actually booked for).
create or replace function public.bookings_restrict_update()
returns trigger
language plpgsql
as $$
begin
  if new.barber_id is distinct from old.barber_id
    or new.service_id is distinct from old.service_id
    or new.scheduled_date is distinct from old.scheduled_date
    or new.scheduled_time is distinct from old.scheduled_time
    or new.price_cents is distinct from old.price_cents
    or new.duration_minutes is distinct from old.duration_minutes
    or new.customer_id is distinct from old.customer_id
    or new.customer_name is distinct from old.customer_name
    or new.customer_phone is distinct from old.customer_phone
    or new.customer_email is distinct from old.customer_email
  then
    raise exception 'bookings_immutable_fields';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_restrict_update on public.bookings;
create trigger bookings_restrict_update
before update on public.bookings
for each row execute function public.bookings_restrict_update();

create index if not exists bookings_customer_idx on public.bookings (customer_id);
create index if not exists bookings_barber_date_idx on public.bookings (barber_id, scheduled_date);

-- Powers the admin panel's live "novo agendamento" alert (Supabase
-- Realtime, filtered by the bookings RLS policies above).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;
end $$;

-- The booking calendar needs to grey out already-taken slots for EVERY
-- visitor, including anonymous ones — but bookings' own RLS only ever let
-- someone see their own rows (or admin/owner ones), so that query always
-- came back empty for a regular customer and let two people double-book
-- the same slot. This function returns just enough to check availability
-- (which barber/date/time is taken, and for how long) without leaking whose
-- booking it is. duration_minutes lets the client expand a long booking
-- (e.g. a 4h "luzes") into every hourly slot it occupies, not just its
-- start time — see slotTimesForBooking() in useBooking.ts.
-- It's SECURITY DEFINER (with search_path pinned) so it bypasses bookings'
-- RLS for exactly these four columns — nothing else is exposed. A plain
-- view with the same effect trips Supabase's security-definer-view lint,
-- since a view can't pin search_path and the linter can't distinguish this
-- intentional, narrow bypass from an accidental one — a function can.
drop view if exists public.booked_slots;
-- CREATE OR REPLACE can't change a function's OUT-parameter row type (the
-- new duration_minutes column), so projects that ran this file before that
-- column existed need the old signature dropped first.
drop function if exists public.booked_slots();

create or replace function public.booked_slots()
returns table (barber_id text, scheduled_date date, scheduled_time time, duration_minutes int)
language sql
security definer
set search_path = public
stable
as $$
  select barber_id, scheduled_date, scheduled_time, duration_minutes
  from public.bookings
  where status <> 'cancelled';
$$;

grant execute on function public.booked_slots() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- shop: products, orders (pickup-in-store reservations), order_items
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null check (category in ('Cabelo', 'Barba', 'Pele')),
  price_cents int not null,
  stock int not null default 0,
  image_path text,
  sale_percent int not null default 0 check (sale_percent between 0 and 100),
  sale_from date,
  sale_until date,
  active boolean not null default true
);

alter table public.products add column if not exists sale_from date;

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

-- Applies a stock delta atomically (a single UPDATE, not a JS read-then-write)
-- so two staff completing checkouts with the last unit of a product at the
-- same time can't both succeed: the update's own WHERE clause re-checks
-- "enough stock left" against the current row, so the second call always
-- sees the first call's decrement and fails instead of overselling.
create or replace function public.adjust_product_stock(p_product_id uuid, p_delta int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_stock int;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'product_not_found';
  end if;

  update public.products
  set stock = stock + p_delta
  where id = p_product_id and stock + p_delta >= 0
  returning stock into new_stock;

  if new_stock is null then
    raise exception 'insufficient_stock';
  end if;

  return new_stock;
end;
$$;

grant execute on function public.adjust_product_stock(uuid, int) to authenticated;

-- Same guarantee as adjust_product_stock(), but for every product in a
-- checkout at once: a PL/pgSQL function body is one transaction, so if any
-- item in the batch fails (not found / insufficient stock), every update
-- already made earlier in the same call is rolled back too. completeBooking()
-- calls this — and only after it succeeds does it write the order/ledger
-- rows — so a failed checkout never partially decrements stock and never
-- leaves a retry to duplicate the products that already went through.
create or replace function public.adjust_product_stock_batch(deltas jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  p_id uuid;
  p_delta int;
  new_stock int;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  for item in select * from jsonb_array_elements(deltas)
  loop
    p_id := (item->>'id')::uuid;
    p_delta := (item->>'delta')::int;

    if not exists (select 1 from public.products where id = p_id) then
      raise exception 'product_not_found';
    end if;

    update public.products
    set stock = stock + p_delta
    where id = p_id and stock + p_delta >= 0
    returning stock into new_stock;

    if new_stock is null then
      raise exception 'insufficient_stock';
    end if;
  end loop;
end;
$$;

grant execute on function public.adjust_product_stock_batch(jsonb) to authenticated;

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

-- which barber the sale belongs to — needed for staff to see only their
-- own revenue. Service transactions carry it directly; product-only
-- transactions (order_id set, no booking_id) get it from completeBooking().
alter table public.transactions add column if not exists barber_id text references public.barbers (id) on delete set null;

-- backfill: derive it from the linked booking for existing service rows
update public.transactions t
set barber_id = b.barber_id
from public.bookings b
where t.booking_id = b.id and t.barber_id is null;

-- Lets a customer dismiss the "avalie seu atendimento" prompt on a completed
-- booking without leaving a review — the prompt then just stays hidden for
-- that one booking instead of nagging them every time they open the account
-- page. Not covered by bookings_restrict_update() below since it's not in
-- that trigger's guarded-fields list, same as status/reminder_sent_at.
alter table public.bookings add column if not exists review_dismissed_at timestamptz;

-- ---------------------------------------------------------------------------
-- customer reviews, left on a completed booking. customer_name/barber_id/
-- service_id are snapshotted onto the row (like bookings does with its own
-- customer_name/phone) so the public "published" testimonials on the site
-- can be read without needing looser RLS on bookings/profiles.
-- booking_id is nullable so an admin can also curate a standalone
-- testimonial (e.g. copied over from Google/WhatsApp) that never went
-- through the in-app "avalie seu atendimento" flow — see reviews_insert_own
-- below. A unique column allows any number of nulls, so this doesn't weaken
-- the "one review per booking" guarantee for the normal customer flow.
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique references public.bookings (id) on delete cascade,
  customer_id uuid references public.profiles (id) on delete set null,
  customer_name text not null,
  barber_id text not null references public.barbers (id),
  service_id text not null references public.services (id),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  -- Reviews start hidden from the public site until an admin approves one
  -- as a testimonial worth showing.
  published boolean not null default false,
  created_at timestamptz not null default now()
);

-- migration safety net for projects that ran an earlier version of this
-- table with booking_id not null
alter table public.reviews alter column booking_id drop not null;

create index if not exists reviews_customer_idx on public.reviews (customer_id);
create index if not exists reviews_barber_idx on public.reviews (barber_id);

-- ---------------------------------------------------------------------------
-- helpers: role checks used by the RLS policies below
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('staff', 'owner')
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.my_barber_id()
returns text
language sql
stable
security definer set search_path = public
as $$
  select barber_id from public.profiles where id = auth.uid();
$$;

-- Guards against a staff account escalating its own access: only an
-- existing owner can change someone's role or which barber they're
-- linked to (otherwise "id = auth.uid()" in the profiles RLS policy
-- below would let any logged-in user promote themselves).
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- auth.uid() is null when this runs outside a logged-in user's request
  -- (the SQL Editor, a migration, a service-role job) — that's already a
  -- trusted context, so only block changes coming from an actual session.
  if (new.role is distinct from old.role or new.barber_id is distinct from old.barber_id)
    and auth.uid() is not null
    and not public.is_owner() then
    raise exception 'Apenas o dono pode alterar cargo ou barbeiro vinculado.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

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
alter table public.reviews enable row level security;

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

-- bookings: customers manage their own; the owner manages all; staff only
-- the bookings assigned to the barber they operate as
drop policy if exists "bookings_select_own_or_admin" on public.bookings;
create policy "bookings_select_own_or_admin" on public.bookings for select
  using (
    customer_id = auth.uid()
    or public.is_owner()
    or (public.is_admin() and barber_id = public.my_barber_id())
  );

-- price_cents and duration_minutes must match the service's current values
-- — otherwise a client could insert a booking with a self-chosen price, or
-- a short duration_minutes that dodges the bookings_no_overlap protection
-- for a service that actually needs more than one slot.
drop policy if exists "bookings_insert_own" on public.bookings;
create policy "bookings_insert_own" on public.bookings for insert
  with check (
    (customer_id = auth.uid() or public.is_admin())
    and price_cents = (select price_cents from public.services where id = service_id)
    and duration_minutes = (select duration_minutes from public.services where id = service_id)
  );

drop policy if exists "bookings_update_own_or_admin" on public.bookings;
create policy "bookings_update_own_or_admin" on public.bookings for update
  using (
    customer_id = auth.uid()
    or public.is_owner()
    or (public.is_admin() and barber_id = public.my_barber_id())
  );

drop policy if exists "bookings_delete_admin" on public.bookings;
create policy "bookings_delete_admin" on public.bookings for delete
  using (public.is_admin());

-- reviews: a customer can read their own (published or not) and leave one
-- for their own completed booking; anyone (including anonymous site
-- visitors) can read a published one, for the public testimonials
-- carousel; only admins can approve (publish) or remove one.
drop policy if exists "reviews_select_own_or_admin_or_published" on public.reviews;
create policy "reviews_select_own_or_admin_or_published" on public.reviews for select
  using (
    customer_id = auth.uid()
    or public.is_admin()
    or published = true
  );

-- customer_name/barber_id/service_id aren't cross-checked against the
-- booking here the way bookings_insert_own checks price_cents against the
-- service — unlike that one, a mismatch here is purely cosmetic (what
-- shows on a testimonial card), not something that lets anyone dodge a
-- charge or a slot conflict, so it isn't worth a correlated subquery.
-- Two ways in: a customer reviewing their own completed booking, or an
-- admin curating a standalone testimonial (booking_id left null) that
-- never went through the in-app flow.
drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews for insert
  with check (
    (
      customer_id = auth.uid()
      and booking_id is not null
      and exists (
        select 1 from public.bookings b
        where b.id = booking_id and b.customer_id = auth.uid() and b.status = 'completed'
      )
    )
    or (public.is_admin() and booking_id is null)
  );

drop policy if exists "reviews_update_admin" on public.reviews;
create policy "reviews_update_admin" on public.reviews for update
  using (public.is_admin());

drop policy if exists "reviews_delete_admin" on public.reviews;
create policy "reviews_delete_admin" on public.reviews for delete
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

-- transactions: the owner sees/creates every lançamento; staff only their
-- own barber's. Update/delete stay owner-only — nothing in the app edits
-- a transaction after the fact, so there's no reason for staff to.
drop policy if exists "transactions_admin_all" on public.transactions;

drop policy if exists "transactions_select" on public.transactions;
create policy "transactions_select" on public.transactions for select
  using (public.is_owner() or (public.is_admin() and barber_id = public.my_barber_id()));

drop policy if exists "transactions_insert" on public.transactions;
create policy "transactions_insert" on public.transactions for insert
  with check (public.is_owner() or (public.is_admin() and barber_id = public.my_barber_id()));

drop policy if exists "transactions_update_owner" on public.transactions;
create policy "transactions_update_owner" on public.transactions for update
  using (public.is_owner());

drop policy if exists "transactions_delete_owner" on public.transactions;
create policy "transactions_delete_owner" on public.transactions for delete
  using (public.is_owner());

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
