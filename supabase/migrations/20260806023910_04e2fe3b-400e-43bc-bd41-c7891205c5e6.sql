-- Only one security definer function remains in public: has_role.
-- Revoking execute permissions on it for anon and authenticated roles to satisfy the linter.
-- It's used internally by RLS, and service_role retains access.

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
