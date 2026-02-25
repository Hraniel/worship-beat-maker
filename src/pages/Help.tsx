import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBodyScroll } from '@/hooks/useBodyScroll';
import logoDark from '@/assets/logo-dark.png';
import HelpChatWidget from '@/components/HelpChatWidget';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useHelpContent } from '@/hooks/useHelpContent';
import type { HelpCategory as DBCategory, HelpFaq as DBFaq } from '@/hooks/useHelpContent';
import {
  ArrowLeft, Search, Drum, Music, Waves, Sliders, Clock, Bluetooth,
  Sparkles, Pencil, Eye, Store, ListMusic, Volume2, HelpCircle,
  ChevronDown, ChevronRight, Play, Headphones, BookOpen, Lightbulb,
  MessageCircleQuestion, ExternalLink, Image, Ticket, Loader2,
  FileText, Settings, Zap, Mic, Radio, Activity, Speaker, Piano, Guitar,
} from 'lucide-react';

/* ─── Types ─── */
interface TutorialStep { title: string; description: string; image_url?: string | null; video_url?: string | null; }
interface TutorialArticle { title: string; icon: React.ReactNode; purpose: string; steps: TutorialStep[]; }
interface TutorialCategory { id: string; label: string; icon: React.ReactNode; description: string; screenshot?: string; articles: TutorialArticle[]; }

/* ─── Icon resolver ─── */
const ICON_MAP: Record<string, React.ReactNode> = {
  'drum': <Drum className="h-5 w-5" />,
  'music': <Music className="h-5 w-5" />,
  'waves': <Waves className="h-5 w-5" />,
  'sliders': <Sliders className="h-5 w-5" />,
  'clock': <Clock className="h-5 w-5" />,
  'bluetooth': <Bluetooth className="h-5 w-5" />,
  'sparkles': <Sparkles className="h-5 w-5" />,
  'pencil': <Pencil className="h-5 w-5" />,
  'eye': <Eye className="h-5 w-5" />,
  'store': <Store className="h-5 w-5" />,
  'list-music': <ListMusic className="h-5 w-5" />,
  'volume-2': <Volume2 className="h-5 w-5" />,
  'help-circle': <HelpCircle className="h-5 w-5" />,
  'play': <Play className="h-5 w-5" />,
  'headphones': <Headphones className="h-5 w-5" />,
  'file-text': <FileText className="h-5 w-5" />,
  'settings': <Settings className="h-5 w-5" />,
  'zap': <Zap className="h-5 w-5" />,
  'mic': <Mic className="h-5 w-5" />,
  'radio': <Radio className="h-5 w-5" />,
  'activity': <Activity className="h-5 w-5" />,
  'external-link': <ExternalLink className="h-5 w-5" />,
};

const ICON_MAP_SM: Record<string, React.ReactNode> = {
  'drum': <Drum className="h-4 w-4" />,
  'music': <Music className="h-4 w-4" />,
  'waves': <Waves className="h-4 w-4" />,
  'sliders': <Sliders className="h-4 w-4" />,
  'clock': <Clock className="h-4 w-4" />,
  'bluetooth': <Bluetooth className="h-4 w-4" />,
  'sparkles': <Sparkles className="h-4 w-4" />,
  'pencil': <Pencil className="h-4 w-4" />,
  'eye': <Eye className="h-4 w-4" />,
  'store': <Store className="h-4 w-4" />,
  'list-music': <ListMusic className="h-4 w-4" />,
  'volume-2': <Volume2 className="h-4 w-4" />,
  'help-circle': <HelpCircle className="h-4 w-4" />,
  'play': <Play className="h-4 w-4" />,
  'headphones': <Headphones className="h-4 w-4" />,
  'file-text': <FileText className="h-4 w-4" />,
  'settings': <Settings className="h-4 w-4" />,
  'zap': <Zap className="h-4 w-4" />,
  'mic': <Mic className="h-4 w-4" />,
  'radio': <Radio className="h-4 w-4" />,
  'activity': <Activity className="h-4 w-4" />,
  'external-link': <ExternalLink className="h-4 w-4" />,
};

