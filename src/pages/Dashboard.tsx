import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBodyScroll } from '@/hooks/useBodyScroll';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import logoDark from '@/assets/logo-dark.png';
import PackCard from '@/components/PackCard';
import AdminPackManager from '@/components/AdminPackManager';
import AdminTranslationManager from '@/components/AdminTranslationManager';
import AdminRewardSettings from '@/components/AdminRewardSettings';
import ProfileDropdown from '@/components/ProfileDropdown';
import CommunitySuggestions from '@/components/CommunitySuggestions';
import ProfileCompletion from '@/components/ProfileCompletion';
import { useStorePacks, StorePackData } from '@/hooks/useStorePacks';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useStoreConfig } from '@/hooks/useStoreConfig';
import {
  Crown, Zap, Play, LogOut, Store,
  User, Mail, Calendar, Loader2,
  ChevronDown, ChevronRight, Drum, Waves, Sparkles, Music, Headphones,
  Volume2, Layers, AudioWaveform, Lock, ShieldCheck, Filter, Search, X,
  Library, RotateCcw, Package, CheckCircle, BookOpen, Globe, Settings, Gift, Rocket
} from 'lucide-react';
import AdminPrelaunchManager from '@/components/AdminPrelaunchManager';

async function invokeWithToken(fnName: string, body: object) {
  const { supabase: supabaseClient } = await import('@/integrations/supabase/client');
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error('Session expired');
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/${fnName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || json?.message || 'Function error');
  return json;
}

const tierBadge: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  free: { label: 'Free', icon: null, cls: 'bg-gray-100 text-gray-600' },
  pro: { label: 'Pro', icon: <Zap className="h-3 w-3" />, cls: 'bg-violet-100 text-violet-700' },
  master: { label: 'Master', icon: <Crown className="h-3 w-3" />, cls: 'bg-amber-100 text-amber-700' },
};

// Category groups for sidebar - labels use t() at render time
function useCategoryGroups() {
  const { t } = useTranslation();
  return [
    { label: t('dashboard.all'), key: 'Todos', icon: <Music className="h-3.5 w-3.5" />, children: [] },
    { label: t('dashboard.drums'), key: 'drums', icon: <Drum className="h-3.5 w-3.5" />, children: ['Kick', 'Snare', 'Toms', 'Hi-Hat & Pratos', 'Percussão'] },
    { label: t('dashboard.loops'), key: 'loops', icon: <AudioWaveform className="h-3.5 w-3.5" />, children: ['Loops 4/4', 'Loops 3/4', 'Loops 6/8'] },
    { label: t('dashboard.continuousPads'), key: 'Continuous Pads', icon: <Waves className="h-3.5 w-3.5" />, children: [] },
    { label: t('dashboard.effects'), key: 'efeitos', icon: <Sparkles className="h-3.5 w-3.5" />, children: ['Efeitos Super Low', 'Efeitos Crescente Seco', 'Efeitos Crescente Fade'] },
    { label: t('dashboard.others'), key: 'Outros', icon: <Layers className="h-3.5 w-3.5" />, children: [] },
  ];
}
// MOBILE_CATEGORIES removed — mobile now uses sidebar drawer with CATEGORY_GROUPS

