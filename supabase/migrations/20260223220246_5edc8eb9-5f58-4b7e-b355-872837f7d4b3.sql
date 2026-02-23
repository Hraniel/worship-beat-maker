
-- Remove the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view plan pricing" ON public.plan_pricing;

-- Create a public view without sensitive Stripe fields
CREATE OR REPLACE VIEW public.public_plan_pricing AS
SELECT id, tier, name, price_brl, period, cta_text, highlight, badge_text,
       max_pads, max_imports, created_at, updated_at
FROM public.plan_pricing;

-- Grant access to the view for anon and authenticated roles
GRANT SELECT ON public.public_plan_pricing TO anon, authenticated;
