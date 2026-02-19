
-- Add stripe fields to store_packs
ALTER TABLE public.store_packs
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;

-- Add stripe_price_id to plan_pricing
ALTER TABLE public.plan_pricing
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Populate initial stripe_price_id for existing plans (from tiers.ts)
UPDATE public.plan_pricing
  SET stripe_price_id = 'price_1T19YHRsrW8NGuEjGhc8E2Xb'
  WHERE tier = 'pro' AND stripe_price_id IS NULL;

UPDATE public.plan_pricing
  SET stripe_price_id = 'price_1T19YXRsrW8NGuEjDybPdEic'
  WHERE tier = 'master' AND stripe_price_id IS NULL;
