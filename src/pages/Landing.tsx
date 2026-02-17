import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import logoDark from '@/assets/logo-dark.png';
import { Music, Headphones, Zap, Crown, Check, X, ChevronDown, Layers, Sparkles, Volume2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const features = [
  { icon: Music, title: 'Pads Profissionais', desc: 'Sons de alta qualidade prontos para uso em cultos e ensaios.' },
  { icon: Layers, title: 'Setlists Organizadas', desc: 'Organize suas músicas em setlists com configurações salvas automaticamente.' },
  { icon: Volume2, title: 'Controle Total', desc: 'Volume individual, pan estéreo e equalização por pad.' },
  { icon: Sparkles, title: 'Spotify AI', desc: 'Configure pads automaticamente com base na música do Spotify.' },
  { icon: Headphones, title: 'Continuous Pads', desc: 'Texturas sonoras contínuas para criar atmosferas imersivas.' },
  { icon: Zap, title: 'Loop Engine', desc: 'Sistema de loops sincronizado com metrônomo e BPM.' },
];

const plans = [
  {
    name: 'Free',
    price: 'Grátis',
    period: '',
    icon: null,
    highlight: false,
    features: [
      { text: '4 pads por setlist', included: true },
      { text: '3 imports de sons', included: true },
      { text: 'Metrônomo e loops', included: true },
      { text: 'Continuous Pads', included: true },
      { text: 'Pads ilimitados', included: false },
      { text: 'Volume individual', included: false },
      { text: 'Continuous Pads', included: false },
      { text: 'Equalização', included: false },
      { text: 'Spotify AI', included: false },
    ],
  },
  {
    name: 'Pro',
    price: 'R$19,90',
    period: '/mês',
    icon: Zap,
    highlight: true,
    features: [
      { text: 'Pads ilimitados', included: true },
      { text: 'Imports ilimitados', included: true },
      { text: 'Metrônomo e loops', included: true },
      { text: 'Continuous Pads', included: true },
      { text: 'Volume individual', included: true },
      { text: 'Continuous Pads', included: true },
      { text: 'Equalização', included: false },
      { text: 'Reverb e Delay', included: false },
      { text: 'Spotify AI', included: false },
    ],
  },
  {
    name: 'Master',
    price: 'R$39,90',
    period: '/mês',
    icon: Crown,
    highlight: false,
    features: [
      { text: 'Tudo do Pro', included: true },
      { text: 'Equalizador completo', included: true },
      { text: 'Reverb e Delay', included: true },
      { text: 'Spotify AI', included: true },
      { text: 'Loja de Pads (em breve)', included: true },
      { text: 'Suporte prioritário', included: true },
      { text: 'Novidades primeiro', included: true },
      { text: 'Acesso completo', included: true },
    ],
  },
];

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-y-auto overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoDark} alt="Drum Pads Worship" className="h-8 w-auto" />
            <span className="font-bold text-lg hidden sm:inline">Drum Pads Worship</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition hidden sm:inline">
              Recursos
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition hidden sm:inline">
              Planos
            </a>
            <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
              Entrar
            </Button>
            <Button size="sm" onClick={() => navigate('/auth')} className="bg-primary hover:bg-primary/90">
              Começar grátis
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pb-20 sm:pb-32 px-4 overflow-hidden" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8rem)' }}>
        {/* Gradient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} custom={0}
              className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Novo: Spotify AI integrado</span>
            </motion.div>

            <motion.h1 variants={fadeUp} custom={1}
              className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
              Seus pads de{' '}
              <span className="bg-gradient-to-r from-primary via-purple-400 to-pink-500 bg-clip-text text-transparent">
                worship
              </span>
              <br />na palma da mão
            </motion.h1>

            <motion.p variants={fadeUp} custom={2}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              A ferramenta definitiva para músicos de louvor. Pads profissionais, metrônomo,
              loops e configuração inteligente com Spotify AI.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 rounded-xl shadow-[0_0_40px_hsl(var(--primary)/0.3)]">
                Começar gratuitamente
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
                className="text-lg px-8 py-6 rounded-xl">
                Ver recursos
                <ChevronDown className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* App preview mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-4xl mx-auto mt-16 sm:mt-20"
        >
        <div className="relative rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-2 sm:p-4 shadow-2xl shadow-primary/5">
            {/* Pad grid with native app colors */}
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
                <motion.div
                  key={pad.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.06, duration: 0.4 }}
                  className="relative aspect-square rounded-xl flex flex-col items-center justify-center cursor-default overflow-hidden group"
                  style={{
                    background: `linear-gradient(135deg, hsl(${pad.color} / 0.15) 0%, hsl(${pad.color} / 0.05) 100%)`,
                    border: `1.5px solid hsl(${pad.color} / 0.3)`,
                    boxShadow: `0 0 20px hsl(${pad.color} / 0.1), inset 0 1px 0 hsl(${pad.color} / 0.1)`,
                  }}
                >
                  {/* Glow pulse effect */}
                  <motion.div
                    className="absolute inset-0 rounded-xl"
                    style={{ background: `radial-gradient(circle at center, hsl(${pad.color} / 0.25) 0%, transparent 70%)` }}
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  {/* Top color bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                    style={{ background: `hsl(${pad.color})` }}
                  />
                  <span
                    className="relative text-base sm:text-lg font-bold tracking-wider"
                    style={{ color: `hsl(${pad.color})` }}
                  >
                    {pad.name}
                  </span>
                  <span className="relative text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">{pad.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Bottom ambient glow bar */}
            <div className="mt-3 sm:mt-4 flex gap-1.5 sm:gap-2">
              {[
                { note: 'C', color: '0 75% 55%' },
                { note: 'D', color: '30 85% 55%' },
                { note: 'E', color: '50 80% 50%' },
                { note: 'F', color: '140 60% 45%' },
                { note: 'G', color: '200 75% 50%' },
                { note: 'A', color: '262 75% 55%' },
              ].map((n, i) => (
                <motion.div
                  key={n.note}
                  className="flex-1 h-8 sm:h-10 rounded-lg flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: `linear-gradient(180deg, hsl(${n.color} / 0.2) 0%, hsl(${n.color} / 0.05) 100%)`,
                    border: `1px solid hsl(${n.color} / 0.25)`,
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 + i * 0.05, duration: 0.4 }}
                >
                  <motion.div
                    className="absolute inset-0"
                    style={{ background: `radial-gradient(ellipse at bottom, hsl(${n.color} / 0.3) 0%, transparent 80%)` }}
                    animate={{ opacity: [0.2, 0.6, 0.2] }}
                    transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <span
                    className="relative text-[10px] sm:text-xs font-semibold"
                    style={{ color: `hsl(${n.color} / 0.9)` }}
                  >
                    {n.note}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
          {/* Glow under preview */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-primary/20 blur-[60px] rounded-full" />
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} custom={0}
              className="text-3xl sm:text-4xl font-bold mb-4">
              Tudo que você precisa para o{' '}
              <span className="text-primary">louvor</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1}
              className="text-muted-foreground max-w-lg mx-auto">
              Recursos pensados para músicos que querem praticidade e qualidade na hora do culto.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          >
            {features.map((f, i) => (
              <motion.div key={f.title} variants={fadeUp} custom={i}
                className="group relative rounded-2xl border border-border/50 bg-card/40 p-6 hover:bg-card/80 hover:border-primary/30 transition-all duration-300">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Social proof / stats */}
      <section className="py-16 px-4 border-y border-border/30">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center"
        >
          {[
            { value: '12+', label: 'Sons padrão' },
            { value: '∞', label: 'Setlists' },
            { value: 'AI', label: 'Spotify integrado' },
            { value: 'PWA', label: 'Instale no celular' },
          ].map((stat, i) => (
            <motion.div key={stat.label} variants={fadeUp} custom={i}>
              <div className="text-3xl sm:text-4xl font-extrabold text-primary mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} custom={0}
              className="text-3xl sm:text-4xl font-bold mb-4">
              Escolha seu plano
            </motion.h2>
            <motion.p variants={fadeUp} custom={1}
              className="text-muted-foreground max-w-lg mx-auto">
              Comece grátis e faça upgrade quando estiver pronto.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6"
          >
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                custom={i}
                className={`relative rounded-2xl border-2 p-6 sm:p-8 flex flex-col ${
                  plan.highlight
                    ? 'border-primary bg-primary/5 shadow-[0_0_60px_hsl(var(--primary)/0.12)]'
                    : 'border-border/50 bg-card/40'
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    Mais popular
                  </span>
                )}
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {plan.icon && <plan.icon className="h-5 w-5 text-primary" />}
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                  </div>
                  <div className="text-3xl font-extrabold">
                    {plan.price}
                    {plan.period && <span className="text-base font-normal text-muted-foreground">{plan.period}</span>}
                  </div>
                </div>

                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f.text} className={`flex items-center gap-2.5 text-sm ${f.included ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                      {f.included
                        ? <Check className="h-4 w-4 text-green-500 shrink-0" />
                        : <X className="h-4 w-4 shrink-0" />}
                      {f.text}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => navigate('/auth')}
                  variant={plan.highlight ? 'default' : 'outline'}
                  className={`w-full rounded-xl py-5 ${plan.highlight ? 'bg-primary hover:bg-primary/90' : ''}`}
                >
                  {plan.price === 'Grátis' ? 'Começar grátis' : 'Assinar agora'}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 sm:py-28 px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.div variants={fadeUp} custom={0}
            className="relative rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-8 sm:p-14">
            <div className="absolute inset-0 rounded-3xl bg-primary/5 blur-xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Pronto para transformar seu louvor?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Junte-se a músicos que já usam o Drum Pads Worship para criar momentos de adoração inesquecíveis.
              </p>
              <Button size="lg" onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90 text-lg px-10 py-6 rounded-xl shadow-[0_0_50px_hsl(var(--primary)/0.35)]">
                Começar agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={logoDark} alt="Logo" className="h-6 w-auto" />
            <span>Drum Pads Worship</span>
          </div>
          <p>© {new Date().getFullYear()} Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
