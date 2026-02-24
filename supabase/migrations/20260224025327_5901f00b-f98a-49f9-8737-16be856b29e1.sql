
-- Table to store admin translation overrides (merged on top of static JSON files)
CREATE TABLE public.translation_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  locale text NOT NULL,
  key_path text NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(locale, key_path)
);

ALTER TABLE public.translation_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage translations"
  ON public.translation_overrides FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read translations"
  ON public.translation_overrides FOR SELECT
  USING (true);
