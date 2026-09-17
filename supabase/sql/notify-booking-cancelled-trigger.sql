-- D'Conde Barbearia — dispara a Edge Function
-- notify-booking-cancelled-by-customer quando o CLIENTE cancela o próprio
-- agendamento (ver CancelBookingModal.tsx), pra avisar o barbeiro por
-- e-mail.
--
-- Mesmo esquema de supabase/sql/notify-new-booking-trigger.sql e
-- notify-booking-declined-trigger.sql — não faz parte do schema.sql
-- principal porque tem passos manuais no meio (guardar a service_role key
-- no Vault, apontar pra URL real da function) que só você pode fazer com
-- os seus dados. Rode em partes, na ordem, pelo SQL Editor do painel.
--
-- ─────────────────────────────────────────────────────────────────────────
-- PARTE 1 — rode isto primeiro (uma vez só)
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pg_net with schema extensions;

-- Se você já rodou notify-new-booking-trigger.sql ou
-- notify-booking-declined-trigger.sql, o secret
-- 'notify_new_booking_service_role_key' já existe no Vault com a mesma
-- service_role key — a função abaixo reaproveita ele, não precisa guardar
-- de novo. Só rode o comando abaixo (direto no editor, sem salvar aqui
-- depois de rodado) se ainda não tiver feito isso em nenhum outro trigger:
--
--   select vault.create_secret('<COLE_A_SERVICE_ROLE_KEY_AQUI>', 'notify_new_booking_service_role_key');
--
-- A chave fica em: Settings → API → Project API keys → service_role
-- ("secret", não a "anon"/"public").

-- ─────────────────────────────────────────────────────────────────────────
-- PARTE 2 — a função e o trigger (idempotente, pode rodar de novo à vontade)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.notify_booking_cancelled_by_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  service_role_key text;
  -- Troque pela URL real depois de implantar a function (Edge Functions →
  -- notify-booking-cancelled-by-customer → copiar a URL) — o nome que ela
  -- recebe no painel pode não ser exatamente esse, igual aconteceu com
  -- notify-new-booking (virou "rapid-endpoint" lá).
  function_url text := 'https://gybpbnwzwtwjlgdukxgj.supabase.co/functions/v1/notify-booking-cancelled-by-customer';
begin
  select decrypted_secret into service_role_key
  from vault.decrypted_secrets
  where name = 'notify_new_booking_service_role_key';

  if service_role_key is null then
    raise warning 'notify_booking_cancelled_by_customer: service_role key não encontrada no Vault, pulando aviso.';
    return new;
  end if;

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'bookings',
      'record', to_jsonb(new),
      'old_record', to_jsonb(old)
    )
  );
  return new;
end;
$$;

-- WHEN skips the pg_net call (and the function invocation it triggers)
-- for the vast majority of bookings updates that have nothing to do with
-- a customer cancellation — accept/complete/decline/reminder-sent/
-- review-dismissed etc. all UPDATE this same row. The function's own guard
-- is enough for correctness, but filtering here avoids wasting Edge
-- Function invocations.
drop trigger if exists on_booking_update_notify_cancelled on public.bookings;
create trigger on_booking_update_notify_cancelled
  after update on public.bookings
  for each row
  when (new.status = 'cancelled' and new.cancel_reason is not null and old.status is distinct from new.status)
  execute function public.notify_booking_cancelled_by_customer();

-- ─────────────────────────────────────────────────────────────────────────
-- Pronto. A partir daqui, todo UPDATE em public.bookings chama a Edge
-- Function em segundo plano (pg_net é assíncrono — não trava nem atrasa a
-- ação no app se o e-mail demorar ou falhar). A própria função já filtra
-- pra só avisar quando status virou 'cancelled' com cancel_reason
-- preenchido (ver supabase/functions/notify-booking-cancelled-by-customer/
-- index.ts) — uma recusa do barbeiro (decline_reason) não dispara isso, só
-- notify-booking-declined-trigger.sql cuida daquele caso.
--
-- Pra testar: cancele um agendamento pela conta do cliente com um motivo e
-- confira em Edge Functions → notify-booking-cancelled-by-customer → Logs
-- se a invocação apareceu e o que ela retornou.
-- ─────────────────────────────────────────────────────────────────────────
