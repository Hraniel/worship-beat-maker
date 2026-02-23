
-- Remove the SELECT policies we just added (they defeat the purpose)
DROP POLICY IF EXISTS "Authenticated can select plan_pricing for view" ON public.plan_pricing;
DROP POLICY IF EXISTS "Anon can select plan_pricing for view" ON public.plan_pricing;

-- Recreate view as SECURITY DEFINER (intentional: bypasses RLS to expose only safe columns)
DROP VIEW IF EXISTS public.public_plan_pricing;

CREATE VIEW public.public_plan_pricing
WITH (security_barrier = true) AS
SELECT id, tier, name, price_brl, period, cta_text, highlight, badge_text,
       max_pads, max_imports, created_at, updated_at
FROM public.plan_pricing;

-- The view owner (postgres) has full access, so no RLS needed on base table for public reads
GRANT SELECT ON public.public_plan_pricing TO anon, authenticated;
