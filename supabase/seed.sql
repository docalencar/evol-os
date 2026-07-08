-- Evol People / Evol Performance
-- seed.sql
-- Execute após schema.sql e rls.sql
-- Observação: este seed não cria usuários no auth.users.
-- Ele cria dados de empresa e estrutura para testes com acesso via service role ou SQL Editor.

insert into public.companies (id, name, slug, segment, employee_range, status)
values
('00000000-0000-0000-0000-000000000001', 'Hotel Alfa', 'hotel-alfa', 'Hotel', '51-100', 'trial')
on conflict (slug) do nothing;

insert into public.teams (id, company_id, name, description)
values
('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Recepção', 'Equipe de atendimento ao hóspede'),
('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Restaurante', 'Equipe de salão e cozinha'),
('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'Governança', 'Equipe de limpeza e organização')
on conflict do nothing;

insert into public.positions (id, company_id, name, description)
values
('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Gerente de Operações', 'Responsável pela operação geral'),
('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 'Recepcionista', 'Atendimento ao hóspede'),
('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', 'Garçom', 'Atendimento no restaurante'),
('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001', 'Camareira', 'Governança e organização dos quartos')
on conflict do nothing;

insert into public.people (id, company_id, full_name, email, status, team_id, position_id, disc_profile)
values
('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', 'Carlos Menezes', 'carlos@hotelalfa.com', 'active', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201', 'D'),
('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000001', 'Ana Bezerra', 'ana@hotelalfa.com', 'active', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000202', 'I'),
('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000001', 'João Lima', 'joao@hotelalfa.com', 'active', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000203', 'S'),
('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000001', 'Maria Silva', 'maria@hotelalfa.com', 'active', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000204', 'C')
on conflict do nothing;

update public.people
set manager_id = '00000000-0000-0000-0000-000000000301'
where id in (
  '00000000-0000-0000-0000-000000000302',
  '00000000-0000-0000-0000-000000000303',
  '00000000-0000-0000-0000-000000000304'
);

insert into public.competencies (id, company_id, name, description, category, active)
values
('00000000-0000-0000-0000-000000000401', null, 'Comunicação', 'Capacidade de transmitir ideias com clareza e escutar ativamente.', 'Comportamental', true),
('00000000-0000-0000-0000-000000000402', null, 'Organização', 'Capacidade de planejar, priorizar e cumprir combinados.', 'Comportamental', true),
('00000000-0000-0000-0000-000000000403', null, 'Atendimento ao Cliente', 'Capacidade de atender clientes com atenção, empatia e resolução.', 'Técnica', true),
('00000000-0000-0000-0000-000000000404', null, 'Trabalho em Equipe', 'Capacidade de colaborar e contribuir com o time.', 'Comportamental', true)
on conflict do nothing;

insert into public.assessment_templates (id, company_id, name, type, active)
values
('00000000-0000-0000-0000-000000000501', null, 'Avaliação Mensal Evol', 'monthly', true)
on conflict do nothing;

insert into public.assessment_questions (id, template_id, competency_id, question, order_index)
values
('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000401', 'A pessoa se comunica com clareza e respeito?', 1),
('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000402', 'A pessoa cumpre combinados e mantém organização nas entregas?', 2),
('00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000403', 'A pessoa entrega uma boa experiência ao cliente?', 3),
('00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000404', 'A pessoa contribui positivamente com o time?', 4)
on conflict do nothing;

insert into public.events (company_id, type, payload)
values
('00000000-0000-0000-0000-000000000001', 'company.seeded', '{"source":"seed.sql","message":"Empresa de exemplo criada"}');