function getIcon(name: string, small = false) {
  const map = small ? ICON_MAP_SM : ICON_MAP;
  return map[name] || (small ? <FileText className="h-4 w-4" /> : <FileText className="h-5 w-5" />);
}

/* ─── Hooks for hardcoded fallback content ─── */
function useFaqItems() {
  const { t } = useTranslation();
  return Array.from({ length: 8 }, (_, i) => ({
    q: t(`help.faq${i}q`),
    a: t(`help.faq${i}a`),
  }));
}

function useHardcodedCategories(): TutorialCategory[] {
  const { t } = useTranslation();
  return [
    {
      id: 'pads', label: t('help.catPadsLabel'), icon: <Drum className="h-5 w-5" />, description: t('help.catPadsDesc'),
      articles: [
        { title: t('help.artPlayingTitle'), icon: <Play className="h-4 w-4" />, purpose: t('help.artPlayingPurpose'), steps: [
          { title: t('help.artPlayingS0T'), description: t('help.artPlayingS0D') },
          { title: t('help.artPlayingS1T'), description: t('help.artPlayingS1D') },
          { title: t('help.artPlayingS2T'), description: t('help.artPlayingS2D') },
          { title: t('help.artPlayingS3T'), description: t('help.artPlayingS3D') },
        ]},
        { title: t('help.artLoopsTitle'), icon: <Music className="h-4 w-4" />, purpose: t('help.artLoopsPurpose'), steps: [
          { title: t('help.artLoopsS0T'), description: t('help.artLoopsS0D') },
          { title: t('help.artLoopsS1T'), description: t('help.artLoopsS1D') },
          { title: t('help.artLoopsS2T'), description: t('help.artLoopsS2D') },
        ]},
      ],
    },
    {
      id: 'repertorio', label: t('help.catSetlistLabel'), icon: <ListMusic className="h-5 w-5" />, description: t('help.catSetlistDesc'),
      articles: [
        { title: t('help.artEventsTitle'), icon: <ListMusic className="h-4 w-4" />, purpose: t('help.artEventsPurpose'), steps: [
          { title: t('help.artEventsS0T'), description: t('help.artEventsS0D') },
          { title: t('help.artEventsS1T'), description: t('help.artEventsS1D') },
          { title: t('help.artEventsS2T'), description: t('help.artEventsS2D') },
          { title: t('help.artEventsS3T'), description: t('help.artEventsS3D') },
        ]},
        { title: t('help.artShareTitle'), icon: <ExternalLink className="h-4 w-4" />, purpose: t('help.artSharePurpose'), steps: [
          { title: t('help.artShareS0T'), description: t('help.artShareS0D') },
          { title: t('help.artShareS1T'), description: t('help.artShareS1D') },
        ]},
      ],
    },
    {
      id: 'ambient', label: t('help.catAmbientLabel'), icon: <Waves className="h-5 w-5" />, description: t('help.catAmbientDesc'),
      articles: [
        { title: t('help.artContinuousTitle'), icon: <Waves className="h-4 w-4" />, purpose: t('help.artContinuousPurpose'), steps: [
          { title: t('help.artContinuousS0T'), description: t('help.artContinuousS0D') },
          { title: t('help.artContinuousS1T'), description: t('help.artContinuousS1D') },
          { title: t('help.artContinuousS2T'), description: t('help.artContinuousS2D') },
        ]},
      ],
    },
    {
      id: 'mixer', label: t('help.catMixerLabel'), icon: <Volume2 className="h-5 w-5" />, description: t('help.catMixerDesc'),
      articles: [
        { title: t('help.artMixerTitle'), icon: <Sliders className="h-4 w-4" />, purpose: t('help.artMixerPurpose'), steps: [
          { title: t('help.artMixerS0T'), description: t('help.artMixerS0D') },
          { title: t('help.artMixerS1T'), description: t('help.artMixerS1D') },
          { title: t('help.artMixerS2T'), description: t('help.artMixerS2D') },
        ]},
      ],
    },
    {
      id: 'metronomo', label: t('help.catMetronomeLabel'), icon: <Clock className="h-5 w-5" />, description: t('help.catMetronomeDesc'),
      articles: [
        { title: t('help.artMetronomeTitle'), icon: <Clock className="h-4 w-4" />, purpose: t('help.artMetronomePurpose'), steps: [
          { title: t('help.artMetronomeS0T'), description: t('help.artMetronomeS0D') },
          { title: t('help.artMetronomeS1T'), description: t('help.artMetronomeS1D') },
          { title: t('help.artMetronomeS2T'), description: t('help.artMetronomeS2D') },
          { title: t('help.artMetronomeS3T'), description: t('help.artMetronomeS3D') },
          { title: t('help.artMetronomeS4T'), description: t('help.artMetronomeS4D') },
          { title: t('help.artMetronomeS5T'), description: t('help.artMetronomeS5D') },
        ]},
      ],
    },
    {
      id: 'midi', label: t('help.catMidiLabel'), icon: <Bluetooth className="h-5 w-5" />, description: t('help.catMidiDesc'),
      articles: [
        { title: t('help.artMidiTitle'), icon: <Bluetooth className="h-4 w-4" />, purpose: t('help.artMidiPurpose'), steps: [
          { title: t('help.artMidiS0T'), description: t('help.artMidiS0D') },
          { title: t('help.artMidiS1T'), description: t('help.artMidiS1D') },
          { title: t('help.artMidiS2T'), description: t('help.artMidiS2D') },
          { title: t('help.artMidiS3T'), description: t('help.artMidiS3D') },
        ]},
      ],
    },
    {
      id: 'effects', label: t('help.catEffectsLabel'), icon: <Sparkles className="h-5 w-5" />, description: t('help.catEffectsDesc'),
      articles: [
        { title: t('help.artEffectsTitle'), icon: <Sparkles className="h-4 w-4" />, purpose: t('help.artEffectsPurpose'), steps: [
          { title: t('help.artEffectsS0T'), description: t('help.artEffectsS0D') },
          { title: t('help.artEffectsS1T'), description: t('help.artEffectsS1D') },
          { title: t('help.artEffectsS2T'), description: t('help.artEffectsS2D') },
          { title: t('help.artEffectsS3T'), description: t('help.artEffectsS3D') },
        ]},
      ],
    },
    {
      id: 'modos', label: t('help.catModesLabel'), icon: <Eye className="h-5 w-5" />, description: t('help.catModesDesc'),
      articles: [
        { title: t('help.artEditModeTitle'), icon: <Pencil className="h-4 w-4" />, purpose: t('help.artEditModePurpose'), steps: [
          { title: t('help.artEditModeS0T'), description: t('help.artEditModeS0D') },
          { title: t('help.artEditModeS1T'), description: t('help.artEditModeS1D') },
          { title: t('help.artEditModeS2T'), description: t('help.artEditModeS2D') },
        ]},
        { title: t('help.artFocusModeTitle'), icon: <Eye className="h-4 w-4" />, purpose: t('help.artFocusModePurpose'), steps: [
          { title: t('help.artFocusModeS0T'), description: t('help.artFocusModeS0D') },
          { title: t('help.artFocusModeS1T'), description: t('help.artFocusModeS1D') },
          { title: t('help.artFocusModeS2T'), description: t('help.artFocusModeS2D') },
        ]},
      ],
    },
    {
      id: 'store', label: t('help.catStoreLabel'), icon: <Store className="h-5 w-5" />, description: t('help.catStoreDesc'),
      articles: [
        { title: t('help.artBrowsingTitle'), icon: <Store className="h-4 w-4" />, purpose: t('help.artBrowsingPurpose'), steps: [
          { title: t('help.artBrowsingS0T'), description: t('help.artBrowsingS0D') },
          { title: t('help.artBrowsingS1T'), description: t('help.artBrowsingS1D') },
          { title: t('help.artBrowsingS2T'), description: t('help.artBrowsingS2D') },
          { title: t('help.artBrowsingS3T'), description: t('help.artBrowsingS3D') },
        ]},
        { title: t('help.artImportingTitle'), icon: <Headphones className="h-4 w-4" />, purpose: t('help.artImportingPurpose'), steps: [
          { title: t('help.artImportingS0T'), description: t('help.artImportingS0D') },
          { title: t('help.artImportingS1T'), description: t('help.artImportingS1D') },
          { title: t('help.artImportingS2T'), description: t('help.artImportingS2D') },
        ]},
      ],
    },
  ];
}

