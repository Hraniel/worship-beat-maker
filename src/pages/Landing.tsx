import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useBodyScroll } from '@/hooks/useBodyScroll';
import logoDark from '@/assets/logo-dark.png';
import logoLight from '@/assets/logo-light.png';
import {
  Music, Headphones, Zap, Crown, Check, X, ChevronDown,
  Layers, Sparkles, Volume2, ArrowRight, Drum, AudioWaveform,
  Waves, ListMusic, SlidersHorizontal, Cpu, Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

// ── Features ──────────────────────────────────────────────────────────────────
const features = [
  { icon: Drum, title: 'Pads Profissionais', desc: 'Sons reais de bateria, pads e efeitos — 12 sons inclusos gratuitamente, com Glory Store para expandir.' },
  { icon: ListMusic, title: 'Setlists Organizadas', desc: 'Crie setlists por culto com pads e configurações salvas automaticamente. Compartilhe com um link.' },
  { icon: SlidersHorizontal, title: 'Mixer Completo', desc: 'Volume individual, pan estéreo e equalização por pad no plano Master.' },
  { icon: Cpu, title: 'Spotify AI', desc: 'Detecta o tom e BPM da música no Spotify e configura os pads automaticamente — plano Master.' },
  { icon: Waves, title: 'Continuous Pads', desc: 'Texturas sonoras contínuas em qualquer tom para criar atmosferas imersivas no louvor.' },
  { icon: AudioWaveform, title: 'Loop Engine', desc: 'Sistema de loops sincronizado com metrônomo e BPM. Grave e dispare loops em tempo real.' },
  { icon: Headphones, title: 'Efeitos de Áudio', desc: 'Reverb, delay e compressão por pad para moldar cada som ao ambiente do culto.' },
  { icon: Smartphone, title: 'PWA — Instale no Celular', desc: 'Funciona como app nativo no iPhone e Android. Sem loja, sem espera — instale direto do navegador.' },
];

// ── Plans ─────────────────────────────────────────────────────────────────────
const plans = [
  {
    name: 'Free',
    price: 'Grátis',
    period: '',
    icon: null,
    highlight: false,
    cta: 'Começar grátis',
    features: [
      { text: '4 pads por setlist', ok: true },
      { text: '3 imports de sons customizados', ok: true },
      { text: 'Metrônomo + loops básicos', ok: true },
      { text: 'Continuous Pads (tons limitados)', ok: true },
      { text: 'Pads ilimitados', ok: false },
      { text: 'Volume individual por pad', ok: false },
      { text: 'Equalização por pad', ok: false },
      { text: 'Spotify AI', ok: false },
    ],
  },
  {
    name: 'Pro',
    price: 'R$19,90',
    period: '/mês',
    icon: Zap,
    highlight: true,
    cta: 'Assinar Pro',
    features: [
      { text: 'Pads ilimitados', ok: true },
      { text: 'Imports ilimitados', ok: true },
      { text: 'Metrônomo + loops completos', ok: true },
      { text: 'Continuous Pads (todos os tons)', ok: true },
      { text: 'Volume individual por pad', ok: true },
      { text: 'Glory Store — compra de packs', ok: true },
      { text: 'Equalização por pad', ok: false },
      { text: 'Spotify AI', ok: false },
    ],
  },
  {
    name: 'Master',
    price: 'R$39,90',
    period: '/mês',
    icon: Crown,
    highlight: false,
    cta: 'Assinar Master',
    features: [
      { text: 'Tudo do Pro', ok: true },
      { text: 'Equalizador completo por pad', ok: true },
      { text: 'Reverb e Delay por pad', ok: true },
      { text: 'Spotify AI', ok: true },
      { text: 'Glory Store acesso completo', ok: true },
      { text: 'Suporte prioritário', ok: true },
      { text: 'Novidades em primeira mão', ok: true },
    ],
  },
];

// ── Sound categories showcased ────────────────────────────────────────────────
const categories = [
  { name: 'Kick', color: '0 75% 55%', icon: '🥁' },
  { name: 'Snare', color: '30 85% 55%', icon: '🪘' },
  { name: 'Hi-Hat', color: '50 80% 50%', icon: '🎵' },
  { name: 'Loops', color: '262 75% 55%', icon: '🔁' },
  { name: 'Pads', color: '200 80% 55%', icon: '🎹' },
  { name: 'Efeitos', color: '340 70% 55%', icon: '✨' },
];

// ── Nav ───────────────────────────────────────────────────────────────────────
const Nav = ({ navigate }: { navigate: ReturnType<typeof useNavigate> }) => (
  <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
    <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src={logoLight} alt="Glory Pads" className="h-8 w-auto" />
        <span className="font-bold text-lg text-white hidden sm:inline">Glory Pads</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <a href="#recursos" className="text-sm text-white/60 hover:text-white transition hidden sm:inline">Recursos</a>
        <a href="#sons" className="text-sm text-white/60 hover:text-white transition hidden sm:inline">Sons</a>
        <a href="#planos" className="text-sm text-white/60 hover:text-white transition hidden sm:inline">Planos</a>
        <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="text-white/80 hover:text-white hover:bg-white/10">
          Entrar
        </Button>
        <Button size="sm" onClick={() => navigate('/auth?mode=signup')} className="bg-white text-black hover:bg-white/90 font-semibold">
          Começar grátis
        </Button>
      </div>
    </div>
  </nav>
);

// ── Hero (dark) ───────────────────────────────────────────────────────────────
const Hero = ({ navigate }: { navigate: ReturnType<typeof useNavigate> }) => (
  <section className="bg-black relative overflow-hidden" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 7rem)', paddingBottom: '6rem' }}>
    {/* subtle radial glow */}
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-primary/15 blur-[120px] rounded-full pointer-events-none" />

    <div className="relative max-w-5xl mx-auto px-4 text-center">
      <motion.div initial="hidden" animate="visible" variants={stagger}>
        <motion.div variants={fadeUp} custom={0}
          className="inline-flex items-center gap-2 border border-white/15 rounded-full px-4 py-1.5 mb-6 bg-white/5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-white/70">Spotify AI integrado · PWA nativo</span>
        </motion.div>

        <motion.h1 variants={fadeUp} custom={1}
          className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6 text-white">
          Seus pads de{' '}
          <span className="text-primary">worship</span>
          <br />na palma da mão
        </motion.h1>

        <motion.p variants={fadeUp} custom={2}
          className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10">
          Pads profissionais, metrônomo, loops, continuous pads e Glory Store —
          tudo que o músico de louvor precisa, em um único app.
        </motion.p>

        <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" onClick={() => navigate('/auth?mode=signup')}
            className="bg-primary hover:bg-primary/90 text-white text-lg px-8 py-6 rounded-xl shadow-[0_0_40px_hsl(var(--primary)/0.4)]">
            Começar gratuitamente
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => {
            document.getElementById('recursos')?.scrollIntoView({ behavior: 'smooth' });
          }} className="text-lg px-8 py-6 rounded-xl border-white/20 text-white hover:bg-white/10 hover:text-white">
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
        <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-3 sm:p-5 shadow-2xl">
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
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: `hsl(${pad.color})` }} />
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  style={{ background: `radial-gradient(circle at center, hsl(${pad.color} / 0.2) 0%, transparent 70%)` }}
                  animate={{ opacity: [0.3, 0.65, 0.3] }}
                  transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="relative text-base sm:text-lg font-bold tracking-wider" style={{ color: `hsl(${pad.color})` }}>{pad.name}</span>
                <span className="relative text-[9px] sm:text-[10px] text-white/40 mt-0.5">{pad.label}</span>
              </motion.div>
            ))}
          </div>
          {/* Ambient pads bar */}
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
                transition={{ delay: 1.1 + i * 0.06, duration: 0.4 }}
              >
                <motion.div className="absolute inset-0"
                  style={{ background: `radial-gradient(ellipse at bottom, hsl(${n.color} / 0.28) 0%, transparent 80%)` }}
                  animate={{ opacity: [0.2, 0.55, 0.2] }}
                  transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="relative text-[10px] sm:text-xs font-semibold" style={{ color: `hsl(${n.color} / 0.85)` }}>{n.note}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-primary/15 blur-[60px] rounded-full" />
      </motion.div>
    </div>
  </section>
);

