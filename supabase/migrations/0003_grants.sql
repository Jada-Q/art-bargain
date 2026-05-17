-- Explicit GRANTs to anon / authenticated roles.
-- Required because the project was created with "Automatically expose new tables" disabled —
-- without these grants RLS policies are unreachable (queries fail at permission check).
-- RLS continues to govern WHICH rows each role can see; GRANTs only allow the query to be attempted.

-- Public read on the static demo data.
GRANT SELECT ON public.comparable_sales TO anon, authenticated;

-- Browse / detail pages read live artworks anonymously. Owners do all the writes.
GRANT SELECT                          ON public.artworks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE  ON public.artworks TO authenticated;

-- Negotiations are party-only. Buyers create them; both parties can read/update.
GRANT SELECT, INSERT, UPDATE          ON public.negotiations TO authenticated;

-- Turns are read-only for the client; the agent coordinator writes via service_role.
GRANT SELECT                          ON public.negotiation_turns TO authenticated;

-- Orders likewise: clients read only, server creates / updates via service_role.
GRANT SELECT                          ON public.orders TO authenticated;
