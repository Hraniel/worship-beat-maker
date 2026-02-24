import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Loader2, Palette, Type, ToggleLeft, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface ConfigRow {
  id: string;
  config_key: string;
  config_value: string;
}

type SectionId = 'tema' | 'textos' | 'toggles' | 'onboarding' | 'rewards';

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode; emoji: string }[] = [
  { id: 'tema', label: 'Tema & Cores', icon: <Palette className="h-3.5 w-3.5" />, emoji: '🎨' },
  { id: 'textos', label: 'Textos do App', icon: <Type className="h-3.5 w-3.5" />, emoji: '📝' },
  { id: 'toggles', label: 'Feature Toggles', icon: <ToggleLeft className="h-3.5 w-3.5" />, emoji: '⚙️' },
  { id: 'onboarding', label: 'Onboarding', icon: <BookOpen className="h-3.5 w-3.5" />, emoji: '🎓' },
  { id: 'rewards', label: 'Recompensas', icon: <ToggleLeft className="h-3.5 w-3.5" />, emoji: '🎁' },
];

const THEME_FIELDS = [
  { key: 'app_primary_color', label: 'Cor Primária', hint: 'Cor principal dos botões e acentos', default: '#8b5cf6' },
  { key: 'app_accent_color', label: 'Cor de Acento', hint: 'Cor secundária/destaque', default: '#6366f1' },
  { key: 'app_bg_color', label: 'Cor de Fundo', hint: 'Fundo principal do app', default: '#0a0a0a' },
  { key: 'app_card_bg_color', label: 'Fundo dos Cards', hint: 'Fundo de cards e painéis', default: '#171717' },
  { key: 'app_text_color', label: 'Cor do Texto', hint: 'Cor principal do texto', default: '#ffffff' },
  { key: 'app_muted_color', label: 'Cor do Texto Secundário', hint: 'Texto de menor destaque', default: '#a1a1aa' },
];

const TEXT_FIELDS = [
  { key: 'app_welcome_title', label: 'Título de Boas-vindas', default: 'Bem-vindo ao Glory Pads' },
  { key: 'app_welcome_subtitle', label: 'Subtítulo de Boas-vindas', default: 'Configure seus sons e comece a tocar.' },
  { key: 'app_empty_setlist_msg', label: 'Setlist Vazia', default: 'Nenhuma setlist criada ainda.' },
  { key: 'app_empty_library_msg', label: 'Biblioteca Vazia', default: 'Nenhum som na biblioteca.' },
  { key: 'app_offline_msg', label: 'Mensagem Offline', default: 'Você está offline. Alguns recursos podem não funcionar.' },
  { key: 'app_upgrade_title', label: 'Título de Upgrade', default: 'Desbloqueie todo o potencial' },
  { key: 'app_upgrade_description', label: 'Descrição de Upgrade', default: 'Faça upgrade para acessar recursos premium.' },
];

const TOGGLE_FIELDS = [
  { key: 'app_enable_metronome', label: 'Metrônomo', desc: 'Ativar/desativar o metrônomo no app' },
  { key: 'app_enable_mixer', label: 'Mixer', desc: 'Ativar/desativar o mixer de volumes' },
  { key: 'app_enable_setlists', label: 'Setlists', desc: 'Ativar/desativar o gerenciador de setlists' },
  { key: 'app_enable_ambient', label: 'Ambient Pads', desc: 'Ativar/desativar pads de ambiente' },
  { key: 'app_enable_store', label: 'Glory Store', desc: 'Ativar/desativar a loja de sons' },
  { key: 'app_enable_midi', label: 'MIDI', desc: 'Ativar/desativar suporte MIDI' },
  { key: 'app_enable_performance', label: 'Modo Performance', desc: 'Ativar/desativar o modo performance' },
  { key: 'app_enable_loop', label: 'Loop Engine', desc: 'Ativar/desativar gravação de loops' },
  { key: 'app_enable_effects', label: 'Efeitos de Pad', desc: 'Ativar/desativar efeitos sonoros nos pads' },
  { key: 'app_enable_bpm_search', label: 'Busca de BPM', desc: 'Ativar/desativar busca de BPM por música' },
];

const ONBOARDING_FIELDS = [
  { key: 'app_onboarding_enabled', label: 'Ativar Tutorial', type: 'toggle' as const, desc: 'Mostrar tutorial na primeira visita' },
  { key: 'app_onboarding_step1_title', label: 'Passo 1 — Título', default: 'Toque nos Pads' },
  { key: 'app_onboarding_step1_desc', label: 'Passo 1 — Descrição', default: 'Toque nos pads para reproduzir sons.' },
  { key: 'app_onboarding_step2_title', label: 'Passo 2 — Título', default: 'Configure seus Sons' },
  { key: 'app_onboarding_step2_desc', label: 'Passo 2 — Descrição', default: 'Segure um pad para personalizar.' },
  { key: 'app_onboarding_step3_title', label: 'Passo 3 — Título', default: 'Crie sua Setlist' },
  { key: 'app_onboarding_step3_desc', label: 'Passo 3 — Descrição', default: 'Organize suas músicas para o culto.' },
];