// Static fallback packs (shown when DB has no packs yet)
const STATIC_PACKS: StorePackData[] = [
  { id: 'worship-strings', name: 'Worship Strings', description: 'Texturas de cordas atmosféricas em todas as 12 tonalidades.', category: 'Continuous Pads', icon_name: 'waves', color: 'bg-indigo-500', tag: 'Novo', is_available: false, price_cents: 0, sounds: [], purchased: false, removedFromLibrary: false, banner_url: null, card_title: null, card_subtitle: null },
  { id: 'warm-pads', name: 'Warm Pads', description: 'Pads quentes e envolventes em todas as tonalidades.', category: 'Continuous Pads', icon_name: 'headphones', color: 'bg-amber-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, removedFromLibrary: false, banner_url: null, card_title: null, card_subtitle: null },
  { id: 'worship-drums-dry', name: 'Worship Kick Dry', description: 'Kicks secos e precisos para worship.', category: 'Kick', icon_name: 'drum', color: 'bg-rose-500', tag: 'Popular', is_available: false, price_cents: 0, sounds: [], purchased: false, removedFromLibrary: false, banner_url: null, card_title: null, card_subtitle: null },
  { id: 'worship-snare-dry', name: 'Worship Snare Dry', description: 'Snares secos com punch para worship.', category: 'Snare', icon_name: 'drum', color: 'bg-orange-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, removedFromLibrary: false, banner_url: null, card_title: null, card_subtitle: null },
  { id: 'worship-drums-reverb', name: 'Worship Drums Reverb', description: 'Bateria com reverb hall profundo para worship atmosférico.', category: 'Kick', icon_name: 'drum', color: 'bg-purple-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, removedFromLibrary: false, banner_url: null, card_title: null, card_subtitle: null },
  { id: 'worship-toms', name: 'Worship Toms', description: 'Tons graves e marcantes para momentos épicos.', category: 'Toms', icon_name: 'layers', color: 'bg-yellow-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, removedFromLibrary: false, banner_url: null, card_title: null, card_subtitle: null },
  { id: 'worship-percussion', name: 'Worship Percussion', description: 'Percussão orgânica: chocalhos, pandeiros e más.', category: 'Percussão', icon_name: 'layers', color: 'bg-teal-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, removedFromLibrary: false, banner_url: null, card_title: null, card_subtitle: null },
  { id: 'loops-4-4', name: 'Loops 4/4 Worship', description: 'Padrões rítmicos em 4/4 para cultos contemporâneos.', category: 'Loops 4/4', icon_name: 'audio-waveform', color: 'bg-blue-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, removedFromLibrary: false, banner_url: null, card_title: null, card_subtitle: null },
  { id: 'loops-3-4', name: 'Loops 3/4 Worship', description: 'Valsas e waltz para hinos em 3/4.', category: 'Loops 3/4', icon_name: 'audio-waveform', color: 'bg-cyan-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, removedFromLibrary: false, banner_url: null, card_title: null, card_subtitle: null },
  { id: 'loops-6-8', name: 'Loops 6/8 Worship', description: 'Groove suave em 6/8 para momentos de adoração.', category: 'Loops 6/8', icon_name: 'audio-waveform', color: 'bg-sky-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, removedFromLibrary: false, banner_url: null, card_title: null, card_subtitle: null },
  { id: 'fx-super-low', name: 'Super Low FX', description: 'Sub-graves e explosões de baixo frequência para impacto.', category: 'Efeitos Super Low', icon_name: 'volume-2', color: 'bg-red-600', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, removedFromLibrary: false, banner_url: null, card_title: null, card_subtitle: null },
  { id: 'fx-riser-dry', name: 'Risers Seco', description: 'Crescentes com corte seco e impactante.', category: 'Efeitos Crescente Seco', icon_name: 'sparkles', color: 'bg-pink-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, removedFromLibrary: false, banner_url: null, card_title: null, card_subtitle: null },
  { id: 'fx-riser-fade', name: 'Risers Fade', description: 'Crescentes suaves com fade final para transições.', category: 'Efeitos Crescente Fade', icon_name: 'sparkles', color: 'bg-fuchsia-500', tag: null, is_available: false, price_cents: 0, sounds: [], purchased: false, removedFromLibrary: false, banner_url: null, card_title: null, card_subtitle: null },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const CATEGORY_GROUPS = useCategoryGroups();
  useBodyScroll();
  const { user, signOut } = useAuth();
  const { tier, subscriptionEnd, loading } = useSubscription();
  const { packs: dbPacks, loading: packsLoading, refetch } = useStorePacks();
  const { isAdmin } = useAdminRole();
  const { get: sc, getJSON } = useStoreConfig();
  const [portalLoading, setPortalLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState<'packs' | 'translations' | 'rewards' | 'prelaunch'>('packs');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ drums: true, loops: false, efeitos: false });
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'acquired' | 'available' | 'removed'>('all');
  const [togglingPackId, setTogglingPackId] = useState<string | null>(null);


  const badge = tierBadge[tier];

  // Admin panel: only real DB packs with valid UUIDs (never static fallbacks)
  const adminPacks = dbPacks;

  // Store display: only real DB packs (static fallbacks removed — DB is the source of truth)
  const displayPacks = dbPacks;

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch {
      toast.error(t('dashboard.portalError'));
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const formattedEnd = subscriptionEnd
    ? new Date(subscriptionEnd).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  // Library derived data
  const activePacks = dbPacks.filter(p => p.purchased);
  const removedPacks = dbPacks.filter(p => p.removedFromLibrary);

  const handleRestorePack = async (packId: string) => {
    setTogglingPackId(packId);
    try {
      await invokeWithToken('toggle-pack-library', { packId, removed: false });
      toast.success(t('dashboard.packRestored'));
      refetch();
    } catch (err: any) {
      toast.error(err?.message || t('dashboard.restoreError'));
    } finally {
      setTogglingPackId(null);
    }
  };

  const filteredPacks = displayPacks.filter(p => {
    const matchesCategory = activeCategory === 'Todos' || p.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);

    let matchesLibrary = true;
    if (libraryFilter === 'acquired') matchesLibrary = p.purchased;
    else if (libraryFilter === 'available') matchesLibrary = p.is_available && !p.purchased && !p.removedFromLibrary;
    else if (libraryFilter === 'removed') matchesLibrary = p.removedFromLibrary;

    return matchesCategory && matchesSearch && matchesLibrary;
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
    <div className="min-h-screen bg-[#f8f8fa] text-gray-900" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200/80 shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }}>
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
              <span className="hidden sm:inline">{t('dashboard.admin')}</span>
              </button>
            )}
            <button
              onClick={() => navigate('/help')}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border-2 border-violet-400 bg-violet-50 hover:bg-violet-100 transition-colors text-xs font-semibold text-violet-700"
              title={t('dashboard.help')}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>{t('dashboard.help')}</span>
            </button>
            <Button size="sm" onClick={() => navigate('/app')}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg h-8 px-3 text-xs font-medium gap-1.5">
              <Play className="h-3 w-3" />
              {t('dashboard.openApp')}
            </Button>

            <ProfileDropdown />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">

        {/* Admin Panel */}
        {isAdmin && showAdmin && (
          <div className="mb-8 rounded-2xl overflow-hidden border border-indigo-500/20 shadow-lg">
            <div className="bg-gradient-to-r from-indigo-950/80 to-violet-950/60 px-4 py-3 border-b border-indigo-500/20 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-semibold bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">{t('dashboard.adminPanel')}</span>
            </div>
            {/* Admin Tabs */}
            <div className="bg-slate-900 border-b border-indigo-500/20 flex">
              <button
                onClick={() => setAdminTab('packs')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  adminTab === 'packs'
                    ? 'border-indigo-400 text-indigo-300 bg-indigo-950/30'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                {t('dashboard.packs')}
              </button>
              <button
                onClick={() => setAdminTab('translations')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  adminTab === 'translations'
                    ? 'border-indigo-400 text-indigo-300 bg-indigo-950/30'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                {t('adminTranslations.title')}
              </button>
              <button
                onClick={() => setAdminTab('rewards')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  adminTab === 'rewards'
                    ? 'border-indigo-400 text-indigo-300 bg-indigo-950/30'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <Gift className="h-3.5 w-3.5" />
                {t('common.rewards')}
              </button>
              <button
                onClick={() => setAdminTab('prelaunch')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  adminTab === 'prelaunch'
                    ? 'border-indigo-400 text-indigo-300 bg-indigo-950/30'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <Rocket className="h-3.5 w-3.5" />
                Pré-lançamento
              </button>
            </div>
            <div className="bg-gradient-to-b from-slate-900 to-indigo-950/40 p-4">
              {adminTab === 'packs' && <AdminPackManager packs={adminPacks} onRefresh={refetch} />}
              {adminTab === 'translations' && <AdminTranslationManager />}
              {adminTab === 'rewards' && <AdminRewardSettings />}
              {adminTab === 'prelaunch' && <AdminPrelaunchManager />}
            </div>
          </div>
        )}

        {/* Profile completion */}
        <ProfileCompletion />

        {/* Store header */}
        {/* ── Minha Biblioteca ─────────────────────────────────────────── */}
        {!packsLoading && (activePacks.length > 0 || removedPacks.length > 0) && (
          <div className="mb-8">
            <div className="flex items-center gap-2.5 mb-4">
              <Library className="h-5 w-5 text-violet-500" />
              <h2 className="text-lg font-bold text-gray-900">{sc('library_title')}</h2>
               <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                 {t('dashboard.activeCount', { count: activePacks.length })}
                 {removedPacks.length > 0 && ` · ${t('dashboard.removedCount', { count: removedPacks.length })}`}
              </span>
            </div>

            {/* Active packs */}
            {activePacks.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">{sc('library_active_label')}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {activePacks.map(pack => (
                    <div
                      key={pack.id}
                      onClick={() => pack.id.length === 36 && navigate(`/store/${pack.id}`)}
                      className="group bg-white rounded-xl border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200 overflow-hidden cursor-pointer"
                    >
                      <div className={`w-full h-16 ${pack.color} flex items-center justify-center`}>
                        {pack.banner_url ? (
                          <img
                            src={pack.banner_url.startsWith('http') ? pack.banner_url : `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/sound-previews/${pack.banner_url}`}
                            alt={pack.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Music className="h-5 w-5 text-white/70" />
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-gray-900 leading-snug truncate">{pack.name}</p>
                         <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                           <CheckCircle className="h-2.5 w-2.5" /> {t('dashboard.purchasedLabel')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Removed packs */}
            {removedPacks.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Package className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{sc('library_removed_label')}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {removedPacks.map(pack => (
                    <div
                      key={pack.id}
                      className="bg-white rounded-xl border border-dashed border-gray-200 overflow-hidden opacity-75 hover:opacity-100 transition-all duration-200"
                    >
                      <div className={`w-full h-16 ${pack.color} flex items-center justify-center opacity-50`}>
                        {pack.banner_url ? (
                          <img
                            src={pack.banner_url.startsWith('http') ? pack.banner_url : `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/sound-previews/${pack.banner_url}`}
                            alt={pack.name}
                            className="w-full h-full object-cover grayscale"
                          />
                        ) : (
                          <Music className="h-5 w-5 text-white/70" />
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-gray-500 leading-snug truncate">{pack.name}</p>
                        <button
                          onClick={() => handleRestorePack(pack.id)}
                          disabled={togglingPackId === pack.id}
                          className="mt-1.5 w-full flex items-center justify-center gap-1 h-6 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-semibold transition-colors disabled:opacity-50"
                        >
                          {togglingPackId === pack.id ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            <><RotateCcw className="h-2.5 w-2.5" /> {t('dashboard.restore')}</>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Glory Store ──────────────────────────────────────────────── */}
        <div className="mb-6">
          {/* Store Hero */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-violet-900 p-6 sm:p-8 mb-6">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(139,92,246,0.4), transparent 60%), radial-gradient(circle at 80% 20%, rgba(236,72,153,0.3), transparent 50%)' }} />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Store className="h-5 w-5 text-violet-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Glory Store</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">{sc('store_title')}</h1>
              <p className="text-sm text-gray-300 max-w-lg">{sc('store_subtitle')}</p>
            </div>
          </div>

          {/* Mobile: categories + filters above search */}
          <div className="lg:hidden space-y-3 mb-4">
            {/* Categories button + library filters row */}
            <div className="flex gap-2 items-center flex-wrap">
              {/* Distinct categories button */}
              <button
                onClick={() => setShowMobileFilter(v => !v)}
                className="shrink-0 flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-bold border-2 transition-colors bg-violet-600 text-white border-violet-600 hover:bg-violet-700 shadow-sm"
              >
                <Filter className="h-3.5 w-3.5" />
                 {activeCategory === 'Todos' ? t('dashboard.categories') : activeCategory}
               </button>
              {/* Library status filters */}
              {(() => {
                const fl = getJSON<Record<string, string>>('filter_labels', { all: 'Todos', purchased: 'Adquiridos', available: 'Disponíveis', removed: 'Removidos' });
                return [
                  { key: 'all' as const, label: fl.all ?? 'Todos', icon: <Store className="h-3 w-3" /> },
                  { key: 'acquired' as const, label: fl.purchased ?? 'Adquiridos', icon: <CheckCircle className="h-3 w-3" /> },
                  { key: 'available' as const, label: fl.available ?? 'Disponíveis', icon: <BookOpen className="h-3 w-3" /> },
                  { key: 'removed' as const, label: fl.removed ?? 'Removidos', icon: <Package className="h-3 w-3" /> },
                ];
              })().map(f => (
                <button
                  key={f.key}
                  onClick={() => setLibraryFilter(f.key)}
                  className={`flex items-center gap-1 h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
                    libraryFilter === f.key
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {f.icon}
                  {f.label}
                </button>
              ))}
            </div>
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder={sc('search_placeholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-9 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
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
            <p className="text-xs text-gray-500">
              <span className="font-semibold text-gray-900">{activeCategory}</span> · {filteredPacks.length} {t('dashboard.pack', { count: filteredPacks.length })}
            </p>
          </div>

          {/* Desktop: search + filters */}
          <div className="hidden lg:flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder={sc('search_placeholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-9 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
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
            <div className="flex items-center gap-1.5 flex-wrap">
              {(() => {
                const fl = getJSON<Record<string, string>>('filter_labels', { all: 'Todos', purchased: 'Adquiridos', available: 'Disponíveis', removed: 'Removidos' });
                return [
                  { key: 'all' as const, label: fl.all ?? 'Todos', icon: <Store className="h-3 w-3" /> },
                  { key: 'acquired' as const, label: fl.purchased ?? 'Adquiridos', icon: <CheckCircle className="h-3 w-3" /> },
                  { key: 'available' as const, label: fl.available ?? 'Disponíveis', icon: <BookOpen className="h-3 w-3" /> },
                  { key: 'removed' as const, label: fl.removed ?? 'Removidos', icon: <Package className="h-3 w-3" /> },
                ];
              })().map(f => (
                <button
                  key={f.key}
                  onClick={() => setLibraryFilter(f.key)}
                  className={`flex items-center gap-1 h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
                    libraryFilter === f.key
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {f.icon}
                  {f.label}
                </button>
              ))}
            </div>
            </div>
          </div>

          {/* Decorative section divider */}
          <div className="hidden lg:flex items-center gap-3 mb-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-200 to-transparent" />
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-100">
              <Sparkles className="h-3 w-3 text-violet-400" />
              <span className="text-[10px] font-semibold text-violet-500 tracking-wide uppercase">{activeCategory}</span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-200 to-transparent" />
          </div>

        {/* Mobile category side drawer */}
        {showMobileFilter && (
          <>
            <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setShowMobileFilter(false)} />
            <div className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-white shadow-2xl animate-slide-in-left flex flex-col lg:hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-bold text-gray-900">{t('dashboard.categories')}</span>
                <button onClick={() => setShowMobileFilter(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
                {CATEGORY_GROUPS.map(group => (
                  <div key={group.key}>
                    <button
                      onClick={() => group.children.length > 0 ? toggleGroup(group.key) : handleSelectCategory(group.key)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
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
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
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
          </>
        )}

        {/* Desktop layout: sidebar + grid */}
        <div className="hidden lg:flex gap-8">
          {/* Vertical sidebar */}
          <aside className="w-52 shrink-0 space-y-4">
            <div className="sticky top-20 space-y-4">
              {/* Categories */}
              <div className="bg-white rounded-2xl border border-gray-200 p-3 space-y-0.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 pb-2">{t('dashboard.categories')}</p>
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

              {/* User profile card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-violet-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {user?.user_metadata?.display_name || user?.email?.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
                  </div>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">{t('dashboard.subscription')}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                      {badge.icon}{badge.label}
                    </span>
                  </div>
                  {formattedEnd && (
                    <p className="text-[10px] text-gray-400">{t('dashboard.renewsOn')} {formattedEnd}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  {tier === 'free' ? (
                    <Button onClick={() => navigate('/pricing')} size="sm" className="w-full h-7 text-[10px] rounded-lg bg-gray-900 hover:bg-gray-800 text-white">
                      <Zap className="h-3 w-3 mr-1" /> {t('dashboard.upgrade')}
                    </Button>
                  ) : (
                    <Button onClick={handleManageSubscription} variant="outline" size="sm" className="w-full h-7 text-[10px] rounded-lg border-gray-200 text-gray-700" disabled={portalLoading}>
                      {portalLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : t('dashboard.manageSubscription')}
                    </Button>
                  )}
                  <Button onClick={handleSignOut} variant="ghost" size="sm" className="w-full h-7 text-[10px] text-gray-500 hover:text-gray-900 rounded-lg">
                    <LogOut className="h-3 w-3 mr-1" /> {t('dashboard.signOut')}
                  </Button>
                </div>
              </div>
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
                <div className="rounded-2xl bg-gradient-to-br from-gray-50/80 via-white to-violet-50/40 border border-gray-100 p-5">
                  <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-5 gap-y-6 justify-items-center" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 150px))' }}>
                    {filteredPacks.map((pack, i) => (
                      <PackCard key={pack.id} pack={pack} onPurchased={refetch} index={i} />
                    ))}
                  </div>
                </div>
                {filteredPacks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                      <Music className="h-6 w-6 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">{t('dashboard.noPacks', 'Nenhum pack encontrado')}</p>
                  </div>
                )}
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
          {!packsLoading && filteredPacks.length > 0 && (
            <>
              {/* Decorative divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
              </div>
              <div className="grid grid-cols-3 gap-x-3 gap-y-5 justify-items-center">
                {filteredPacks.map((pack, i) => (
                  <PackCard key={pack.id} pack={pack} onPurchased={refetch} index={i} />
                ))}
              </div>
            </>
          )}
          {!packsLoading && filteredPacks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <Music className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400 font-medium">{t('dashboard.noPacks', 'Nenhum pack encontrado')}</p>
            </div>
          )}
        </div>

        {/* Community Suggestions */}
        <CommunitySuggestions />

        {/* Dynamic Footer */}
        {(() => {
          const textColors = getJSON<Record<string, string>>('text_colors', {});
          const footerLinks = getJSON<{ label: string; url: string }[]>('footer_links', []);
          const footerText = sc('footer_text');
          return (
            <footer
              className="mt-12 -mx-4 px-4 py-8 text-center"
              style={{ backgroundColor: textColors.footer_bg_color || '#f8f8fa' }}
            >
              <p className="text-sm" style={{ color: textColors.footer_text_color || '#9ca3af' }}>
                {footerText}
              </p>
              {footerLinks.length > 0 && (
                <div className="flex items-center justify-center gap-4 mt-3">
                  {footerLinks.map((link, idx) => (
                    <a key={idx} href={link.url}
                      className="text-xs underline hover:opacity-80 transition-opacity"
                      style={{ color: textColors.footer_text_color || '#9ca3af' }}>
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </footer>
          );
        })()}
      </main>
    </div>
  );
};

export default Dashboard;
