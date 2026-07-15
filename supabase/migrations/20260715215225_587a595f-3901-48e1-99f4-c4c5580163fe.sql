
-- tg_set_updated_at doesn't need elevated privileges
ALTER FUNCTION public.tg_set_updated_at() SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;

-- has_role must stay SECURITY DEFINER (used in RLS), but restrict to authenticated only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
