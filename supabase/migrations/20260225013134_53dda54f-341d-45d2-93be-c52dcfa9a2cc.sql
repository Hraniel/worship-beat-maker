ALTER TABLE public.store_packs ADD COLUMN IF NOT EXISTS card_title text DEFAULT NULL;
ALTER TABLE public.store_packs ADD COLUMN IF NOT EXISTS card_subtitle text DEFAULT NULL;