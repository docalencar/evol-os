-- PR-100 — Authorization, Roles & RLS Hardening
--
-- As políticas existentes continuam com a mesma semântica. O hardening apenas
-- remove a execução implícita por PUBLIC das funções auxiliares usadas pela RLS
-- e explicita que elas pertencem à superfície autenticada.

revoke all on function public.is_company_member(uuid) from public;
revoke all on function public.has_company_role(uuid, text[]) from public;
revoke all on function public.current_person_id(uuid) from public;

grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.has_company_role(uuid, text[]) to authenticated;
grant execute on function public.current_person_id(uuid) to authenticated;
