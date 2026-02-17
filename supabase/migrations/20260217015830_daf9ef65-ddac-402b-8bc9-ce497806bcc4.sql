
-- Store packs catalog
CREATE TABLE public.store_packs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  icon_name text NOT NULL DEFAULT 'music',
  color text NOT NULL DEFAULT 'bg-violet-500',
  tag text,
  is_available boolean NOT NULL DEFAULT false,
  price_cents integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.store_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available packs"
ON public.store_packs FOR SELECT
USING (true);

-- Pack sounds (individual sounds within a pack)
CREATE TABLE public.pack_sounds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id uuid NOT NULL REFERENCES public.store_packs(id) ON DELETE CASCADE,
  name text NOT NULL,
  short_name text NOT NULL,
  category text NOT NULL,
  file_path text,
  preview_path text,
  duration_ms integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pack_sounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pack sounds"
ON public.pack_sounds FOR SELECT
USING (true);

-- User purchases
CREATE TABLE public.user_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  pack_id uuid NOT NULL REFERENCES public.store_packs(id) ON DELETE CASCADE,
  purchased_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, pack_id)
);

ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
ON public.user_purchases FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases"
ON public.user_purchases FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Storage bucket for sound packs
INSERT INTO storage.buckets (id, name, public) VALUES ('sound-packs', 'sound-packs', false);

-- Preview files are public (short, watermarked)
INSERT INTO storage.buckets (id, name, public) VALUES ('sound-previews', 'sound-previews', true);

-- Public can read previews
CREATE POLICY "Public can read previews"
ON storage.objects FOR SELECT
USING (bucket_id = 'sound-previews');

-- Only purchased users can download full sounds
CREATE POLICY "Purchased users can download sounds"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'sound-packs'
  AND EXISTS (
    SELECT 1 FROM public.user_purchases up
    WHERE up.user_id = auth.uid()
    AND up.pack_id::text = (storage.foldername(name))[1]
  )
);

-- Service role can upload to both buckets (edge functions)
CREATE POLICY "Service role can upload sound packs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id IN ('sound-packs', 'sound-previews'));

CREATE POLICY "Service role can update sound packs"
ON storage.objects FOR UPDATE
USING (bucket_id IN ('sound-packs', 'sound-previews'));
