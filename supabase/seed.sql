-- D'Conde Barbearia — seed data
-- Run after schema.sql. Safe to re-run: every insert upserts on the primary key.

-- ---------------------------------------------------------------------------
-- barbers
-- ---------------------------------------------------------------------------
insert into public.barbers (id, name, role_title, instagram, photo_path, gallery_paths, sort_order) values
  ('daniel', 'Daniel', 'Fundador', '@danielconde_barbeiro', '/img/daniel.png', array['/img/daniel.png', '/img/daniel-02.png'], 1),
  ('joao', 'João Lima', 'Barbeiro', '@joaocabelu', '/img/joao.jpg', array['/img/joao.jpg', '/img/joao-02.png', '/img/joao-03.png'], 2)
on conflict (id) do update set
  name = excluded.name, role_title = excluded.role_title, instagram = excluded.instagram,
  photo_path = excluded.photo_path, gallery_paths = excluded.gallery_paths, sort_order = excluded.sort_order;

-- barber_hours: weekday 0=domingo .. 6=sábado
-- Daniel: seg-sex 09:00-20:00, sáb 08:00-18:00, dom fechado
insert into public.barber_hours (barber_id, weekday, is_open, label, slots) values
  ('daniel', 1, true, '09:00 — 20:00', array['09:00','10:00','11:00','13:30','14:30','15:30','16:30','18:00','19:00']::time[]),
  ('daniel', 2, true, '09:00 — 20:00', array['09:00','10:00','11:00','13:30','14:30','15:30','16:30','18:00','19:00']::time[]),
  ('daniel', 3, true, '09:00 — 20:00', array['09:00','10:00','11:00','13:30','14:30','15:30','16:30','18:00','19:00']::time[]),
  ('daniel', 4, true, '09:00 — 20:00', array['09:00','10:00','11:00','13:30','14:30','15:30','16:30','18:00','19:00']::time[]),
  ('daniel', 5, true, '09:00 — 20:00', array['09:00','10:00','11:00','13:30','14:30','15:30','16:30','18:00','19:00']::time[]),
  ('daniel', 6, true, '08:00 — 18:00', array['08:00','09:00','10:00','11:00','13:30','14:30','15:30','16:30']::time[]),
  ('daniel', 0, false, 'Fechado', '{}')
on conflict (barber_id, weekday) do update set
  is_open = excluded.is_open, label = excluded.label, slots = excluded.slots;

-- João Lima: seg-sex 10:00-20:00, sáb 08:00-18:00, dom fechado
insert into public.barber_hours (barber_id, weekday, is_open, label, slots) values
  ('joao', 1, true, '10:00 — 20:00', array['10:00','11:00','13:30','14:30','15:30','16:30','18:00','19:00']::time[]),
  ('joao', 2, true, '10:00 — 20:00', array['10:00','11:00','13:30','14:30','15:30','16:30','18:00','19:00']::time[]),
  ('joao', 3, true, '10:00 — 20:00', array['10:00','11:00','13:30','14:30','15:30','16:30','18:00','19:00']::time[]),
  ('joao', 4, true, '10:00 — 20:00', array['10:00','11:00','13:30','14:30','15:30','16:30','18:00','19:00']::time[]),
  ('joao', 5, true, '10:00 — 20:00', array['10:00','11:00','13:30','14:30','15:30','16:30','18:00','19:00']::time[]),
  ('joao', 6, true, '08:00 — 18:00', array['08:00','09:00','10:00','11:00','13:30','14:30','15:30','16:30']::time[]),
  ('joao', 0, false, 'Fechado', '{}')
