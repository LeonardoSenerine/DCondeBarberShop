-- D'Conde Barbearia — agenda a Edge Function send-booking-reminders pra
-- rodar a cada 15 minutos, mandando o lembrete por e-mail 3h antes de cada
-- horário confirmado.
--
-- Pré-requisitos (rode antes, se ainda não rodou):
--   1) supabase/sql/add-reminder-columns.sql — adiciona customer_email e
--      reminder_sent_at em public.bookings.
--   2) A Edge Function send-booking-reminders precisa estar implantada
--      (ver instruções no topo de supabase/functions/send-booking-reminders/index.ts).
--   3) O mesmo segredo do Vault usado em notify-new-booking-trigger.sql
--      (notify_new_booking_service_role_key) precisa já existir — é a
--      mesma service_role key do projeto, não precisa cadastrar de novo.
--
-- Rode este arquivo em partes, na ordem, pelo SQL Editor do painel.

-- ─────────────────────────────────────────────────────────────────────────
-- PARTE 1 — habilita as extensões (idempotente)
-- ─────────────────────────────────────────────────────────────────────────
--
-- Se der erro de permissão no "create extension pg_cron", ative pelo
-- painel: Database → Extensions → busque "pg_cron" → Enable. Depois volte
-- e rode o resto deste arquivo normalmente.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- ─────────────────────────────────────────────────────────────────────────
-- PARTE 2 — troque a URL abaixo pela URL real da sua função e rode
-- ─────────────────────────────────────────────────────────────────────────
--
-- Troque <NOME-DA-FUNÇÃO> pelo nome que a Edge Function recebeu no painel
-- (o mesmo usado no passo de implantação — por padrão "send-booking-reminders",
-- mas o painel às vezes gera outro nome, como aconteceu com "rapid-endpoint"
-- na notify-new-booking. Confira em Edge Functions antes de rodar.)

select cron.unschedule('send-booking-reminders') where exists (
  select 1 from cron.job where jobname = 'send-booking-reminders'
);

select cron.schedule(
  'send-booking-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://gybpbnwzwtwjlgdukxgj.supabase.co/functions/v1/send-booking-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'notify_new_booking_service_role_key'
      ),
      -- Ver supabase/sql/webhook-secret.sql — sem ele a Edge Function recusa a chamada.
      'x-webhook-secret', (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'edge_webhook_secret'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ─────────────────────────────────────────────────────────────────────────
-- Pra conferir que está rodando: select * from cron.job;
-- Pra ver o histórico de execuções: select * from cron.job_run_details
--   order by start_time desc limit 20;
-- Pra parar: select cron.unschedule('send-booking-reminders');
-- ─────────────────────────────────────────────────────────────────────────