// ── Stats (white) ─────────────────────────────────────────────────────────────
const Stats = () => (
  <section className="bg-white py-16 px-4">
    <motion.div
      initial="hidden" whileInView="visible" viewport={{ once: true }}
      variants={stagger}
      className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center"
    >
      {[
        { value: '12+', label: 'Sons padrão inclusos' },
        { value: '∞', label: 'Setlists por culto' },
        { value: 'AI', label: 'Spotify integrado' },
        { value: 'PWA', label: 'Instale no celular' },
      ].map((stat, i) => (
        <motion.div key={stat.label} variants={fadeUp} custom={i}>
          <div className="text-4xl sm:text-5xl font-black text-black mb-2">{stat.value}</div>
          <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
        </motion.div>
      ))}
    </motion.div>
  </section>
);

// ── Features (dark) ───────────────────────────────────────────────────────────
const Features = ({ navigate }: { navigate: ReturnType<typeof useNavigate> }) => (
  <section id="recursos" className="bg-black py-20 sm:py-28 px-4">
    <div className="max-w-6xl mx-auto">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger} className="text-center mb-14">
        <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Recursos</motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-5xl font-extrabold text-white mb-4">
          Tudo que você precisa<br />para o <span className="text-primary">louvor</span>
        </motion.h2>
        <motion.p variants={fadeUp} custom={2} className="text-white/50 max-w-lg mx-auto">
          Desenvolvido por músicos de louvor, para músicos de louvor.
        </motion.p>
      </motion.div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((f, i) => (
          <motion.div key={f.title} variants={fadeUp} custom={i}
            className="group rounded-2xl border border-white/8 bg-white/4 p-6 hover:bg-white/8 hover:border-white/15 transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center mb-4 group-hover:bg-primary/25 transition">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-white mb-2 text-sm">{f.title}</h3>
            <p className="text-xs text-white/45 leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
        className="mt-12 text-center">
        <Button size="lg" onClick={() => navigate('/auth?mode=signup')}
          className="bg-white text-black hover:bg-white/90 text-base px-8 py-5 rounded-xl font-semibold">
          Experimente grátis
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  </section>
);

// ── Sound categories (white) ──────────────────────────────────────────────────
const SoundSection = ({ navigate }: { navigate: ReturnType<typeof useNavigate> }) => (
  <section id="sons" className="bg-white py-20 sm:py-28 px-4">
    <div className="max-w-5xl mx-auto">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger} className="text-center mb-14">
        <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Glory Store</motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-5xl font-extrabold text-black mb-4">
          Uma biblioteca de sons<br />para cada momento
        </motion.h2>
        <motion.p variants={fadeUp} custom={2} className="text-gray-500 max-w-lg mx-auto">
          Sons de bateria secos, com reverb, loops, continuous pads, efeitos crescentes e muito mais.
          Novos packs chegam todo mês na Glory Store.
        </motion.p>
      </motion.div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
        className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {categories.map((cat, i) => (
          <motion.div key={cat.name} variants={fadeUp} custom={i}
            className="group relative rounded-2xl border border-gray-100 bg-gray-50 p-6 hover:shadow-md transition-all duration-300 cursor-pointer"
            onClick={() => navigate('/auth?mode=signup')}
          >
            <div className="text-3xl mb-3">{cat.icon}</div>
            <h3 className="font-bold text-black text-lg">{cat.name}</h3>
            <div className="mt-2 h-1 w-8 rounded-full" style={{ background: `hsl(${cat.color})` }} />
            <span className="absolute bottom-4 right-4 text-xs text-gray-400 group-hover:text-gray-600 transition">
              Ver packs →
            </span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

// ── How it works (dark) ───────────────────────────────────────────────────────
const HowItWorks = () => (
  <section className="bg-black py-20 sm:py-28 px-4">
    <div className="max-w-4xl mx-auto">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger} className="text-center mb-14">
        <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Como funciona</motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-5xl font-extrabold text-white mb-4">
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
            <div className="text-6xl font-black text-white/6 mb-3 leading-none">{item.step}</div>
            <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
            <p className="text-sm text-white/45 leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

// ── Pricing (white) ───────────────────────────────────────────────────────────
const Pricing = ({ navigate }: { navigate: ReturnType<typeof useNavigate> }) => (
  <section id="planos" className="bg-white py-20 sm:py-28 px-4">
    <div className="max-w-5xl mx-auto">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger} className="text-center mb-14">
        <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Planos</motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-5xl font-extrabold text-black mb-4">
          Comece grátis.<br />Cresça quando quiser.
        </motion.h2>
        <motion.p variants={fadeUp} custom={2} className="text-gray-500 max-w-lg mx-auto">
          Sem contrato, cancele quando quiser.
        </motion.p>
      </motion.div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {plans.map((plan, i) => (
          <motion.div key={plan.name} variants={fadeUp} custom={i}
            className={`relative rounded-2xl border-2 p-7 sm:p-8 flex flex-col ${
              plan.highlight
                ? 'border-black bg-black text-white shadow-2xl scale-[1.02]'
                : 'border-gray-100 bg-gray-50'
            }`}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1 rounded-full">
                Mais popular
              </span>
            )}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                {plan.icon && <plan.icon className={`h-5 w-5 ${plan.highlight ? 'text-primary' : 'text-gray-600'}`} />}
                <h3 className={`text-xl font-bold ${plan.highlight ? 'text-white' : 'text-black'}`}>{plan.name}</h3>
              </div>
              <div className={`text-4xl font-black ${plan.highlight ? 'text-white' : 'text-black'}`}>
                {plan.price}
                {plan.period && <span className={`text-base font-normal ml-1 ${plan.highlight ? 'text-white/50' : 'text-gray-400'}`}>{plan.period}</span>}
              </div>
            </div>

            <ul className="space-y-2.5 flex-1 mb-6">
              {plan.features.map((f) => (
                <li key={f.text} className={`flex items-start gap-2.5 text-sm ${
                  f.ok
                    ? plan.highlight ? 'text-white' : 'text-gray-800'
                    : plan.highlight ? 'text-white/25' : 'text-gray-300'
                }`}>
                  {f.ok
                    ? <Check className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                    : <X className="h-4 w-4 shrink-0 mt-0.5" />}
                  {f.text}
                </li>
              ))}
            </ul>

            <Button
              onClick={() => navigate('/auth?mode=signup')}
              className={`w-full rounded-xl py-5 font-semibold ${
                plan.highlight
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'bg-black text-white hover:bg-black/85'
              }`}
            >
              {plan.cta}
            </Button>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

// ── CTA Final (dark) ──────────────────────────────────────────────────────────
const FinalCTA = ({ navigate }: { navigate: ReturnType<typeof useNavigate> }) => (
  <section className="bg-black py-20 sm:py-28 px-4">
    <motion.div
      initial="hidden" whileInView="visible" viewport={{ once: true }}
      variants={stagger}
      className="max-w-3xl mx-auto text-center"
    >
      <motion.div variants={fadeUp} custom={0}
        className="relative rounded-3xl border border-white/10 bg-white/4 p-10 sm:p-16 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative">
          <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Glory Pads</motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-5xl font-extrabold text-white mb-5">
            Pronto para transformar<br />seu louvor?
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-white/45 mb-8 max-w-md mx-auto">
            Junte-se a músicos que já usam o Glory Pads para criar momentos de adoração inesquecíveis.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => navigate('/auth?mode=signup')}
              className="bg-white text-black hover:bg-white/90 text-lg px-10 py-6 rounded-xl font-bold shadow-[0_0_50px_hsl(0_0%_100%/0.15)]">
              Começar agora — é grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  </section>
);

// ── Footer (white) ────────────────────────────────────────────────────────────
const Footer = ({ navigate }: { navigate: ReturnType<typeof useNavigate> }) => (
  <footer className="bg-white border-t border-gray-100 py-10 px-4">
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-8 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src={logoDark} alt="Glory Pads" className="h-7 w-auto" />
            <span className="font-bold text-black">Glory Pads</span>
          </div>
          <p className="text-sm text-gray-400 max-w-xs">
            A ferramenta definitiva para músicos de louvor — pads, loops e muito mais.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
          <a href="#recursos" className="text-gray-500 hover:text-black transition">Recursos</a>
          <a href="#planos" className="text-gray-500 hover:text-black transition">Planos</a>
          <a href="#sons" className="text-gray-500 hover:text-black transition">Glory Store</a>
          <button onClick={() => navigate('/auth')} className="text-left text-gray-500 hover:text-black transition">Entrar</button>
          <button onClick={() => navigate('/auth?mode=signup')} className="text-left text-gray-500 hover:text-black transition">Criar conta</button>
          <a href="/install" className="text-gray-500 hover:text-black transition">Instalar app</a>
        </div>
      </div>
      <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
        <p>© {new Date().getFullYear()} Glory Pads. Todos os direitos reservados.</p>
        <p>Feito com ❤️ para músicos de louvor</p>
      </div>
    </div>
  </footer>
);

// ── Root ──────────────────────────────────────────────────────────────────────
const Landing = () => {
  const navigate = useNavigate();
  useBodyScroll();

  return (
    <div className="text-foreground overflow-y-auto overflow-x-hidden">
      <Nav navigate={navigate} />
      <Hero navigate={navigate} />
      <Stats />
      <Features navigate={navigate} />
      <SoundSection navigate={navigate} />
      <HowItWorks />
      <Pricing navigate={navigate} />
      <FinalCTA navigate={navigate} />
      <Footer navigate={navigate} />
    </div>
  );
};

export default Landing;
