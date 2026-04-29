create type public.booking_type as enum ('normal', 'emergency');
create type public.booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_category text not null,
  booking_type public.booking_type not null default 'normal',
  items integer not null check (items > 0),
  base_price integer not null,
  item_price integer not null,
  surcharge integer not null default 0,
  total_price integer not null,
  address text not null,
  status public.booking_status not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

create policy "Users select own bookings"
  on public.bookings for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own bookings"
  on public.bookings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own bookings"
  on public.bookings for update
  to authenticated
  using (auth.uid() = user_id);

create index bookings_user_id_created_at_idx
  on public.bookings (user_id, created_at desc);