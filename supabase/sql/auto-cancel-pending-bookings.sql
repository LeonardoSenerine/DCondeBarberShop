-- D'Conde Barbearia — cancela automaticamente as solicitações de agendamento
-- que ficaram "em análise" (status 'pending') sem o barbeiro aceitar ou
-- recusar. Duas regras, vale a que vier primeiro:
--   1) passaram mais de 24 horas desde que o cliente fez a solicitação;
--   2) o horário marcado chegou (horário de Brasília) e ninguém confirmou.
--
-- Como o cancelamento libera o horário: public.booked_slots() e a constraint
-- bookings_no_overlap (schema.sql) ignoram tudo que está 'cancelled', então
-- assim que o status muda o horário volta a aparecer como livre no site pra
-- qualquer cliente. Enquanto está 'pending' ele continua bloqueado.
--
-- Como o cliente é avisado: o cancelamento preenche decline_reason (com o
-- motivo de cada regra), o mesmo campo usado quando o barbeiro recusa. Com
-- isso o cliente vê o aviso em "Meus agendamentos" e, se
-- supabase/sql/notify-booking-declined-trigger.sql
-- já estiver aplicado, também recebe o e-mail "seu agendamento não pôde ser
-- confirmado" com esse motivo. Não precisa de Edge Function nova.
--
-- Não precisa de nenhum pré-requisito além do schema.sql. Rode este arquivo
-- inteiro uma vez no SQL Editor do painel (é idempotente).

-- ─────────────────────────────────────────────────────────────────────────
-- PARTE 1 — habilita o agendador (idempotente)
-- ─────────────────────────────────────────────────────────────────────────
--
-- Se der erro de permissão no "create extension pg_cron", ative pelo
-- painel: Database → Extensions → busque "pg_cron" → Enable. Depois volte
-- e rode o resto deste arquivo normalmente.

create extension if not exists pg_cron;

-- ─────────────────────────────────────────────────────────────────────────
-- PARTE 2 — a função que cancela (idempotente)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.auto_cancel_stale_pending_bookings()
returns integer
language plpgsql
as $$
declare
  cancelled_count integer;
begin
  -- scheduled_date + scheduled_time é um horário "de parede" (sem fuso),
  -- então a comparação usa o relógio de Brasília, não o UTC do servidor.
  update public.bookings
  set status = 'cancelled',
      decline_reason = case
        when (scheduled_date + scheduled_time) < (now() at time zone 'America/Sao_Paulo')
          then 'O horário solicitado chegou sem que a barbearia confirmasse a solicitação.'
        else 'A solicitação não foi confirmada pela barbearia em até 24 horas.'
      end
  where status = 'pending'
    and (
      created_at < now() - interval '24 hours'
      or (scheduled_date + scheduled_time) < (now() at time zone 'America/Sao_Paulo')
    );

  get diagnostics cancelled_count = row_count;
  return cancelled_count;
end;
$$;

-- Só o agendador (que roda como postgres) precisa chamar isto. Por padrão o
-- Postgres libera EXECUTE pra todo mundo, e o Supabase expõe funções do
-- schema public como RPC — sem isto qualquer visitante poderia chamá-la.
revoke execute on function public.auto_cancel_stale_pending_bookings() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- PARTE 3 — agenda pra rodar a cada 15 minutos
-- ─────────────────────────────────────────────────────────────────────────
--
-- Na prática o cancelamento acontece até 15 minutos depois de a regra valer.

select cron.unschedule('auto-cancel-pending-bookings') where exists (
  select 1 from cron.job where jobname = 'auto-cancel-pending-bookings'
);

select cron.schedule(
  'auto-cancel-pending-bookings',
  '*/15 * * * *',
  $$ select public.auto_cancel_stale_pending_bookings(); $$
);

-- ─────────────────────────────────────────────────────────────────────────
-- Pra conferir que está agendado: select * from cron.job;
-- Pra ver o histórico de execuções: select * from cron.job_run_details
--   order by start_time desc limit 20;
-- Pra testar sem esperar: select public.auto_cancel_stale_pending_bookings();
--   (retorna quantas solicitações foram canceladas)
-- Pra parar: select cron.unschedule('auto-cancel-pending-bookings');
-- ─────────────────────────────────────────────────────────────────────────
