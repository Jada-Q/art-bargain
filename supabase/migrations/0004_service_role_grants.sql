-- Service_role grants on the 5 public tables.
-- Auto-expose-new-tables was disabled at project creation, which omitted grants
-- not only for anon/authenticated (fixed in 0003) but also for service_role.
-- Without these, server-trusted writes (negotiation_turns, orders, etc.) fail
-- with 'permission denied' even though service_role normally bypasses RLS.

GRANT ALL ON public.artworks          TO service_role;
GRANT ALL ON public.comparable_sales  TO service_role;
GRANT ALL ON public.negotiations      TO service_role;
GRANT ALL ON public.negotiation_turns TO service_role;
GRANT ALL ON public.orders            TO service_role;

-- Future-proof: any new public table also picks up service_role privileges.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
