
-- Tabela de features da landing page (seção "Recursos")
CREATE TABLE public.landing_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon_name TEXT NOT NULL DEFAULT 'sparkles',
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.landing_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view landing features"
ON public.landing_features FOR SELECT
USING (true);

CREATE POLICY "Admins can manage landing features"
ON public.landing_features FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER update_landing_features_updated_at
BEFORE UPDATE ON public.landing_features
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket para imagens dos cards de recursos
INSERT INTO storage.buckets (id, name, public)
VALUES ('landing-assets', 'landing-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Landing assets are public"
ON storage.objects FOR SELECT
USING (bucket_id = 'landing-assets');

CREATE POLICY "Admins can upload landing assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'landing-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update landing assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'landing-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete landing assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'landing-assets' AND has_role(auth.uid(), 'admin'::app_role));

-- Realtime para landing_features
ALTER PUBLICATION supabase_realtime ADD TABLE public.landing_features;

-- Seed com os dados hardcoded atuais
INSERT INTO public.landing_features (title, description, icon_name, sort_order, enabled) VALUES
  ('Pads Profissionais', 'Sons reais de bateria, pads e efeitos — 12 sons inclusos gratuitamente, com Glory Store para expandir.', 'Drum', 1, true),
  ('Setlists Organizadas', 'Crie setlists por culto com pads e configurações salvas automaticamente. Compartilhe com um link.', 'ListMusic', 2, true),
  ('Mixer Completo', 'Volume individual, pan estéreo e equalização por pad no plano Master.', 'SlidersHorizontal', 3, true),
  ('Spotify AI', 'Detecta o tom e BPM da música no Spotify e configura os pads automaticamente — plano Master.', 'Cpu', 4, true),
  ('Continuous Pads', 'Texturas sonoras contínuas em qualquer tom para criar atmosferas imersivas no louvor.', 'Waves', 5, true),
  ('Loop Engine', 'Sistema de loops sincronizado com metrônomo e BPM. Grave e dispare loops em tempo real.', 'AudioWaveform', 6, true),
  ('Efeitos de Áudio', 'Reverb, delay e compressão por pad para moldar cada som ao ambiente do culto.', 'Headphones', 7, true),
  ('PWA — Instale no Celular', 'Funciona como app nativo no iPhone e Android. Sem loja, sem espera — instale direto do navegador.', 'Smartphone', 8, true);