const AdminAppConfigEditor: React.FC = () => {
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [rewardRows, setRewardRows] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<SectionId>('tema');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [landingRes, appRes] = await Promise.all([
        supabase.from('landing_config').select('*').order('config_key'),
        supabase.from('app_config' as any).select('*').order('config_key'),
      ]);
      if (landingRes.data) setRows(landingRes.data as any as ConfigRow[]);
      if (appRes.data) setRewardRows(appRes.data as any as ConfigRow[]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const getVal = (key: string, defaultVal = '') => rows.find(r => r.config_key === key)?.config_value ?? defaultVal;
  const setVal = (key: string, value: string) => {
    setRows(prev => {
      const exists = prev.some(r => r.config_key === key);
      return exists
        ? prev.map(r => r.config_key === key ? { ...r, config_value: value } : r)
        : [...prev, { id: '', config_key: key, config_value: value }];
    });
  };

  const saveKey = async (key: string) => {
    const value = rows.find(r => r.config_key === key)?.config_value ?? '';
    setSaving(key);
    try {
      const { data: existing } = await supabase.from('landing_config').select('id').eq('config_key', key).maybeSingle();
      if (existing) await supabase.from('landing_config').update({ config_value: value }).eq('config_key', key);
      else await supabase.from('landing_config').insert({ config_key: key, config_value: value });
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(null); }
  };

  // Reward config helpers (app_config table)
  const getRewardVal = (key: string, defaultVal = '') => rewardRows.find(r => r.config_key === key)?.config_value ?? defaultVal;
  const setRewardVal = (key: string, value: string) => {
    setRewardRows(prev => {
      const exists = prev.some(r => r.config_key === key);
      return exists
        ? prev.map(r => r.config_key === key ? { ...r, config_value: value } : r)
        : [...prev, { id: '', config_key: key, config_value: value }];
    });
  };
  const saveRewardKey = async (key: string) => {
    const value = rewardRows.find(r => r.config_key === key)?.config_value ?? '';
    setSaving(key);
    try {
      const { data: existing } = await supabase.from('app_config' as any).select('id').eq('config_key', key).maybeSingle();
      if (existing) await (supabase.from('app_config' as any) as any).update({ config_value: value }).eq('config_key', key);
      else await (supabase.from('app_config' as any) as any).insert({ config_key: key, config_value: value });
      toast.success('Salvo!');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'hsl(262 75% 65%)' }} />
    </div>
  );

  const inputStyle = { border: '1px solid hsl(0 0% 100% / 0.1)', background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 100%)' };
  const groupStyle = { border: '1px solid hsl(0 0% 100% / 0.08)', background: 'hsl(0 0% 100% / 0.02)' };
  const labelStyle: React.CSSProperties = { color: 'hsl(0 0% 100% / 0.4)' };

  return (
    <div className="space-y-3">
      <p className="text-[11px]" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>
        Configure tema, textos, funcionalidades e onboarding do aplicativo.
      </p>

      {SECTIONS.map(section => {
        const isOpen = openSection === section.id;
        return (
          <div key={section.id} className="rounded-xl overflow-hidden" style={groupStyle}>
            <button onClick={() => setOpenSection(isOpen ? section.id : section.id)}
              className="w-full flex items-center justify-between px-4 py-3"
              style={isOpen ? {} : {}}>
              <div className="flex items-center gap-2">
                <span className="text-sm">{section.emoji}</span>
                <span className="text-xs font-semibold" style={{ color: isOpen ? 'hsl(262 75% 75%)' : 'hsl(0 0% 100% / 0.7)' }}>{section.label}</span>
              </div>
              {isOpen ? <ChevronUp className="h-3.5 w-3.5" style={{ color: 'hsl(0 0% 100% / 0.4)' }} />
                : <ChevronDown className="h-3.5 w-3.5" style={{ color: 'hsl(0 0% 100% / 0.4)' }} />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-3">
                {/* Tema */}
                {section.id === 'tema' && THEME_FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={labelStyle}>{f.label}</label>
                    <p className="text-[9px] mb-1.5" style={{ color: 'hsl(0 0% 100% / 0.3)' }}>{f.hint}</p>
                    <div className="flex items-center gap-2">
                      <input type="color" value={getVal(f.key, f.default)}
                        onChange={e => { setVal(f.key, e.target.value); }}
                        onBlur={() => saveKey(f.key)}
                        className="h-8 w-8 rounded cursor-pointer border-0 p-0.5 shrink-0" />
                      <input type="text" value={getVal(f.key, f.default)}
                        onChange={e => setVal(f.key, e.target.value)} onBlur={() => saveKey(f.key)}
                        className="flex-1 h-8 px-2.5 text-xs rounded-lg focus:outline-none font-mono" style={inputStyle} />
                      <div className="h-8 w-8 rounded-lg shrink-0 border" style={{ background: getVal(f.key, f.default), borderColor: 'hsl(0 0% 100% / 0.1)' }} />
                    </div>
                  </div>
                ))}

                {/* Textos */}
                {section.id === 'textos' && TEXT_FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={labelStyle}>{f.label}</label>
                    <div className="flex gap-2">
                      <input className="flex-1 h-8 px-2.5 text-xs rounded-lg focus:outline-none" style={inputStyle}
                        value={getVal(f.key, f.default)} onChange={e => setVal(f.key, e.target.value)} onBlur={() => saveKey(f.key)} />
                      <button onClick={() => { saveKey(f.key); toast.success('Salvo!'); }} disabled={saving === f.key}
                        className="shrink-0 p-1.5 rounded-lg transition"
                        style={{ background: 'hsl(262 75% 55% / 0.2)', color: 'hsl(262 75% 65%)' }}>
                        {saving === f.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                ))}

                {/* Feature Toggles */}
                {section.id === 'toggles' && TOGGLE_FIELDS.map(f => (
                  <div key={f.key} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid hsl(0 0% 100% / 0.06)' }}>
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'hsl(0 0% 100% / 0.8)' }}>{f.label}</p>
                      <p className="text-[10px]" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>{f.desc}</p>
                    </div>
                    <Switch
                      checked={getVal(f.key, 'true') !== 'false'}
                      onCheckedChange={v => {
                        setVal(f.key, v ? 'true' : 'false');
                        setTimeout(() => saveKey(f.key), 0);
                        toast.success(v ? `${f.label} ativado` : `${f.label} desativado`);
                      }}
                    />
                  </div>
                ))}

                {/* Onboarding */}
                {section.id === 'onboarding' && (
                  <div className="space-y-3">
                    {/* Enable toggle */}
                    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid hsl(0 0% 100% / 0.06)' }}>
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'hsl(0 0% 100% / 0.8)' }}>Ativar Tutorial</p>
                        <p className="text-[10px]" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>Mostrar tutorial na primeira visita</p>
                      </div>
                      <Switch
                        checked={getVal('app_onboarding_enabled', 'true') !== 'false'}
                        onCheckedChange={v => {
                          setVal('app_onboarding_enabled', v ? 'true' : 'false');
                          setTimeout(() => saveKey('app_onboarding_enabled'), 0);
                        }}
                      />
                    </div>

                    {/* Steps */}
                    {[1, 2, 3].map(n => {
                      const titleKey = `app_onboarding_step${n}_title`;
                      const descKey = `app_onboarding_step${n}_desc`;
                      const titleField = ONBOARDING_FIELDS.find(f => f.key === titleKey);
                      const descField = ONBOARDING_FIELDS.find(f => f.key === descKey);
                      return (
                        <div key={n} className="space-y-2 pb-3" style={{ borderBottom: n < 3 ? '1px solid hsl(0 0% 100% / 0.06)' : 'none' }}>
                          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(0 0% 100% / 0.5)' }}>Passo {n}</p>
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={labelStyle}>Título</label>
                            <input className="w-full h-8 px-2.5 text-xs rounded-lg focus:outline-none" style={inputStyle}
                              value={getVal(titleKey, titleField?.default || '')} onChange={e => setVal(titleKey, e.target.value)} onBlur={() => saveKey(titleKey)} />
                          </div>
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={labelStyle}>Descrição</label>
                            <textarea className="w-full px-2.5 py-1.5 text-xs rounded-lg resize-none focus:outline-none"
                              style={{ ...inputStyle, minHeight: '48px' }}
                              value={getVal(descKey, descField?.default || '')} onChange={e => setVal(descKey, e.target.value)} onBlur={() => saveKey(descKey)} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Rewards */}
                {section.id === 'rewards' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid hsl(0 0% 100% / 0.06)' }}>
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'hsl(0 0% 100% / 0.8)' }}>Recompensa por Perfil Completo</p>
                        <p className="text-[10px]" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>Dar dias extras grátis para Pro/Master que completarem o perfil</p>
                      </div>
                      <Switch
                        checked={getRewardVal('profile_completion_reward_enabled', 'true') === 'true'}
                        onCheckedChange={v => {
                          setRewardVal('profile_completion_reward_enabled', v ? 'true' : 'false');
                          setTimeout(() => saveRewardKey('profile_completion_reward_enabled'), 0);
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={labelStyle}>Dias de recompensa</label>
                      <p className="text-[9px] mb-1.5" style={{ color: 'hsl(0 0% 100% / 0.3)' }}>Quantos dias extras o usuário Pro/Master ganha ao completar o perfil</p>
                      <div className="flex gap-2">
                        <input type="number" min="1" max="365"
                          className="w-24 h-8 px-2.5 text-xs rounded-lg focus:outline-none" style={inputStyle}
                          value={getRewardVal('profile_completion_reward_days', '7')}
                          onChange={e => setRewardVal('profile_completion_reward_days', e.target.value)}
                          onBlur={() => saveRewardKey('profile_completion_reward_days')} />
                        <span className="text-xs self-center" style={{ color: 'hsl(0 0% 100% / 0.5)' }}>dias</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AdminAppConfigEditor;
