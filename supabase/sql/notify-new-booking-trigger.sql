-- D'Conde Barbearia — dispara a Edge Function notify-new-booking quando um
-- agendamento é criado, pra avisar o barbeiro/dono por e-mail.
--
-- Não faz parte do schema.sql principal porque tem UM passo manual no meio
-- (guardar a service_role key no Vault) que só você pode fazer com a sua
-- chave. Rode este arquivo em partes, na ordem, pelo SQL Editor do painel.
--
-- ─────────────────────────────────────────────────────────────────────────
-- PARTE 1 — rode isto primeiro (uma vez só)
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pg_net with schema extensions;

-- Guarda a service_role key no Vault (criptografada), pra função abaixo
-- conseguir se autenticar na Edge Function sem a chave ficar exposta em
-- texto puro no SQL. Pegue a chave em: Settings → API → Project API keys →
-- service_role ("secret", não a "anon"/"public").
--
-- Troque <COLE_A_SERVICE_ROLE_KEY_AQUI> pela chave de verdade antes de
-- rodar, execute, e pode apagar a linha do editor depois — ela já foi
-- salva. Rodar de novo com uma chave diferente sobrescreve a antiga.


-- ─────────────────────────────────────────────────────────────────────────
-- PARTE 2 — a função e o trigger (idempotente, pode rodar de novo à vontade)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.notify_new_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  service_role_key text;
  webhook_secret text;
  -- Aponta pra Edge Function "rapid-endpoint" (nome que ela recebeu quando
  -- foi criada no painel) — é lá que está o código de
  -- supabase/functions/notify-new-booking/index.ts.
  function_url text := 'https://gybpbnwzwtwjlgdukxgj.supabase.co/functions/v1/rapid-endpoint';
begin
  select decrypted_secret into service_role_key
  from vault.decrypted_secrets
  where name = 'notify_new_booking_service_role_key';

  -- Ver supabase/sql/webhook-secret.sql — sem ele a Edge Function recusa a chamada.
  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets
  where name = 'edge_webhook_secret';

  if service_role_key is null or webhook_secret is null then
    raise warning 'notify_new_booking: service_role key ou edge_webhook_secret não encontrado no Vault, pulando aviso.';
    return new;
  end if;

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key,
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'bookings',
      'record', to_jsonb(new)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_booking_insert_notify on public.bookings;
create trigger on_booking_insert_notify
  after insert on public.bookings
  for each row
  execute function public.notify_new_booking();

-- ─────────────────────────────────────────────────────────────────────────
-- Pronto. A partir daqui, todo INSERT em public.bookings chama a Edge
-- Function em segundo plano (pg_net é assíncrono — não trava nem atrasa a
-- criação do agendamento se o e-mail demorar ou falhar). A própria função
-- já filtra pra só avisar quando status = 'pending' (ver
-- supabase/functions/notify-new-booking/index.ts).
--
-- Pra testar: crie um agendamento pelo site e confira em Edge Functions →
-- rapid-endpoint → Logs se a invocação apareceu e o que ela retornou.
-- ─────────────────────────────────────────────────────────────────────────