on conflict (barber_id, weekday) do update set
  is_open = excluded.is_open, label = excluded.label, slots = excluded.slots;

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------
insert into public.services (id, name, description, duration_minutes, price_cents, sort_order) values
  ('barba-terapia', 'Barba terapia', 'Toalha quente, vapor, óleo e massagem antes da navalha. Termina com balm calmante.', 40, 5000, 1),
  ('barba-tradicional', 'Barba tradicional completa', 'Desenho do contorno e navalha na toalha quente, sem a etapa de terapia.', 30, 4500, 2),
  ('bigode', 'Bigode', 'Aparo e alinhamento só do bigode, na tesoura e navalha.', 10, 1000, 3),
  ('corte', 'Corte', 'Máquina e tesoura, do fade ao social, com finalização e acabamento na navalha.', 50, 4500, 4),
  ('corte-barba-terapia', 'Corte + barba terapia', 'O combo da casa: corte completo mais a barba terapia com toalha quente.', 80, 9500, 5),
  ('corte-barba-terapia-sobrancelha', 'Corte + barba terapia + sobrancelha', 'Corte, barba terapia e limpeza da sobrancelha no mesmo atendimento.', 80, 10000, 6),
  ('corte-barba-tradicional', 'Corte + barba tradicional', 'Corte completo mais barba na navalha, sem a etapa de vapor.', 70, 8000, 7),
  ('corte-barba-tradicional-sobrancelha', 'Corte + barba tradicional + sobrancelha', 'Corte, barba tradicional e sobrancelha alinhada.', 70, 8500, 8),
  ('corte-bigode', 'Corte + bigode', 'Corte completo com o bigode aparado e desenhado.', 60, 5500, 9),
  ('corte-bigode-sobrancelha', 'Corte + bigode + sobrancelha', 'Corte, bigode e sobrancelha no mesmo horário.', 60, 6000, 10),
  ('corte-sobrancelha', 'Corte + sobrancelha', 'Corte completo com a sobrancelha limpa na navalha.', 50, 5000, 11),
  ('corte-infantil', 'Corte infantil', 'Corte para crianças, com paciência e no tempo delas.', 50, 4500, 12),
  ('luzes', 'Luzes', 'Descoloração em mechas para dar contraste, com matização no fim.', 240, 15000, 13),
  ('pezinho', 'Pezinho', 'Retoque rápido da nuca e das costeletas entre um corte e outro.', 5, 2500, 14),
  ('platinado', 'Platinado', 'Descoloração global até o loiro platinado, com matização e cuidado no couro.', 300, 20000, 15),
  ('relaxamento', 'Relaxamento ( alisamento )', 'Alisamento químico para reduzir volume e frizz.', 30, 5000, 16),
  ('sobrancelha', 'Sobrancelha', 'Limpeza e desenho da sobrancelha na navalha.', 5, 1500, 17)
on conflict (id) do update set
  name = excluded.name, description = excluded.description, duration_minutes = excluded.duration_minutes,
  price_cents = excluded.price_cents, sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
insert into public.products (name, category, price_cents, stock, image_path) values
  ('Pomada modeladora efeito matte', 'Cabelo', 4800, 12, null),
  ('Óleo para barba 30ml', 'Barba', 3900, 4, null),
  ('Shampoo antirresíduo', 'Cabelo', 4200, 7, null),
  ('Balm pós-barba', 'Pele', 3500, 0, null),
  ('Talco barbeiro', 'Pele', 1800, 19, null),
  ('Cera capilar fixação forte', 'Cabelo', 5200, 9, null)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- gallery
-- ---------------------------------------------------------------------------
insert into public.gallery_photos (image_path, kind, service_label, client_label, barber_id, taken_on, sort_order) values
  ('/img/corte-04.jpg', 'autoral', 'Corte + sobrancelha', 'Gabriel M.', 'daniel', '2026-09-06', 1),
  ('/img/corte-01.jpg', 'dia', 'Corte', 'Rafael P.', 'joao', '2026-09-05', 2),
  ('/img/corte-03.jpg', 'autoral', 'Corte', 'Nina R.', 'daniel', '2026-09-03', 3),
  ('/img/corte-02.jpg', 'autoral', 'Platinado com coloração', 'Théo A.', 'daniel', '2026-08-30', 4),
  ('/img/barba.jpg', 'dia', 'Barba terapia', 'André N.', 'joao', '2026-08-28', 5),
  ('/img/corte-07.png', 'autoral', 'Platinado com coloração', 'Kauê S.', 'daniel', '2026-09-08', 6),
  ('/img/corte-05.png', 'dia', 'Corte', 'Enzo B.', 'daniel', '2026-09-08', 7),
  ('/img/corte-06.png', 'dia', 'Corte + sobrancelha', 'Matheus L.', 'joao', '2026-09-07', 8),
  ('/img/corte-08.png', 'autoral', 'Corte', 'Guilherme S.', 'joao', '2026-09-09', 9),
  ('/img/corte-09.png', 'dia', 'Corte infantil', 'Bernardo O.', 'daniel', '2026-09-09', 10),
  ('/img/corte-10.png', 'autoral', 'Corte', 'Lucas F.', 'joao', '2026-09-10', 11),
  ('/img/corte-11.png', 'autoral', 'Platinado com coloração', 'Vinícius T.', 'daniel', '2026-09-10', 12),
  ('/img/corte-12.png', 'autoral', 'Corte', 'Miguel A.', 'joao', '2026-09-10', 13),
  ('/img/corte-13.png', 'dia', 'Corte infantil', 'Davi R.', 'daniel', '2026-09-10', 14)
on conflict do nothing;
