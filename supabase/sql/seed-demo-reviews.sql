-- Placeholder testimonials to preview the site's "O que dizem nossos
-- clientes" section with real content in it while genuine reviews haven't
-- come in yet through the in-app "avalie seu atendimento" flow.
--
-- These are EXAMPLE reviews, not real customer feedback — inserted as
-- drafts (published = false) on purpose. Nothing here goes live until you
-- open the admin panel's "Avaliações" tab and click "Publicar" on the ones
-- you actually want shown. Edit the text/rating first in the Supabase
-- table editor if you want to tweak any of them, or just delete the rows
-- you don't want (from the admin tab, or here).
--
-- Safe to re-run: each row has a fixed id, so re-running just no-ops via
-- ON CONFLICT instead of duplicating them.
insert into public.reviews (id, booking_id, customer_id, customer_name, barber_id, service_id, rating, comment, published, created_at) values
  ('00000000-0000-4000-8000-000000000001', null, null, 'Rafael Prado', 'daniel', 'corte-barba-terapia', 5, 'Ambiente top, atendimento pontual e o resultado ficou impecável. Já é minha barbearia fixa.', false, now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000002', null, null, 'Lucas Andrade', 'joao', 'corte', 5, 'Melhor fade que já fiz na cidade. Recomendo de olhos fechados.', false, now() - interval '5 days'),
  ('00000000-0000-4000-8000-000000000003', null, null, 'Bruno Castilho', 'daniel', 'barba-terapia', 4, null, false, now() - interval '9 days'),
  ('00000000-0000-4000-8000-000000000004', null, null, 'Felipe Nogueira', 'joao', 'corte-barba-tradicional', 5, 'Atenção aos detalhes que faz diferença. Saí de lá outra pessoa.', false, now() - interval '13 days'),
  ('00000000-0000-4000-8000-000000000005', null, null, 'Thiago Ramos', 'daniel', 'luzes', 5, 'Quatro horas de cadeira e valeu cada minuto. Ficou exatamente como eu queria.', false, now() - interval '17 days'),
  ('00000000-0000-4000-8000-000000000006', null, null, 'Camila Duarte', 'joao', 'corte-infantil', 5, 'Levei meu filho e tiveram muita paciência com ele. Saiu sem chorar e ainda gostou do corte.', false, now() - interval '21 days'),
  ('00000000-0000-4000-8000-000000000007', null, null, 'André Bittencourt', 'daniel', 'platinado', 4, 'Ficou muito bom, só achei o preço salgado.', false, now() - interval '26 days'),
  ('00000000-0000-4000-8000-000000000008', null, null, 'Gustavo Lemos', 'joao', 'corte-bigode-sobrancelha', 5, null, false, now() - interval '31 days')
on conflict (id) do nothing;
