
-- Create store_config table
CREATE TABLE public.store_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key text NOT NULL UNIQUE,
  config_value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage store config"
ON public.store_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public read
CREATE POLICY "Anyone can view store config"
ON public.store_config
FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_store_config_updated_at
BEFORE UPDATE ON public.store_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial values
INSERT INTO public.store_config (config_key, config_value) VALUES
  ('store_title', 'Glory Store'),
  ('store_subtitle', 'Descubra novos sons, packs e texturas sonoras para elevar seu louvor.'),
  ('library_title', 'Minha Biblioteca'),
  ('library_active_label', 'Ativos'),
  ('library_removed_label', 'Removidos'),
  ('search_placeholder', 'Buscar packs por nome ou descrição...'),
  ('filter_labels', '{"all":"Todos","purchased":"Adquiridos","available":"Disponíveis","removed":"Removidos"}'),
  ('categories', '[{"name":"Percussão","icon":"drum","subs":["Kick","Snare","Hi-Hat","Tom","Crash","Ride","Shaker","Tambourine","Cowbell","Clap"]},{"name":"Cordas & Teclas","icon":"piano","subs":["Piano","Organ","Synth Pad","Guitar","Bass","Strings","Harp"]},{"name":"Vocais & Choir","icon":"mic","subs":["Choir","Vocal Pad","Backing Vocal","Humming","Whisper"]},{"name":"Ambiente & FX","icon":"wind","subs":["Atmosphere","Rain","Thunder","Wind","Nature","Transition","Riser","Impact"]},{"name":"Loops & Beats","icon":"repeat","subs":["Drum Loop","Percussion Loop","Full Beat","Groove","Click Track"]},{"name":"Orquestral","icon":"music","subs":["Orchestra Hit","Timpani","Brass","Woodwind","Cinematic"]}]');
