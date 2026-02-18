import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBodyScroll } from '@/hooks/useBodyScroll';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import logoDark from '@/assets/logo-dark.png';
import PackCard from '@/components/PackCard';
import AdminPackManager from '@/components/AdminPackManager';
import { useStorePacks, StorePackData } from '@/hooks/useStorePacks';
import { useAdminRole } from '@/hooks/useAdminRole';
import {
  Crown, Zap, Play, LogOut, Store,
  User, Mail, Calendar, Loader2,
  ChevronDown, ChevronRight, Drum, Waves, Sparkles, Music, Headphones,
  Volume2, Layers, AudioWaveform, Star, Lock, ShieldCheck, Filter, Search, X
} from 'lucide-react';

const tierBadge: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  free: { label: 'Free', icon: null, cls: 'bg-gray-100 text-gray-600' },
  pro: { label: 'Pro', icon: <Zap className="h-3 w-3" />, cls: 'bg-violet-100 text-violet-700' },
  master: { label: 'Master', icon: <Crown className="h-3 w-3" />, cls: 'bg-amber-100 text-amber-700' },
};

// Category groups for sidebar
const CATEGORY_GROUPS = [
  {
    label: 'Todos',
    key: 'Todos',
    icon: <Music className="h-3.5 w-3.5" />,
    children: [],
  },
  {
    label: 'Bateria',
    key: 'drums',
    icon: <Drum className="h-3.5 w-3.5" />,
    children: ['Kick', 'Snare', 'Toms', 'Hi-Hat & Pratos', 'Percussão'],
  },
  {
    label: 'Loops',
    key: 'loops',
    icon: <AudioWaveform className="h-3.5 w-3.5" />,
    children: ['Loops 4/4', 'Loops 3/4', 'Loops 6/8'],
  },
  {
    label: 'Pads',
    key: 'Continuous Pads',
    icon: <Waves className="h-3.5 w-3.5" />,
    children: [],
  },
  {
    label: 'Efeitos',
    key: 'efeitos',
    icon: <Sparkles className="h-3.5 w-3.5" />,
    children: ['Efeitos Super Low', 'Efeitos Crescente Seco', 'Efeitos Crescente Fade'],
  },
  {
    label: 'Outros',
    key: 'Outros',
    icon: <Layers className="h-3.5 w-3.5" />,
    children: [],
  },
];

// Flat list for horizontal mobile tabs
const MOBILE_CATEGORIES = [
  'Todos', 'Kick', 'Snare', 'Toms', 'Hi-Hat & Pratos', 'Percussão',
  'Loops 4/4', 'Loops 3/4', 'Loops 6/8',
  'Continuous Pads', 'Efeitos Super Low', 'Efeitos Crescente Seco',
  'Efeitos Crescente Fade', 'Outros',
];

