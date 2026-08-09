begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;

select plan(24);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('11000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'notification-owner@test.local', '', now(), now(), now()),
  ('11000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'notification-admin@test.local', '', now(), now(), now()),
  ('11000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'notification-hr@test.local', '', now(), now(), now()),
  ('11000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'notification-recipient@test.local', '', now(), now(), now()),
  ('11000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'notification-other@test.local', '', now(), now(), now()),
  ('11000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'notification-cross@test.local', '', now(), now(), now());

insert into public.companies (id, name, slug) values
  ('21000000-0000-4000-8000-000000000001', 'Notification Test', 'notification-test'),
  ('21000000-0000-4000-8000-000000000002', 'Notification Cross', 'notification-cross');

insert into public.company_members (company_id, user_id, role) values
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'owner'),
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000002', 'admin'),
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000003', 'hr'),
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000004', 'employee'),
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000005', 'employee'),
  ('21000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000006', 'owner');

insert into public.people (
  id, company_id, user_id, full_name, manager_id
) values
  ('31000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000002', 'Notification Manager', null),
  ('31000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000004', 'Notification Employee', '31000000-0000-4000-8000-000000000002'),
  ('31000000-0000-4000-8000-000000000003', '21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000005', 'Notification Other', null),
  ('31000000-0000-4000-8000-000000000004', '21000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000006', 'Notification Cross', null);

insert into public.activity_events (
  id, company_id, activity_type, module, title, description, actor_type,
  actor_id, entity_type, entity_id, subject_type, subject_id, visibility, metadata
) values (
  '41000000-0000-4000-8000-000000000001',
  '21000000-0000-4000-8000-000000000001',
  'employee.updated', 'people', 'Colaborador atualizado', 'Dados atualizados.',
  'user', '11000000-0000-4000-8000-000000000001',
  'employee', '31000000-0000-4000-8000-000000000001',
  'employee', '31000000-0000-4000-8000-000000000001', 'company', '{}'
);

set local role service_role;
select set_config(
  'request.jwt.claims',
  '{"sub":"11000000-0000-4000-8000-000000000001","role":"service_role"}',
  true
);

select lives_ok(
  $$ select public.persist_notification_event(
    jsonb_build_object(
      'event_key', 'people.activity:41000000-0000-4000-8000-000000000001',
      'company_id', '21000000-0000-4000-8000-000000000001',
      'producer_key', 'people.activity', 'event_type', 'employee.updated',
      'source_type', 'activity', 'source_id', '41000000-0000-4000-8000-000000000001',
      'actor_id', '11000000-0000-4000-8000-000000000001',
      'classification', 'company', 'requirement', 'optional',
      'type', 'information', 'priority', 'normal',
      'title', 'Colaborador atualizado', 'message', 'Dados atualizados.',
      'entity_type', 'employee', 'entity_id', '31000000-0000-4000-8000-000000000001',
      'subject_type', 'employee', 'subject_id', '31000000-0000-4000-8000-000000000001',
      'metadata', '{}'::jsonb, 'occurred_at', now()
    ),
    jsonb_build_array(
      jsonb_build_object(
        'delivery_key', 'people.activity:41000000-0000-4000-8000-000000000001:11000000-0000-4000-8000-000000000004:in_app',
        'recipient_id', '11000000-0000-4000-8000-000000000004', 'channel', 'in_app'
      ),
      jsonb_build_object(
        'delivery_key', 'people.activity:41000000-0000-4000-8000-000000000001:11000000-0000-4000-8000-000000000002:in_app',
        'recipient_id', '11000000-0000-4000-8000-000000000002', 'channel', 'in_app'
      )
    )
  ) $$,
  'technical RPC persists registered event and resolved recipients'
);

select results_eq(
  $$ select count(*) from public.notification_events where company_id = '21000000-0000-4000-8000-000000000001' $$,
  array[1::bigint],
  'one Notification Event is persisted'
);
select results_eq(
  $$ select count(*) from public.notification_deliveries where company_id = '21000000-0000-4000-8000-000000000001' $$,
  array[2::bigint],
  'one delivery per resolved recipient is persisted'
);
select results_eq(
  $$ select count(*) from public.notifications where company_id = '21000000-0000-4000-8000-000000000001' $$,
  array[2::bigint],
  'in-app read models are persisted'
);

select lives_ok(
  $$ select public.persist_notification_event(
    jsonb_build_object(
      'event_key', 'people.activity:41000000-0000-4000-8000-000000000001',
      'company_id', '21000000-0000-4000-8000-000000000001',
      'producer_key', 'people.activity', 'event_type', 'employee.updated',
      'source_type', 'activity', 'source_id', '41000000-0000-4000-8000-000000000001',
      'actor_id', '11000000-0000-4000-8000-000000000001',
      'classification', 'company', 'requirement', 'optional',
      'type', 'information', 'priority', 'normal',
      'title', 'Colaborador atualizado', 'message', 'Dados atualizados.',
      'entity_type', 'employee', 'entity_id', '31000000-0000-4000-8000-000000000001',
      'subject_type', 'employee', 'subject_id', '31000000-0000-4000-8000-000000000001',
      'metadata', '{}'::jsonb, 'occurred_at', now()
    ),
    jsonb_build_array(jsonb_build_object(
      'delivery_key', 'people.activity:41000000-0000-4000-8000-000000000001:11000000-0000-4000-8000-000000000004:in_app',
      'recipient_id', '11000000-0000-4000-8000-000000000004', 'channel', 'in_app'
    ))
  ) $$,
  'technical persistence is idempotent'
);
select results_eq(
  $$ select count(*) from public.notifications where company_id = '21000000-0000-4000-8000-000000000001' $$,
  array[2::bigint],
  'idempotent retry creates no duplicate read model'
);
select results_eq(
  $$ select count(*) from public.notification_delivery_attempts where company_id = '21000000-0000-4000-8000-000000000001' $$,
  array[2::bigint],
  'idempotent retry creates no duplicate attempt after delivery'
);

select set_config(
  'notification_test.delivered_id',
  (select id::text from public.notification_deliveries where recipient_id = '11000000-0000-4000-8000-000000000004'),
  false
);

select throws_ok(
  $$ select public.persist_notification_event(
    jsonb_build_object(
      'event_key', 'people.activity:41000000-0000-4000-8000-000000000001',
      'company_id', '21000000-0000-4000-8000-000000000001',
      'producer_key', 'people.activity', 'event_type', 'employee.updated',
      'source_type', 'activity', 'source_id', '41000000-0000-4000-8000-000000000001',
      'actor_id', '11000000-0000-4000-8000-000000000001',
      'classification', 'company', 'requirement', 'optional',
      'type', 'information', 'priority', 'normal',
      'title', 'Colaborador atualizado', 'message', 'Dados atualizados.',
      'entity_type', 'employee', 'entity_id', '31000000-0000-4000-8000-000000000001',
      'subject_type', 'employee', 'subject_id', '31000000-0000-4000-8000-000000000001',
      'metadata', '{}'::jsonb, 'occurred_at', now()
    ),
    jsonb_build_array(jsonb_build_object(
      'delivery_key', 'people.activity:41000000-0000-4000-8000-000000000001:11000000-0000-4000-8000-000000000005:in_app',
      'recipient_id', '11000000-0000-4000-8000-000000000005', 'channel', 'in_app'
    ))
  ) $$,
  '42501', 'NOTIFICATION_RECIPIENT_INVALID',
  'technical RPC rejects unresolved recipient'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select results_eq(
  $$ select count(*) from public.notifications $$,
  array[1::bigint],
  'recipient reads only own notification'
);
select lives_ok(
  $$ update public.notifications set status = 'read', read_at = now()
     where recipient_id = auth.uid() and status = 'unread' $$,
  'recipient marks own notification as read'
);
select throws_ok(
  $$ update public.notifications set title = 'Alterado' where recipient_id = auth.uid() $$,
  '42501', 'permission denied for table notifications',
  'recipient cannot alter notification content'
);
select lives_ok(
  $$ insert into public.notification_preferences (company_id, user_id, in_app_enabled)
     values ('21000000-0000-4000-8000-000000000001', auth.uid(), false) $$,
  'recipient manages own preference'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
select results_eq($$ select count(*) from public.notifications $$, array[0::bigint], 'unrelated member reads no notification');
select results_eq($$ select count(*) from public.notification_preferences $$, array[0::bigint], 'member reads no preference of another user');
select throws_ok(
  $$ insert into public.notifications (company_id, recipient_id, title, message)
     values ('21000000-0000-4000-8000-000000000001', auth.uid(), 'Fake', 'Fake') $$,
  '42501', 'permission denied for table notifications',
  'authenticated user cannot produce notification directly'
);
select throws_ok(
  $$ select public.persist_notification_event('{}'::jsonb, '[]'::jsonb) $$,
  '42501', 'permission denied for function persist_notification_event',
  'authenticated user cannot invoke technical RPC'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
select results_eq($$ select count(*) from public.notifications $$, array[0::bigint], 'cross-tenant owner reads no notification');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select results_eq($$ select count(*) from public.notifications $$, array[0::bigint], 'owner has no direct third-party content access');
select ok(
  not (public.read_notification_delivery_metadata(
    '21000000-0000-4000-8000-000000000001',
    current_setting('notification_test.delivered_id')::uuid,
    'inspect_delivery'
  ) ? 'title'),
  'owner inspects operational metadata without content'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$ select public.read_notification_delivery_metadata(
    '21000000-0000-4000-8000-000000000001',
    current_setting('notification_test.delivered_id')::uuid,
    'inspect_delivery'
  ) $$,
  '42501', 'NOTIFICATION_ADMIN_PERMISSION_DENIED',
  'hr has no transversal administrative access'
);

reset role;
insert into public.notification_deliveries (
  company_id, event_id, recipient_id, channel, delivery_key, status, last_error_code
) select
  company_id, id, '11000000-0000-4000-8000-000000000005', 'in_app',
  event_key || ':manual-failed:in_app', 'failed', 'temporary_failure'
from public.notification_events
where company_id = '21000000-0000-4000-8000-000000000001';

select set_config(
  'notification_test.failed_id',
  (select id::text from public.notification_deliveries where last_error_code = 'temporary_failure'),
  false
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select ok(
  public.reprocess_notification_delivery(
    '21000000-0000-4000-8000-000000000001',
    current_setting('notification_test.failed_id')::uuid,
    'retry_failure'
  ),
  'admin requests reprocessing of failed delivery'
);
select ok(
  public.resend_notification_delivery(
    '21000000-0000-4000-8000-000000000001',
    current_setting('notification_test.delivered_id')::uuid,
    'resend_delivery'
  ),
  'admin requests idempotent resend of delivered delivery'
);
select throws_ok(
  $$ select count(*) from public.notification_audit $$,
  '42501', 'permission denied for table notification_audit',
  'administrative audit is not directly readable'
);

reset role;
select results_eq(
  $$ select count(*) from public.notification_audit $$,
  array[3::bigint],
  'every administrative operation is audited'
);

select * from finish();
rollback;
