-- Adiciona as colunas que faltam em public.bookings para o lembrete
-- automático 3h antes do horário. Rode uma vez no SQL Editor do Supabase
-- (idempotente, pode rodar de novo à vontade).

alter table public.bookings
  add column if not exists customer_email text,
  add column if not exists reminder_sent_at timestamptz;
