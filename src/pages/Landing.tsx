import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useBodyScroll } from '@/hooks/useBodyScroll';
import { useLandingConfig, type LandingFeature } from '@/hooks/useLandingConfig';
import logoDark from '@/assets/logo-dark.png';
import logoLight from '@/assets/logo-light.png';
import {
  Music, Headphones, Zap, Crown, Check, X, ChevronDown,
  Layers, Sparkles, Volume2, ArrowRight, Drum, AudioWaveform,
  Waves, ListMusic, SlidersHorizontal, Cpu, Smartphone,
  Star, Radio, Mic2, Search, BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TIERS } from '@/lib/tiers';

// Map icon name string → Lucide component
const ICON_MAP: Record<string, React.ElementType> = {
  Drum, ListMusic, SlidersHorizontal, Cpu, Waves, AudioWaveform,
  Headphones, Smartphone, Sparkles, Music, Volume2, Layers,
  Zap, Star, Radio, Mic2, Search, BarChart3, Crown,
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  }),
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

// Helper: map tailwind size key to class
const titleSizeClass = (size: string) => {
  const map: Record<string, string> = {
    'xs': 'text-xs', 'sm': 'text-sm', 'base': 'text-base', 'lg': 'text-lg',
    'xl': 'text-xl', '2xl': 'text-2xl', '3xl': 'text-3xl', '4xl': 'text-4xl',
    '5xl': 'text-5xl', '6xl': 'text-6xl', '7xl': 'text-5xl sm:text-7xl',
    '8xl': 'text-6xl sm:text-8xl',
  };
  return map[size] ?? 'text-5xl sm:text-7xl';
};

const categories = [
  { name: 'Kick & Bumbo', color: '0 75% 55%', icon: '🥁' },
  { name: 'Snare', color: '30 85% 55%', icon: '🪘' },
  { name: 'Hi-Hat & Pratos', color: '50 80% 50%', icon: '🎵' },
  { name: 'Loops', color: '262 75% 55%', icon: '🔁' },
  { name: 'Continuous Pads', color: '200 80% 55%', icon: '🎹' },
  { name: 'Efeitos', color: '340 70% 55%', icon: '✨' },
];

// Gradient divider between sections
const Divider = ({ fromLight, darkColor }: { fromLight: boolean; darkColor: string }) => (
  <div
    className="w-full h-24 pointer-events-none"
    style={{
      background: fromLight
        ? `linear-gradient(to bottom, hsl(0 0% 97%), ${darkColor})`
        : `linear-gradient(to bottom, ${darkColor}, hsl(0 0% 97%))`,
    }}
  />
);

// Nav
const Nav = ({ navigate }: { navigate: ReturnType<typeof useNavigate> }) => (
  <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b"
    style={{
      background: 'hsl(0 0% 100% / 0.96)',
      borderColor: 'hsl(0 0% 0% / 0.08)',
      paddingTop: 'env(safe-area-inset-top)',
    }}>
    <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src={logoDark} alt="Glory Pads" className="h-8 w-auto" />
        <span className="font-bold text-lg text-foreground hidden sm:inline">Glory Pads</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <a href="#recursos" className="text-sm text-muted-foreground hover:text-foreground transition hidden sm:inline">Recursos</a>
        <a href="#sons" className="text-sm text-muted-foreground hover:text-foreground transition hidden sm:inline">Sons</a>
        <a href="#planos" className="text-sm text-muted-foreground hover:text-foreground transition hidden sm:inline">Planos</a>
        <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="text-foreground/70 hover:text-foreground">
          Entrar
        </Button>
        <Button size="sm" onClick={() => navigate('/auth?mode=signup')}
          className="bg-foreground text-background hover:bg-foreground/90 font-semibold">
          Começar grátis
        </Button>
      </div>
    </div>
  </nav>
);

