
-- ── Plan features configuration ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL CHECK (tier IN ('free', 'pro', 'master')),
  feature_key text NOT NULL,
  feature_label text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tier, feature_key)
);

ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plan features"
  ON public.plan_features FOR SELECT USING (true);

CREATE POLICY "Admins can manage plan features"
  ON public.plan_features FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ── Plan pricing config ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL UNIQUE CHECK (tier IN ('free', 'pro', 'master')),
  name text NOT NULL,
  price_brl numeric(10,2) NOT NULL DEFAULT 0,
  period text NOT NULL DEFAULT '/mês',
  cta_text text NOT NULL DEFAULT 'Assinar',
  highlight boolean NOT NULL DEFAULT false,
  badge_text text,
  max_pads integer NOT NULL DEFAULT 4,
  max_imports integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plan pricing"
  ON public.plan_pricing FOR SELECT USING (true);

CREATE POLICY "Admins can manage plan pricing"
  ON public.plan_pricing FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ── Feature gates (block app areas by tier) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feature_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_key text NOT NULL UNIQUE,
  gate_label text NOT NULL,
  required_tier text NOT NULL DEFAULT 'free' CHECK (required_tier IN ('free', 'pro', 'master')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_gates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feature gates"
  ON public.feature_gates FOR SELECT USING (true);

CREATE POLICY "Admins can manage feature gates"
  ON public.feature_gates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ── Landing page configuration ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.landing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  config_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view landing config"
  ON public.landing_config FOR SELECT USING (true);

CREATE POLICY "Admins can manage landing config"
  ON public.landing_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ── Auto-update timestamps ─────────────────────────────────────────────────
CREATE TRIGGER update_plan_features_updated_at
  BEFORE UPDATE ON public.plan_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plan_pricing_updated_at
  BEFORE UPDATE ON public.plan_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feature_gates_updated_at
  BEFORE UPDATE ON public.feature_gates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_landing_config_updated_at
  BEFORE UPDATE ON public.landing_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Seed: default plan pricing ─────────────────────────────────────────────
INSERT INTO public.plan_pricing (tier, name, price_brl, period, cta_text, highlight, badge_text, max_pads, max_imports) VALUES
  ('free',   'Free',   0,     '',     'Começar grátis',  false, null,          4,   3),
  ('pro',    'Pro',    9.99,  '/mês', 'Assinar Pro',     true,  'Mais popular', 9999, 9999),
  ('master', 'Master', 14.99, '/mês', 'Assinar Master',  false, null,          9999, 9999)
ON CONFLICT (tier) DO NOTHING;

-- ── Seed: default plan features ───────────────────────────────────────────
INSERT INTO public.plan_features (tier, feature_key, feature_label, enabled, sort_order) VALUES
  ('free',   'basic_pads',        '4 pads por setlist',              true,  1),
  ('free',   'custom_imports',    '3 imports de sons customizados',  true,  2),
  ('free',   'metronome',         'Metrônomo + loops básicos',       true,  3),
  ('free',   'continuous_pads',   'Continuous Pads',                 true,  4),
  ('free',   'unlimited_pads',    'Pads ilimitados',                 false, 5),
  ('free',   'volume_per_pad',    'Volume individual por pad',       false, 6),
  ('free',   'audio_effects',     'Equalização e efeitos de áudio',  false, 7),
  ('free',   'spotify_ai',        'Spotify AI',                      false, 8),
  ('pro',    'unlimited_pads',    'Pads ilimitados',                 true,  1),
  ('pro',    'unlimited_imports', 'Imports ilimitados',              true,  2),
  ('pro',    'metronome_full',    'Metrônomo + loops completos',     true,  3),
  ('pro',    'continuous_pads',   'Continuous Pads (todos os tons)', true,  4),
  ('pro',    'volume_per_pad',    'Volume individual por pad',       true,  5),
  ('pro',    'glory_store',       'Glory Store — compra de packs',   true,  6),
  ('pro',    'audio_effects',     'Equalização por pad',             false, 7),
  ('pro',    'spotify_ai',        'Spotify AI',                      false, 8),
  ('master', 'everything_pro',    'Tudo do Pro',                     true,  1),
  ('master', 'equalizer',         'Equalizador completo por pad',    true,  2),
  ('master', 'reverb_delay',      'Reverb e Delay por pad',          true,  3),
  ('master', 'spotify_ai',        'Spotify AI',                      true,  4),
  ('master', 'glory_store_full',  'Glory Store acesso completo',     true,  5),
  ('master', 'priority_support',  'Suporte prioritário',             true,  6)
ON CONFLICT (tier, feature_key) DO NOTHING;

-- ── Seed: default feature gates ────────────────────────────────────────────
INSERT INTO public.feature_gates (gate_key, gate_label, required_tier, description) VALUES
  ('audio_effects',    'Efeitos de Áudio (EQ, Reverb, Delay)',   'master', 'Acesso ao painel de efeitos de áudio por pad'),
  ('spotify_ai',       'Spotify AI — Pads automáticos',          'master', 'Busca e configuração automática via Spotify'),
  ('volume_per_pad',   'Volume Individual por Pad',              'pro',    'Controle de volume individual em cada pad'),
  ('unlimited_pads',   'Pads Ilimitados',                        'pro',    'Mais de 4 pads por setlist'),
  ('glory_store',      'Compras na Glory Store',                 'pro',    'Comprar packs premium na loja'),
  ('performance_mode', 'Modo Performance',                       'pro',    'Modo de apresentação ao vivo')
ON CONFLICT (gate_key) DO NOTHING;

-- ── Seed: default landing config ───────────────────────────────────────────
INSERT INTO public.landing_config (config_key, config_value) VALUES
  ('hero_title',        'Seus pads de worship na palma da mão'),
  ('hero_subtitle',     'Pads profissionais, metrônomo, loops, continuous pads e Glory Store — tudo que o músico de louvor precisa, em um único app.'),
  ('hero_badge',        'Spotify AI integrado · PWA nativo'),
  ('features_title',    'Tudo que você precisa para o louvor'),
  ('features_subtitle', 'Desenvolvido por músicos de louvor, para músicos de louvor.'),
  ('store_title',       'Uma biblioteca de sons para cada momento'),
  ('store_subtitle',    'Sons de bateria secos, com reverb, loops, continuous pads, efeitos crescentes e muito mais. Novos packs chegam todo mês na Glory Store.'),
  ('plans_title',       'Comece grátis. Cresça quando quiser.'),
  ('plans_subtitle',    'Sem contrato, cancele quando quiser.'),
  ('show_pricing',      'true'),
  ('cta_title',         'Pronto para transformar seu louvor?'),
  ('cta_subtitle',      'Junte-se a músicos que já usam o Glory Pads para criar momentos de adoração inesquecíveis.'),
  ('stat_1_value',      '12+'),
  ('stat_1_label',      'Sons padrão inclusos'),
  ('stat_2_value',      '∞'),
  ('stat_2_label',      'Setlists por culto'),
  ('stat_3_value',      'AI'),
  ('stat_3_label',      'Spotify integrado'),
  ('stat_4_value',      'PWA'),
  ('stat_4_label',      'Instale no celular')
ON CONFLICT (config_key) DO NOTHING;
