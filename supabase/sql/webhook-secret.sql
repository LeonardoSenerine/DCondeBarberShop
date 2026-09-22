-- D'Conde Barbearia — segredo compartilhado entre o banco e as Edge Functions
--
-- Por quê: o gateway das Edge Functions aceita qualquer JWT válido do
-- projeto, inclusive a chave pública (anon) que vai no JS do site. Então só
-- o "Authorization" não prova que a chamada veio dos nossos triggers. Com
-- este segredo, as funções recusam (401) tudo que não trouxer o header
-- x-webhook-secret certo.
--
-- ORDEM (sem deixar nenhum e-mail cair no meio do caminho):
--   1) Rode a PARTE 1 abaixo e copie o valor que ela mostrar.
--   2) Cadastre esse valor como secret WEBHOOK_SECRET nas Edge Functions:
--      Painel → Edge Functions → Secrets (vale para todas as funções) →
--      Add new secret → Nome: WEBHOOK_SECRET → Valor: o que você copiou.
--      (Com CLI: supabase secrets set WEBHOOK_SECRET=<valor>)
--   3) Rode de novo a PARTE 2 de cada um destes arquivos (eles já enviam o
--      header novo; as funções antigas simplesmente ignoram o header):
--        - notify-new-booking-trigger.sql
--        - notify-booking-declined-trigger.sql
--        - notify-booking-cancelled-trigger.sql
--        - schedule-booking-reminders.sql
--   4) Por último, reimplante as 4 Edge Functions com o código novo
--      (rapid-endpoint = notify-new-booking, notify-booking-declined,
--      notify-booking-cancelled-by-customer, send-booking-reminders).
--
-- Para trocar o segredo no futuro: rode a PARTE 3, atualize o
-- WEBHOOK_SECRET no painel com o novo valor. Não precisa mexer nos triggers.

-- ─────────────────────────────────────────────────────────────────────────
-- PARTE 1 — cria o segredo (uma vez só) e mostra o valor para copiar
-- ─────────────────────────────────────────────────────────────────────────

select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'edge_webhook_secret')
where not exists (select 1 from vault.secrets where name = 'edge_webhook_secret');

select decrypted_secret as webhook_secret
from vault.decrypted_secrets
where name = 'edge_webhook_secret';

-- ─────────────────────────────────────────────────────────────────────────
-- PARTE 3 — (opcional) gerar um valor novo para o segredo
-- ─────────────────────────────────────────────────────────────────────────
--
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'edge_webhook_secret'),
--     encode(extensions.gen_random_bytes(32), 'hex')
--   );
