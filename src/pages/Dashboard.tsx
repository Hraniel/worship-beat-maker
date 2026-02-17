import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import logoDark from '@/assets/logo-dark.png';
import {
  Crown, Zap, Play, LogOut, Store, RefreshCw,
  User, Mail, Calendar, Shield, Loader2, Lock,
  ChevronDown, Drum, Waves, Sparkles, Music, Headphones,
  Volume2, Layers, AudioWaveform, Star
} from 'lucide-react';

const tierBadge: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  free: { label: 'Free', icon: null, cls: 'bg-gray-100 text-gray-600' },
  pro: { label: 'Pro', icon: <Zap className="h-3 w-3" />, cls: 'bg-violet-100 text-violet-700' },
  master: { label: 'Master', icon: <Crown className="h-3 w-3" />, cls: 'bg-amber-100 text-amber-700' },
};

interface StorePack {
  id: string;
  name: string;
  description: string;
  category: string;
  sounds: number;
  icon: React.ReactNode;
  color: string;
  available: boolean;
  tag?: string;
}

const storePacks: StorePack[] = [
  {
    id: 'worship-essentials', name: 'Worship Essentials', description: 'Kicks, snares e hi-hats otimizados para louvor contemporâneo.',
    category: 'Drums', sounds: 12, icon: <Drum className="h-5 w-5" />, color: 'bg-rose-500', available: false, tag: 'Popular',
  },
  {
    id: 'ambient-textures', name: 'Ambient Textures', description: 'Pads atmosféricos e texturas para momentos de oração.',
    category: 'Continuous Pads', sounds: 8, icon: <Waves className="h-5 w-5" />, color: 'bg-sky-500', available: false,
  },
  {
    id: 'gospel-grooves', name: 'Gospel Grooves', description: 'Loops e grooves com influência gospel e R&B.',
    category: 'Loops', sounds: 10, icon: <Music className="h-5 w-5" />, color: 'bg-emerald-500', available: false,
  },
  {
    id: 'electronic-worship', name: 'Electronic Worship', description: 'Sons eletrônicos modernos para cultos contemporâneos.',
    category: 'Effects', sounds: 14, icon: <Sparkles className="h-5 w-5" />, color: 'bg-violet-500', available: false, tag: 'Novo',
  },
  {
    id: 'acoustic-kit', name: 'Acoustic Kit', description: 'Bateria acústica gravada em estúdio profissional.',
    category: 'Drums', sounds: 16, icon: <AudioWaveform className="h-5 w-5" />, color: 'bg-orange-500', available: false,
  },
  {
    id: 'cinematic-risers', name: 'Cinematic Risers', description: 'Risers e transições cinematográficas para momentos épicos.',
    category: 'Effects', sounds: 6, icon: <Volume2 className="h-5 w-5" />, color: 'bg-pink-500', available: false,
  },
  {
    id: 'keys-pads', name: 'Keys & Pads', description: 'Sons de teclado e sintetizador para camadas harmônicas.',
    category: 'Continuous Pads', sounds: 10, icon: <Headphones className="h-5 w-5" />, color: 'bg-teal-500', available: false,
  },
  {
    id: 'latin-percussion', name: 'Latin Percussion', description: 'Percussão latina: congas, bongôs, shakers e mais.',
    category: 'Percussion', sounds: 12, icon: <Layers className="h-5 w-5" />, color: 'bg-amber-600', available: false,
  },
];

const categories = ['Todos', 'Drums', 'Continuous Pads', 'Loops', 'Effects', 'Percussion'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { tier, subscriptionEnd, loading, checkSubscription } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Todos');

  const badge = tierBadge[tier];

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch {
      toast.error('Erro ao abrir portal de assinatura');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const formattedEnd = subscriptionEnd
    ? new Date(subscriptionEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  const filteredPacks = activeCategory === 'Todos'
    ? storePacks
    : storePacks.filter(p => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#f8f8fa] text-gray-900">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <img src={logoDark} alt="Logo" className="h-7 w-auto" />
            <span className="font-bold text-sm text-gray-900 hidden sm:inline">Glory Pads</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate('/app')}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg h-8 px-3 text-xs font-medium gap-1.5"
            >
              <Play className="h-3 w-3" />
              Abrir App
            </Button>

            {/* Account dropdown trigger */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(prev => !prev)}
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-10 z-50 w-72 bg-white rounded-xl border border-gray-200 shadow-xl p-4 space-y-3">
                    {/* User info */}
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {user?.user_metadata?.display_name || user?.email?.split('@')[0]}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{user?.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="h-3 w-3 shrink-0" />
                        Membro desde {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '—'}
                      </div>
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* Subscription */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assinatura</span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                      </div>
                      {formattedEnd && (
                        <p className="text-[11px] text-gray-400">Renova em {formattedEnd}</p>
                      )}
                      {tier === 'free' ? (
                        <Button onClick={() => { setMenuOpen(false); navigate('/pricing'); }} size="sm" className="w-full h-8 text-xs rounded-lg bg-gray-900 hover:bg-gray-800 text-white">
                          <Zap className="h-3 w-3 mr-1" /> Fazer upgrade
                        </Button>
                      ) : (
                        <Button onClick={handleManageSubscription} variant="outline" size="sm" className="w-full h-8 text-xs rounded-lg border-gray-200 text-gray-700" disabled={portalLoading}>
                          {portalLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Gerenciar assinatura'}
                        </Button>
                      )}
                    </div>

                    <div className="h-px bg-gray-100" />

                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sair da conta
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
        {/* Store header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-1">
            <Store className="h-5 w-5 text-gray-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Glory Store</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">Em breve</span>
          </div>
          <p className="text-sm text-gray-500 max-w-lg">
            Descubra novos sons, packs e texturas para elevar seu louvor. Cada pack inclui sons exclusivos prontos para usar.
          </p>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Packs grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPacks.map(pack => (
            <div
              key={pack.id}
              className="group relative bg-white rounded-2xl border border-gray-200/80 p-4 hover:shadow-lg hover:border-gray-300 transition-all duration-200"
            >
              {pack.tag && (
                <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                  {pack.tag}
                </span>
              )}
              <div className={`h-11 w-11 rounded-xl ${pack.color} flex items-center justify-center mb-3 text-white shadow-sm`}>
                {pack.icon}
              </div>
              <h3 className="font-semibold text-sm text-gray-900 mb-1">{pack.name}</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">{pack.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Music className="h-3 w-3 text-gray-400" />
                  <span className="text-[11px] text-gray-400 font-medium">{pack.sounds} sons</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <Lock className="h-3 w-3" />
                  <span className="text-[11px] font-medium">Em breve</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Coming soon banner */}
        <div className="mt-10 text-center py-10 px-4">
          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm mb-4">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-700">Novidades chegando em breve</span>
          </div>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Estamos trabalhando em packs exclusivos para o Glory Pads.
            Usuários Master terão acesso antecipado!
          </p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
