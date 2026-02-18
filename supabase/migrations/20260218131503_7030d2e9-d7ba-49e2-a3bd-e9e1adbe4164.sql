-- Add banner_url column to store_packs for pack cover images
ALTER TABLE public.store_packs ADD COLUMN IF NOT EXISTS banner_url text;
