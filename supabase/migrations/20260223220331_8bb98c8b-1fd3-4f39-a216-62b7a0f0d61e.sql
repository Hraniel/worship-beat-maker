
-- Fix: Change view to SECURITY INVOKER (default, safe)
DROP VIEW IF EXISTS public.public_plan_pricing;

CREATE VIEW public.public_plan_pricing
WITH (security_invoker = true) AS
SELECT id, tier, name, price_brl, period, cta_text, highlight, badge_text,
       max_pads, max_imports, created_at, updated_at
FROM public.plan_pricing;

GRANT SELECT ON public.public_plan_pricing TO anon, authenticated;

-- Add a SELECT policy for anon/authenticated on plan_pricing so the view works
-- but only expose non-sensitive columns through the view
CREATE POLICY "Authenticated can select plan_pricing for view"
  ON public.plan_pricing FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon can select plan_pricing for view"
  ON public.plan_pricing FOR SELECT
  TO anon
  USING (true);