/* ─── Convert DB categories to view categories ─── */
function dbToViewCategories(dbCats: DBCategory[]): TutorialCategory[] {
  return dbCats.map(cat => ({
    id: cat.id,
    label: cat.label,
    icon: getIcon(cat.icon_name),
    description: cat.description,
    articles: cat.articles.map(art => ({
      title: art.title,
      icon: getIcon(art.icon_name, true),
      purpose: art.purpose,
      steps: art.steps.map(s => ({
        title: s.title,
        description: s.description,
        image_url: (s as any).image_url || null,
        video_url: (s as any).video_url || null,
      })),
    })),
  }));
}

const Help = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  useBodyScroll();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const FALLBACK_FAQ_ITEMS = useFaqItems();
  const FALLBACK_CATEGORIES = useHardcodedCategories();
  const { categories: dbCategories, faqs: dbFaqs, loading: dbLoading } = useHelpContent();

  // Always merge: DB categories first, then hardcoded fallback
  const dbViewCategories = dbToViewCategories(dbCategories);
  const CATEGORIES: TutorialCategory[] = [...dbViewCategories, ...FALLBACK_CATEGORIES];
  const FAQ_ITEMS = [
    ...dbFaqs.map(f => ({ q: f.question, a: f.answer })),
    ...FALLBACK_FAQ_ITEMS,
  ];

  const q = searchQuery.toLowerCase().trim();

  const filteredCategories = CATEGORIES.filter(cat => {
    if (!q) return true;
    if (cat.label.toLowerCase().includes(q)) return true;
    return cat.articles.some(a =>
      a.title.toLowerCase().includes(q) ||
      a.purpose.toLowerCase().includes(q) ||
      a.steps.some(s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
    );
  });

  const selectedCat = CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div className="min-h-screen bg-[#f8f8fa] text-gray-900" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200/80 shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft className="h-4 w-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-violet-500" />
              <span className="font-bold text-sm text-gray-900">{t('help.title')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/my-tickets')}
              className="rounded-lg h-8 px-3 text-xs font-medium gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50">
              <Ticket className="h-3 w-3" />
              {t('help.myTicketsBtn')}
            </Button>
            <Button size="sm" onClick={() => navigate('/app')}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg h-8 px-3 text-xs font-medium gap-1.5">
              <Play className="h-3 w-3" />
              {t('help.openApp')}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-violet-900 p-6 sm:p-10 mb-8">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 40%, rgba(139,92,246,0.5), transparent 50%), radial-gradient(circle at 80% 60%, rgba(236,72,153,0.3), transparent 50%)' }} />
          <div className="relative z-10 text-center max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-300 mb-4">
              <HelpCircle className="h-3 w-3" />
              {t('help.guidesAndTutorials')}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{t('help.heroTitle')}</h1>
            <p className="text-sm text-gray-300 mb-6">{t('help.heroSubtitle')}</p>

            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('help.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Loading */}
        {dbLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
          </div>
        )}

        {!dbLoading && (
          <>
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: <BookOpen className="h-4 w-4 text-violet-500" />, label: t('help.tutorials'), value: CATEGORIES.reduce((a, c) => a + c.articles.length, 0).toString() },
                { icon: <Lightbulb className="h-4 w-4 text-amber-500" />, label: t('help.categoriesLabel'), value: CATEGORIES.length.toString() },
                { icon: <MessageCircleQuestion className="h-4 w-4 text-emerald-500" />, label: 'FAQs', value: FAQ_ITEMS.length.toString() },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <div className="flex justify-center mb-1.5">{s.icon}</div>
                  <p className="text-lg font-bold text-gray-900">{s.value}</p>
                  <p className="text-[11px] text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Category detail view */}
            {selectedCat ? (
              <div>
                <button
                  onClick={() => { setActiveCategory(null); setExpandedArticle(null); }}
                  className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium mb-4 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t('help.backToCategories')}
                </button>

                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
                    {selectedCat.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedCat.label}</h2>
                    <p className="text-xs text-gray-500">{selectedCat.description}</p>
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  {selectedCat.articles.map((article, ai) => {
                    const key = `${selectedCat.id}-${ai}`;
                    const isOpen = expandedArticle === key;
                    return (
                      <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-sm">
                        <button
                          onClick={() => setExpandedArticle(isOpen ? null : key)}
                          className="w-full flex items-center justify-between p-4 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                              {article.icon}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{article.title}</p>
                              <p className="text-[11px] text-gray-400">{t('help.stepCount', { count: article.steps.length })}</p>
                            </div>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 border-t border-gray-100">
                            <div className="mt-3 mb-4 p-3 rounded-lg bg-violet-50 border border-violet-100">
                              <div className="flex items-start gap-2">
                                <Lightbulb className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wide mb-0.5">{t('help.purposeLabel')}</p>
                                  <p className="text-xs text-violet-800 leading-relaxed">{article.purpose}</p>
                                </div>
                              </div>
                            </div>

                            <div className="relative pl-6 space-y-4">
                              <div className="absolute left-[9px] top-0 bottom-0 w-px bg-violet-200" />
                              {article.steps.map((step, si) => {
                                const ytId = step.video_url ? (() => {
                                  const m = step.video_url!.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
                                  return m ? m[1] : null;
                                })() : null;
                                return (
                                <div key={si} className="relative">
                                  <div className="absolute -left-6 top-0.5 h-[18px] w-[18px] rounded-full bg-violet-100 border-2 border-violet-400 flex items-center justify-center">
                                    <span className="text-[9px] font-bold text-violet-600">{si + 1}</span>
                                  </div>
                                  <h4 className="text-sm font-semibold text-gray-800 mb-0.5">{step.title}</h4>
                                  <p className="text-xs text-gray-500 leading-relaxed">{step.description}</p>
                                  {step.image_url && (
                                    <img src={step.image_url} alt={step.title} className="mt-2 rounded-lg border border-gray-200 max-w-full" loading="lazy" />
                                  )}
                                  {ytId && (
                                    <div className="mt-2 aspect-video w-full max-w-md rounded-lg overflow-hidden border border-gray-200">
                                      <iframe
                                        src={`https://www.youtube.com/embed/${ytId}`}
                                        title={step.title}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="w-full h-full"
                                      />
                                    </div>
                                  )}
                                </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {/* Categories grid */}
                <h2 className="text-base font-bold text-gray-900 mb-4">{t('help.categoriesLabel')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
                  {filteredCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setActiveCategory(cat.id); setExpandedArticle(null); }}
                      className="group bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md hover:border-violet-300 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-10 w-10 rounded-xl bg-violet-50 group-hover:bg-violet-100 flex items-center justify-center text-violet-500 transition-colors">
                          {cat.icon}
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-violet-400 transition-colors" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1">{cat.label}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{cat.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-violet-500 font-semibold">
                          {t('help.tutorialCount', { count: cat.articles.length })}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* FAQ Section */}
                <div className="mb-10">
                  <div className="flex items-center gap-2.5 mb-4">
                    <MessageCircleQuestion className="h-5 w-5 text-emerald-500" />
                    <h2 className="text-base font-bold text-gray-900">{t('help.faqTitle')}</h2>
                  </div>
                  <div className="space-y-2">
                    {FAQ_ITEMS.filter(f => !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)).map((faq, i) => {
                      const isOpen = expandedFaq === i;
                      return (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                          <button
                            onClick={() => setExpandedFaq(isOpen ? null : i)}
                            className="w-full flex items-center justify-between p-4 text-left"
                          >
                            <p className="text-sm font-medium text-gray-900 pr-4">{faq.q}</p>
                            <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                              <p className="text-xs text-gray-600 leading-relaxed">{faq.a}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick tip */}
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl border border-violet-200 p-5 sm:p-6 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                      <Lightbulb className="h-4 w-4 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-violet-900 mb-1">{t('help.quickTipTitle')}</h3>
                      <p className="text-xs text-violet-700 leading-relaxed">
                        {t('help.quickTipText', { icon: '?' })}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
      <HelpChatWidget />
    </div>
  );
};

export default Help;