// Static fallback packs (shown when DB has no packs yet)
const STATIC_PACKS: StorePackData[] = [
  { id: 'worship-strings', name: 'Worship Strings', description: 'Texturas de cordas atmosféricas em todas as 12 tonalidades.', category: 'Continuous Pads', icon_name: 'waves', color: 'bg-indigo-500', tag: 'Novo', is_available: false, price_cents: 0, sounds: [], purchased: false, banner_url: null },
  { id: 'warm-pads', name: 'Warm Pads', description: 'Pads quentes e envolventes em todas as tonalidades.', category: 'Continuous Pads', icon_name: 'headphones', color: 'bg-amber-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, banner_url: null },
  { id: 'worship-drums-dry', name: 'Worship Kick Dry', description: 'Kicks secos e precisos para worship.', category: 'Kick', icon_name: 'drum', color: 'bg-rose-500', tag: 'Popular', is_available: false, price_cents: 0, sounds: [], purchased: false, banner_url: null },
  { id: 'worship-snare-dry', name: 'Worship Snare Dry', description: 'Snares secos com punch para worship.', category: 'Snare', icon_name: 'drum', color: 'bg-orange-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, banner_url: null },
  { id: 'worship-drums-reverb', name: 'Worship Drums Reverb', description: 'Bateria com reverb hall profundo para worship atmosférico.', category: 'Kick', icon_name: 'drum', color: 'bg-purple-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, banner_url: null },
  { id: 'worship-toms', name: 'Worship Toms', description: 'Tons graves e marcantes para momentos épicos.', category: 'Toms', icon_name: 'layers', color: 'bg-yellow-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, banner_url: null },
  { id: 'worship-percussion', name: 'Worship Percussion', description: 'Percussão orgânica: chocalhos, pandeiros e más.', category: 'Percussão', icon_name: 'layers', color: 'bg-teal-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, banner_url: null },
  { id: 'loops-4-4', name: 'Loops 4/4 Worship', description: 'Padrões rítmicos em 4/4 para cultos contemporâneos.', category: 'Loops 4/4', icon_name: 'audio-waveform', color: 'bg-blue-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, banner_url: null },
  { id: 'loops-3-4', name: 'Loops 3/4 Worship', description: 'Valsas e waltz para hinos em 3/4.', category: 'Loops 3/4', icon_name: 'audio-waveform', color: 'bg-cyan-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, banner_url: null },
  { id: 'loops-6-8', name: 'Loops 6/8 Worship', description: 'Groove suave em 6/8 para momentos de adoração.', category: 'Loops 6/8', icon_name: 'audio-waveform', color: 'bg-sky-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, banner_url: null },
  { id: 'fx-super-low', name: 'Super Low FX', description: 'Sub-graves e explosões de baixo frequência para impacto.', category: 'Efeitos Super Low', icon_name: 'volume-2', color: 'bg-red-600', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, banner_url: null },
  { id: 'fx-riser-dry', name: 'Risers Seco', description: 'Crescentes com corte seco e impactante.', category: 'Efeitos Crescente Seco', icon_name: 'sparkles', color: 'bg-pink-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, banner_url: null },
  { id: 'fx-riser-fade', name: 'Risers Fade', description: 'Crescentes suaves com fade final para transições.', category: 'Efeitos Crescente Fade', icon_name: 'sparkles', color: 'bg-fuchsia-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, banner_url: null },
];

const Dashboard = () => {
  const navigate = useNavigate();
  useBodyScroll();
  const { user, signOut } = useAuth();
  const { tier, subscriptionEnd, loading } = useSubscription();
  const { packs: dbPacks, loading: packsLoading, refetch } = useStorePacks();
  const { isAdmin } = useAdminRole();
  const [portalLoading, setPortalLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [showAdmin, setShowAdmin] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ drums: true, loops: false, efeitos: false });
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const badge = tierBadge[tier];

  const displayPacks = dbPacks.length > 0
    ? [...dbPacks, ...STATIC_PACKS.filter(sp => !dbPacks.some(dp => dp.name === sp.name))]
    : STATIC_PACKS;

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

  const filteredPacks = displayPacks.filter(p => {
    const matchesCategory = activeCategory === 'Todos' || p.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  // Select category and auto-expand its parent group
  const handleSelectCategory = (cat: string) => {
    setActiveCategory(cat);
    setShowMobileFilter(false);
    // Auto-expand group
    for (const g of CATEGORY_GROUPS) {
      if (g.children.includes(cat)) {
        setExpandedGroups(prev => ({ ...prev, [g.key]: true }));
      }
    }
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Is a category within this group active?
  const isGroupActive = (group: typeof CATEGORY_GROUPS[0]) => {
    if (group.key === activeCategory) return true;
    return group.children.includes(activeCategory);
  };

  return (
    <div className="min-h-screen bg-[#f8f8fa] text-gray-900">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <img src={logoDark} alt="Logo" className="h-7 w-auto" />
            <span className="font-bold text-sm text-gray-900 hidden sm:inline">Glory Pads</span>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowAdmin(v => !v)}
                className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg border transition-colors text-xs font-medium ${
                  showAdmin ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
            <Button size="sm" onClick={() => navigate('/app')}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg h-8 px-3 text-xs font-medium gap-1.5">
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

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-10 z-50 w-72 bg-white rounded-xl border border-gray-200 shadow-xl p-4 space-y-3">
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
                      {isAdmin && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600">
                          <ShieldCheck className="h-3 w-3 shrink-0" />
                          <span>Administrador</span>
                        </div>
                      )}
                    </div>
                    <div className="h-px bg-gray-100" />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assinatura</span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                          {badge.icon}{badge.label}
                        </span>
                      </div>
                      {formattedEnd && <p className="text-[11px] text-gray-400">Renova em {formattedEnd}</p>}
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
                    <button onClick={handleSignOut}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
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

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">

        {/* Admin Panel */}
        {isAdmin && showAdmin && (
          <div className="mb-8 rounded-2xl overflow-hidden border border-indigo-500/20 shadow-lg">
            <div className="bg-gradient-to-r from-indigo-950/80 to-violet-950/60 px-4 py-3 border-b border-indigo-500/20 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-semibold bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">Painel Administrativo</span>
            </div>
            <div className="bg-gradient-to-b from-slate-900 to-indigo-950/40 p-4">
              <AdminPackManager packs={displayPacks} onRefresh={refetch} />
            </div>
          </div>
        )}

        {/* Store header */}
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-1">
            <Store className="h-5 w-5 text-gray-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Glory Store</h1>
          </div>
          <p className="text-sm text-gray-500 max-w-lg mb-4">
            Descubra novos sons, packs e texturas para elevar seu louvor.
          </p>
          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar packs por nome ou descrição..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-9 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile: horizontal tabs + filter button */}
        <div className="lg:hidden mb-5">
          <div className="flex gap-2 items-center">
            {/* Filter toggle */}
            <button
              onClick={() => setShowMobileFilter(v => !v)}
              className={`shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
                showMobileFilter ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              <Filter className="h-3 w-3" />
              Filtrar
            </button>
            {/* Scrollable tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 flex-1 scrollbar-none">
              {MOBILE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => handleSelectCategory(cat)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ${
                    activeCategory === cat
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile expanded filter panel */}
          {showMobileFilter && (
            <div className="mt-3 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Categorias</p>
              <div className="space-y-1">
                {CATEGORY_GROUPS.map(group => (
                  <div key={group.key}>
                    <button
                      onClick={() => group.children.length > 0 ? toggleGroup(group.key) : handleSelectCategory(group.key)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        isGroupActive(group) ? 'bg-gray-900 text-white' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {group.icon}
                        {group.label}
                      </div>
                      {group.children.length > 0 && (
                        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expandedGroups[group.key] ? 'rotate-90' : ''}`} />
                      )}
                    </button>
                    {group.children.length > 0 && expandedGroups[group.key] && (
                      <div className="ml-4 mt-1 space-y-0.5">
                        {group.children.map(child => (
                          <button
                            key={child}
                            onClick={() => handleSelectCategory(child)}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${
                              activeCategory === child ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            }`}
                          >
                            {child}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Desktop layout: sidebar + grid */}
        <div className="hidden lg:flex gap-8">
          {/* Vertical sidebar */}
          <aside className="w-52 shrink-0">
            <div className="sticky top-20 bg-white rounded-2xl border border-gray-200 p-3 space-y-0.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 pb-2">Categorias</p>
              {CATEGORY_GROUPS.map(group => (
                <div key={group.key}>
                  <button
                    onClick={() => group.children.length > 0 ? toggleGroup(group.key) : handleSelectCategory(group.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isGroupActive(group) ? 'bg-gray-900 text-white' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {group.icon}
                      <span>{group.label}</span>
                    </div>
                    {group.children.length > 0 && (
                      <ChevronRight className={`h-3.5 w-3.5 transition-transform opacity-60 ${expandedGroups[group.key] ? 'rotate-90' : ''}`} />
                    )}
                  </button>
                  {group.children.length > 0 && expandedGroups[group.key] && (
                    <div className="ml-3 mt-0.5 mb-1 space-y-0.5 border-l border-gray-100 pl-3">
                      {group.children.map(child => (
                        <button
                          key={child}
                          onClick={() => handleSelectCategory(child)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                            activeCategory === child
                              ? 'text-gray-900 font-semibold bg-gray-100'
                              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {child}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>

          {/* Pack grid */}
          <div className="flex-1 min-w-0">
            {packsLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            )}
            {!packsLoading && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-900">{activeCategory}</span>
                    {' '}· {filteredPacks.length} {filteredPacks.length === 1 ? 'pack' : 'packs'}
                  </p>
                </div>
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredPacks.map(pack => (
                    <PackCard key={pack.id} pack={pack} onPurchased={refetch} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile pack grid */}
        <div className="lg:hidden">
          {packsLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}
          {!packsLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredPacks.map(pack => (
                <PackCard key={pack.id} pack={pack} onPurchased={refetch} />
              ))}
            </div>
          )}
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