// Hero — dynamic styles
const Hero = ({ navigate, config }: { navigate: ReturnType<typeof useNavigate>; config: Record<string, string> }) => {
  const bg = config.hero_bg || 'hsl(0 0% 97%)';
  const titleColor = config.hero_title_color || 'hsl(220 15% 10%)';
  const titleSize = titleSizeClass(config.hero_title_size || '7xl');
  const subtitleColor = config.hero_subtitle_color || 'hsl(220 15% 40%)';
  const badgeBg = config.hero_badge_bg || 'hsl(262 75% 55% / 0.06)';
  const badgeColor = config.hero_badge_color || 'hsl(262 75% 55%)';

  const pt = config.hero_pt ? `${config.hero_pt}px` : undefined;
  const pb = config.hero_pb ? `${config.hero_pb}px` : undefined;

  return (
    <section className="relative overflow-hidden" style={{
      background: bg,
      paddingTop: pt ?? 'calc(env(safe-area-inset-top) + 7rem)',
      paddingBottom: pb ?? '0',
    }}>
      <div className="relative max-w-5xl mx-auto px-4 text-center pb-20">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp} custom={0}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6"
            style={{ border: `1px solid ${badgeColor} / 0.2`, background: badgeBg }}>
            <Sparkles className="h-3.5 w-3.5" style={{ color: badgeColor }} />
            <span className="text-xs font-medium" style={{ color: badgeColor }}>
              {config.hero_badge || 'Spotify AI integrado · PWA nativo'}
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1}
            className={`${titleSize} font-extrabold tracking-tight leading-[1.08] mb-6`}
            style={{ color: titleColor }}>
            {(config.hero_title || 'Seus pads de worship na palma da mão')
              .split('worship').map((part, i, arr) => (
                <React.Fragment key={i}>
                  {part}
                  {i < arr.length - 1 && <span className="text-primary">worship</span>}
                </React.Fragment>
              ))}
          </motion.h1>

          <motion.p variants={fadeUp} custom={2}
            className="text-lg sm:text-xl max-w-2xl mx-auto mb-10"
            style={{ color: subtitleColor }}>
            {config.hero_subtitle || 'Pads profissionais, metrônomo, loops, continuous pads e Glory Store — tudo que o músico de louvor precisa, em um único app.'}
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => navigate('/auth?mode=signup')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-xl"
              style={{ boxShadow: '0 0 40px hsl(var(--primary) / 0.25)' }}>
              Começar gratuitamente
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => {
              document.getElementById('recursos')?.scrollIntoView({ behavior: 'smooth' });
            }} className="text-lg px-8 py-6 rounded-xl">
              Ver recursos
              <ChevronDown className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>

        {/* App preview mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-3xl mx-auto mt-16"
        >
          <div className="relative rounded-2xl p-3 sm:p-5 shadow-2xl"
            style={{
              border: '1px solid hsl(0 0% 0% / 0.1)',
              background: 'hsl(220 15% 10%)',
            }}>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {[
                { name: 'KCK', label: 'Kick', color: '0 75% 55%' },
                { name: 'SNR', label: 'Snare', color: '30 85% 55%' },
                { name: 'HHC', label: 'Hi-Hat', color: '50 80% 50%' },
                { name: 'HHO', label: 'Open HH', color: '50 80% 50%' },
                { name: 'CRS', label: 'Crash', color: '340 70% 55%' },
                { name: 'CLP', label: 'Clap', color: '140 60% 45%' },
                { name: 'WSP', label: 'Loop', color: '262 75% 55%' },
                { name: 'WFL', label: 'Loop 2', color: '262 75% 55%' },
              ].map((pad, i) => (
                <motion.div key={pad.name}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.05, duration: 0.35 }}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center relative overflow-hidden"
                  style={{
                    background: `linear-gradient(145deg, hsl(0 0% 9%) 0%, hsl(0 0% 5%) 100%)`,
                    border: `1.5px solid hsl(${pad.color} / 0.28)`,
                    boxShadow: `0 0 18px hsl(${pad.color} / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.04)`,
                  }}>
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: `hsl(${pad.color})` }} />
                  <motion.div className="absolute inset-0 rounded-xl"
                    style={{ background: `radial-gradient(circle at center, hsl(${pad.color} / 0.2) 0%, transparent 70%)` }}
                    animate={{ opacity: [0.3, 0.65, 0.3] }}
                    transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }} />
                  <span className="relative text-base sm:text-lg font-bold tracking-wider" style={{ color: `hsl(${pad.color})` }}>{pad.name}</span>
                  <span className="relative text-[9px] sm:text-[10px] mt-0.5" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>{pad.label}</span>
                </motion.div>
              ))}
            </div>
            <div className="mt-3 flex gap-1.5">
              {[
                { note: 'C', color: '0 75% 55%' }, { note: 'D', color: '30 85% 55%' },
                { note: 'E', color: '50 80% 50%' }, { note: 'F', color: '140 60% 45%' },
                { note: 'G', color: '200 75% 50%' }, { note: 'A', color: '262 75% 55%' },
              ].map((n, i) => (
                <motion.div key={n.note}
                  className="flex-1 h-9 sm:h-10 rounded-lg flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: `linear-gradient(180deg, hsl(${n.color} / 0.18) 0%, hsl(${n.color} / 0.04) 100%)`,
                    border: `1px solid hsl(${n.color} / 0.22)`,
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 + i * 0.06, duration: 0.4 }}>
                  <motion.div className="absolute inset-0"
                    style={{ background: `radial-gradient(ellipse at bottom, hsl(${n.color} / 0.28) 0%, transparent 80%)` }}
                    animate={{ opacity: [0.2, 0.55, 0.2] }}
                    transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }} />
                  <span className="relative text-[10px] sm:text-xs font-semibold" style={{ color: `hsl(${n.color} / 0.85)` }}>{n.note}</span>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 rounded-full"
            style={{ background: 'hsl(var(--primary) / 0.15)', filter: 'blur(60px)' }} />
        </motion.div>
      </div>
    </section>
  );
};

// Stats — dynamic styles
const Stats = ({ config }: { config: Record<string, string> }) => {
  const bg = config.stats_bg || 'hsl(220 15% 7%)';
  const valueColor = config.stats_value_color || 'hsl(0 0% 100%)';
  const labelColor = config.stats_label_color || 'hsl(0 0% 100% / 0.4)';

  const stats = [
    { value: config.stat_1_value || '12+', label: config.stat_1_label || 'Sons padrão inclusos' },
    { value: config.stat_2_value || '∞', label: config.stat_2_label || 'Setlists por culto' },
    { value: config.stat_3_value || 'AI', label: config.stat_3_label || 'Spotify integrado' },
    { value: config.stat_4_value || 'PWA', label: config.stat_4_label || 'Instale no celular' },
  ];
  const pt = config.stats_pt ? `${config.stats_pt}px` : '64px';
  const pb = config.stats_pb ? `${config.stats_pb}px` : '64px';
  return (
    <section style={{ background: bg, paddingTop: pt, paddingBottom: pb, paddingLeft: '1rem', paddingRight: '1rem' }}>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
        variants={stagger}
        className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} variants={fadeUp} custom={i}>
            <div className="text-4xl sm:text-5xl font-black mb-2" style={{ color: valueColor }}>{stat.value}</div>
            <div className="text-sm font-medium" style={{ color: labelColor }}>{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

// Features — dynamic styles
const Features = ({
  navigate, config, landingFeatures,
}: {
  navigate: ReturnType<typeof useNavigate>;
  config: Record<string, string>;
  landingFeatures: LandingFeature[];
}) => {
  const bg = config.features_bg || 'hsl(0 0% 97%)';
  const cardBg = config.features_card_bg || 'hsl(0 0% 100%)';
  const cardBorder = config.features_card_border || 'hsl(0 0% 0% / 0.07)';
  const titleColor = config.features_title_color || 'hsl(220 15% 10%)';
  const subtitleColor = config.features_subtitle_color || 'hsl(220 15% 40%)';

  const visible = landingFeatures.filter(f => f.enabled).sort((a, b) => a.sort_order - b.sort_order);

  const pt = config.features_pt ? `${config.features_pt}px` : '80px';
  const pb = config.features_pb ? `${config.features_pb}px` : '112px';
  return (
    <section id="recursos" style={{ background: bg, paddingTop: pt, paddingBottom: pb, paddingLeft: '1rem', paddingRight: '1rem' }}>
      <div className="max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger} className="text-center mb-14">
          <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Recursos</motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-5xl font-extrabold mb-4" style={{ color: titleColor }}>
            {config.features_title || 'Tudo que você precisa para o louvor'}
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="max-w-lg mx-auto" style={{ color: subtitleColor }}>
            {config.features_subtitle || 'Desenvolvido por músicos de louvor, para músicos de louvor.'}
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visible.map((f, i) => {
            const IconComponent = ICON_MAP[f.icon_name] ?? Sparkles;
            return (
              <motion.div key={f.id} variants={fadeUp} custom={i}
                className="group rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300"
                style={{ border: `1px solid ${cardBorder}`, background: cardBg }}>
                {f.image_url ? (
                  <div className="w-full h-32 overflow-hidden">
                    <img src={f.image_url} alt={f.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="px-6 pt-6 pb-2">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-4 transition"
                      style={{ background: 'hsl(var(--primary) / 0.08)' }}>
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                )}
                <div className={f.image_url ? 'px-6 pb-6 pt-4' : 'px-6 pb-6'}>
                  <h3 className="font-semibold mb-2 text-sm" style={{ color: titleColor }}>{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: subtitleColor }}>{f.description}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
          className="mt-12 text-center">
          <Button size="lg" onClick={() => navigate('/auth?mode=signup')}
            className="bg-foreground text-background hover:bg-foreground/85 text-base px-8 py-5 rounded-xl font-semibold">
            Experimente grátis
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

// Sound categories — dynamic styles
const SoundSection = ({ navigate, config }: { navigate: ReturnType<typeof useNavigate>; config: Record<string, string> }) => {
  const bg = config.store_bg || 'hsl(220 15% 7%)';
  const titleColor = config.store_title_color || 'hsl(0 0% 100%)';
  const subtitleColor = config.store_subtitle_color || 'hsl(0 0% 100% / 0.45)';

  return (
    <section id="sons" style={{ background: bg, paddingTop: config.store_pt ? `${config.store_pt}px` : '80px', paddingBottom: config.store_pb ? `${config.store_pb}px` : '112px', paddingLeft: '1rem', paddingRight: '1rem' }}>
      <div className="max-w-5xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger} className="text-center mb-14">
          <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Glory Store</motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-5xl font-extrabold mb-4" style={{ color: titleColor }}>
            {config.store_title || 'Uma biblioteca de sons para cada momento'}
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="max-w-lg mx-auto" style={{ color: subtitleColor }}>
            {config.store_subtitle || 'Sons de bateria secos, com reverb, loops, continuous pads, efeitos crescentes e muito mais.'}
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {categories.map((cat, i) => (
            <motion.div key={cat.name} variants={fadeUp} custom={i}
              className="group relative rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 cursor-pointer"
              style={{
                border: `1px solid hsl(${cat.color} / 0.2)`,
                background: `linear-gradient(145deg, hsl(${cat.color} / 0.08) 0%, ${bg} 100%)`,
              }}
              onClick={() => navigate('/auth?mode=signup')}>
              <div className="text-3xl mb-3">{cat.icon}</div>
              <h3 className="font-bold text-lg mb-1" style={{ color: titleColor }}>{cat.name}</h3>
              <p className="text-xs" style={{ color: subtitleColor }}>Pack disponível na loja</p>
              <div className="mt-2 h-1 w-8 rounded-full" style={{ background: `hsl(${cat.color})` }} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// How it works — WHITE (static section)
const HowItWorks = ({ config }: { config: Record<string, string> }) => (
  <section style={{ background: 'hsl(0 0% 97%)', paddingTop: config.howitworks_pt ? `${config.howitworks_pt}px` : '80px', paddingBottom: config.howitworks_pb ? `${config.howitworks_pb}px` : '112px', paddingLeft: '1rem', paddingRight: '1rem' }}>
    <div className="max-w-4xl mx-auto">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger} className="text-center mb-14">
        <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Como funciona</motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-5xl font-extrabold text-foreground mb-4">
          Do ensaio ao culto<br />em <span className="text-primary">3 passos</span>
        </motion.h2>
      </motion.div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
        className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { step: '01', title: 'Crie sua Setlist', desc: 'Adicione músicas, configure os pads de cada uma e salve. Tudo sincronizado na nuvem.' },
          { step: '02', title: 'Configure os Sons', desc: 'Escolha sons da biblioteca, importe os seus ou use Spotify AI para configurar automaticamente.' },
          { step: '03', title: 'Toque ao Vivo', desc: 'No culto, abra o setlist, selecione a música e toque. Metrônomo e loops sincronizados.' },
        ].map((item, i) => (
          <motion.div key={item.step} variants={fadeUp} custom={i} className="relative">
            <div className="text-6xl font-black leading-none mb-3" style={{ color: 'hsl(0 0% 0% / 0.06)' }}>{item.step}</div>
            <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

// Pricing — dynamic styles
const Pricing = ({
  navigate, config, pricing, features,
}: {
  navigate: ReturnType<typeof useNavigate>;
  config: Record<string, string>;
  pricing: any[];
  features: any[];
}) => {
  if (config.show_pricing === 'false') return null;

  const bg = config.pricing_bg || 'hsl(220 15% 7%)';
  const titleColor = config.pricing_title_color || 'hsl(0 0% 100%)';
  const subtitleColor = config.pricing_subtitle_color || 'hsl(0 0% 100% / 0.45)';
  const tierOrder = ['free', 'pro', 'master'];

  return (
    <section id="planos" style={{ background: bg, paddingTop: config.pricing_pt ? `${config.pricing_pt}px` : '80px', paddingBottom: config.pricing_pb ? `${config.pricing_pb}px` : '112px', paddingLeft: '1rem', paddingRight: '1rem' }}>
      <div className="max-w-5xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger} className="text-center mb-14">
          <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Planos</motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-5xl font-extrabold mb-4" style={{ color: titleColor }}>
            {config.plans_title || 'Comece grátis. Cresça quando quiser.'}
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="max-w-lg mx-auto" style={{ color: subtitleColor }}>
            {config.plans_subtitle || 'Sem contrato, cancele quando quiser.'}
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {tierOrder.map((tierKey, i) => {
            const plan = pricing.find(p => p.tier === tierKey);
            if (!plan) return null;
            const tierFeats = features.filter(f => f.tier === tierKey).sort((a: any, b: any) => a.sort_order - b.sort_order);

            return (
              <motion.div key={tierKey} variants={fadeUp} custom={i}
                className="relative rounded-2xl p-7 sm:p-8 flex flex-col"
                style={plan.highlight ? {
                  background: 'hsl(0 0% 100%)',
                  border: '2px solid hsl(0 0% 100%)',
                  transform: 'scale(1.02)',
                  boxShadow: '0 20px 60px hsl(0 0% 0% / 0.4)',
                } : {
                  border: '1px solid hsl(0 0% 100% / 0.1)',
                  background: 'hsl(0 0% 100% / 0.03)',
                }}>
                {plan.badge_text && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1 rounded-full"
                    style={{ background: 'hsl(var(--primary))', color: 'hsl(0 0% 100%)' }}>
                    {plan.badge_text}
                  </span>
                )}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    {tierKey === 'master' && <Crown className="h-5 w-5" style={{ color: plan.highlight ? 'hsl(var(--primary))' : 'hsl(45 80% 55%)' }} />}
                    {tierKey === 'pro' && <Zap className="h-5 w-5" style={{ color: plan.highlight ? 'hsl(var(--primary))' : 'hsl(262 75% 65%)' }} />}
                    <h3 className="text-xl font-bold" style={{ color: plan.highlight ? 'hsl(220 15% 10%)' : 'hsl(0 0% 100%)' }}>{plan.name}</h3>
                  </div>
                  <div className="text-4xl font-black" style={{ color: plan.highlight ? 'hsl(220 15% 10%)' : 'hsl(0 0% 100%)' }}>
                    {plan.price_brl === 0 ? 'Grátis' : `R$${Number(plan.price_brl).toFixed(2)}`}
                    {plan.period && <span className="text-base font-normal ml-1" style={{ color: plan.highlight ? 'hsl(0 0% 0% / 0.4)' : 'hsl(0 0% 100% / 0.35)' }}>{plan.period}</span>}
                  </div>
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {tierFeats.map((f: any) => (
                    <li key={f.feature_key} className="flex items-start gap-2.5 text-sm"
                      style={{ color: f.enabled ? (plan.highlight ? 'hsl(220 15% 15%)' : 'hsl(0 0% 100%)') : (plan.highlight ? 'hsl(0 0% 0% / 0.2)' : 'hsl(0 0% 100% / 0.2)') }}>
                      {f.enabled
                        ? <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'hsl(142 70% 50%)' }} />
                        : <X className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'hsl(0 0% 50%)' }} />}
                      {f.feature_label}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => navigate('/auth?mode=signup')}
                  className="w-full rounded-xl py-5 font-semibold"
                  style={plan.highlight ? {
                    background: 'hsl(220 15% 10%)',
                    color: 'hsl(0 0% 100%)',
                  } : {
                    background: 'hsl(0 0% 100% / 0.1)',
                    color: 'hsl(0 0% 100%)',
                    border: '1px solid hsl(0 0% 100% / 0.15)',
                  }}
                >
                  {plan.cta_text}
                </Button>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

// CTA Final — dynamic styles
const FinalCTA = ({ navigate, config }: { navigate: ReturnType<typeof useNavigate>; config: Record<string, string> }) => {
  const bg = config.cta_bg || 'hsl(0 0% 97%)';
  const cardBg = config.cta_card_bg || 'hsl(0 0% 100%)';
  const titleColor = config.cta_title_color || 'hsl(220 15% 10%)';
  const subtitleColor = config.cta_subtitle_color || 'hsl(220 15% 40%)';

  return (
    <section style={{ background: bg, paddingTop: config.cta_pt ? `${config.cta_pt}px` : '80px', paddingBottom: config.cta_pb ? `${config.cta_pb}px` : '112px', paddingLeft: '1rem', paddingRight: '1rem' }}>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
        className="max-w-3xl mx-auto text-center">
        <motion.div variants={fadeUp} custom={0}
          className="relative rounded-3xl p-10 sm:p-16 overflow-hidden"
          style={{ border: '1px solid hsl(0 0% 0% / 0.07)', background: cardBg }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full pointer-events-none"
            style={{ background: 'hsl(var(--primary) / 0.06)', filter: 'blur(100px)' }} />
          <div className="relative">
            <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Glory Pads</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-5xl font-extrabold mb-5" style={{ color: titleColor }}>
              {config.cta_title || 'Pronto para transformar seu louvor?'}
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mb-8 max-w-md mx-auto" style={{ color: subtitleColor }}>
              {config.cta_subtitle || 'Junte-se a músicos que já usam o Glory Pads para criar momentos de adoração inesquecíveis.'}
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={() => navigate('/auth?mode=signup')}
                className="bg-foreground text-background hover:bg-foreground/85 text-lg px-10 py-6 rounded-xl font-bold">
                Começar agora — é grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

// Footer — dynamic styles
const Footer = ({ navigate, config }: { navigate: ReturnType<typeof useNavigate>; config: Record<string, string> }) => {
  const bg = config.footer_bg || 'hsl(220 15% 5%)';
  const textColor = config.footer_text_color || 'hsl(0 0% 100% / 0.35)';

  return (
    <footer className="border-t" style={{ background: bg, borderColor: 'hsl(0 0% 100% / 0.06)', paddingTop: config.footer_pt ? `${config.footer_pt}px` : '40px', paddingBottom: config.footer_pb ? `${config.footer_pb}px` : '40px', paddingLeft: '1rem', paddingRight: '1rem' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src={logoLight} alt="Glory Pads" className="h-7 w-auto" />
              <span className="font-bold" style={{ color: 'hsl(0 0% 100%)' }}>Glory Pads</span>
            </div>
            <p className="text-sm max-w-xs" style={{ color: textColor }}>
              A ferramenta definitiva para músicos de louvor — pads, loops e muito mais.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            {[
              { label: 'Recursos', href: '#recursos' },
              { label: 'Planos', href: '#planos' },
              { label: 'Glory Store', href: '#sons' },
            ].map(l => (
              <a key={l.label} href={l.href} className="transition" style={{ color: textColor }}
                onMouseEnter={e => (e.currentTarget.style.color = 'hsl(0 0% 100%)')}
                onMouseLeave={e => (e.currentTarget.style.color = textColor)}>
                {l.label}
              </a>
            ))}
            <button onClick={() => navigate('/auth')} className="text-left transition" style={{ color: textColor }}>Entrar</button>
            <button onClick={() => navigate('/auth?mode=signup')} className="text-left transition" style={{ color: textColor }}>Criar conta</button>
            <a href="/install" className="transition" style={{ color: textColor }}>Instalar app</a>
          </div>
        </div>
        <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs"
          style={{ borderColor: 'hsl(0 0% 100% / 0.06)', color: textColor }}>
          <p>© {new Date().getFullYear()} Glory Pads. Todos os direitos reservados.</p>
          <p>Feito com ❤️ para músicos de louvor</p>
        </div>
      </div>
    </footer>
  );
};

// Root
const Landing = () => {
  const navigate = useNavigate();
  useBodyScroll();
  const { config, pricing, features, landingFeatures, loading } = useLandingConfig();

  const darkColor = config.divider_dark_color || 'hsl(220 15% 7%)';

  return (
    <div className="overflow-y-auto overflow-x-hidden">
      <Nav navigate={navigate} />

      {/* WHITE hero */}
      <Hero navigate={navigate} config={config} />

      {/* white → dark gradient */}
      <Divider fromLight={true} darkColor={darkColor} />

      {/* DARK stats */}
      <Stats config={config} />

      {/* dark → white gradient */}
      <Divider fromLight={false} darkColor={darkColor} />

      {/* WHITE features */}
      <Features navigate={navigate} config={config} landingFeatures={landingFeatures} />

      {/* white → dark gradient */}
      <Divider fromLight={true} darkColor={darkColor} />

      {/* DARK sound store */}
      <SoundSection navigate={navigate} config={config} />

      {/* dark → white gradient */}
      <Divider fromLight={false} darkColor={darkColor} />

      {/* WHITE how it works */}
      <HowItWorks config={config} />

      {/* white → dark gradient */}
      <Divider fromLight={true} darkColor={darkColor} />

      {/* DARK pricing (conditional) */}
      {!loading && (
        <Pricing navigate={navigate} config={config} pricing={pricing} features={features} />
      )}

      {/* dark → white gradient */}
      <Divider fromLight={false} darkColor={darkColor} />

      {/* WHITE CTA */}
      <FinalCTA navigate={navigate} config={config} />

      {/* white → dark gradient */}
      <Divider fromLight={true} darkColor={darkColor} />

      {/* DARK footer */}
      <Footer navigate={navigate} config={config} />
    </div>
  );
};

export default Landing;
