-- Cria (ou recria) a função que o site usa para saber quais horários já
-- estão ocupados. Sem ela, todo agendamento confirmado aparece como
-- "horário livre" no site, permitindo agendamento duplicado no mesmo
-- horário. Rode este script uma vez no SQL Editor do Supabase.
drop view if exists public.booked_slots;

create or replace function public.booked_slots()
returns table (barber_id text, scheduled_date date, scheduled_time time)
language sql
security definer
set search_path = public
stable
as $$
  select barber_id, scheduled_date, scheduled_time
  from public.bookings
  where status <> 'cancelled';
$$;

grant execute on function public.booked_slots() to anon, authenticated;
