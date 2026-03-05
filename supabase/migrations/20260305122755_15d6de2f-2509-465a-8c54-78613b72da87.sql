INSERT INTO public.feature_gates (gate_key, gate_label, required_tier, description)
VALUES ('pan_control', 'Controle de Pan (Stereo/Mono)', 'pro', 'Controle de roteamento de áudio Stereo/Mono e direcionamento L/R')
ON CONFLICT (gate_key) DO NOTHING;