import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import ImageCropperModal from './ImageCropperModal';
import {
  Plus, Trash2, Loader2, ChevronDown, ChevronUp, Save,
  Eye, EyeOff, ArrowLeft, BookOpen, MessageCircleQuestion,
  Youtube, ImageIcon, Upload, X,
} from 'lucide-react';

/* ─── Types ─── */
interface HelpStep {
  id: string;
  article_id: string;
  title: string;
  description: string;
  sort_order: number;
  image_url: string | null;
  video_url: string | null;
}

interface HelpArticle {
  id: string;
  category_id: string;
  title: string;
  icon_name: string;
  purpose: string;
  sort_order: number;
  enabled: boolean;
}

interface HelpCategory {
  id: string;
  label: string;
  description: string;
  icon_name: string;
  sort_order: number;
  enabled: boolean;
}

interface HelpFaq {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  enabled: boolean;
}

const ICON_OPTIONS = [
  'drum', 'music', 'waves', 'sliders', 'clock', 'bluetooth', 'sparkles',
  'pencil', 'eye', 'store', 'list-music', 'volume-2', 'help-circle',
  'play', 'headphones', 'file-text', 'settings', 'zap', 'mic', 'radio',
  'guitar', 'piano', 'speaker', 'activity',
];

/* ─── YouTube helper ─── */
function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

/* ─── Step Media Editor ─── */
const StepMediaEditor: React.FC<{
  step: HelpStep;
  onUpdate: (step: HelpStep) => void;
}> = ({ step, onUpdate }) => {
  const [showVideoInput, setShowVideoInput] = useState(!!step.video_url);
  const [videoUrl, setVideoUrl] = useState(step.video_url || '');
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperFile, setCropperFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropperFile(file);
    setCropperOpen(true);
    e.target.value = '';
  };

  const handleCropSave = async (croppedFile: File) => {
    setCropperOpen(false);
    setCropperFile(null);
    // Upload to landing-assets bucket
    const path = `help/${step.id}-${Date.now()}.${croppedFile.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('landing-assets').upload(path, croppedFile, { upsert: true });
    if (error) { toast.error('Erro ao enviar imagem'); return; }
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const publicUrl = `https://${projectId}.supabase.co/storage/v1/object/public/landing-assets/${path}`;
    onUpdate({ ...step, image_url: publicUrl });
    // Save to DB immediately
    await supabase.from('help_steps').update({ image_url: publicUrl } as any).eq('id', step.id);
    toast.success('Imagem salva!');
  };

  const handleRemoveImage = async () => {
    onUpdate({ ...step, image_url: null });
    await supabase.from('help_steps').update({ image_url: null } as any).eq('id', step.id);
    toast.success('Imagem removida');
  };

  const handleSaveVideo = async () => {
    const url = videoUrl.trim();
    if (url && !extractYouTubeId(url)) { toast.error('URL do YouTube inválida'); return; }
    onUpdate({ ...step, video_url: url || null });
    await supabase.from('help_steps').update({ video_url: url || null } as any).eq('id', step.id);
    toast.success(url ? 'Vídeo salvo!' : 'Vídeo removido');
  };

  const ytId = step.video_url ? extractYouTubeId(step.video_url) : null;

  return (
    <div className="space-y-2 mt-1.5">
      {/* Image */}
      <div className="flex items-center gap-2">
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
          <ImageIcon className="h-3 w-3" /> {step.image_url ? 'Trocar imagem' : 'Adicionar imagem'}
        </button>
        <button onClick={() => { setShowVideoInput(!showVideoInput); }}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
          <Youtube className="h-3 w-3" /> YouTube
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
      </div>

      {/* Image preview */}
      {step.image_url && (
        <div className="relative inline-block">
          <img src={step.image_url} alt="" className="h-16 rounded-md border border-border object-cover" />
          <button onClick={handleRemoveImage}
            className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      )}

      {/* YouTube input */}
      {showVideoInput && (
        <div className="flex items-center gap-1.5">
          <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="flex-1 h-7 px-2 text-[11px] bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={handleSaveVideo}>
            <Save className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* YouTube preview */}
      {ytId && (
        <div className="relative aspect-video w-40 rounded-md overflow-hidden border border-border">
          <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="YouTube" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Youtube className="h-5 w-5 text-red-500" />
          </div>
        </div>
      )}

      <ImageCropperModal
        open={cropperOpen}
        file={cropperFile}
        aspectRatio="16:9"
        title="Imagem do passo"
        onSave={handleCropSave}
        onCancel={() => { setCropperOpen(false); setCropperFile(null); }}
      />
    </div>
  );
};

/* ─── Main Component ─── */
const AdminHelpCenterManager: React.FC = () => {
  const [view, setView] = useState<'categories' | 'faqs'>('categories');
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [steps, setSteps] = useState<HelpStep[]>([]);
  const [faqs, setFaqs] = useState<HelpFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [catRes, artRes, stepRes, faqRes] = await Promise.all([
      supabase.from('help_categories').select('*').order('sort_order'),
      supabase.from('help_articles').select('*').order('sort_order'),
      supabase.from('help_steps').select('*').order('sort_order'),
      supabase.from('help_faqs').select('*').order('sort_order'),
    ]);
    setCategories((catRes.data as any[]) || []);
    setArticles((artRes.data as any[]) || []);
    setSteps((stepRes.data as any[]) || []);
    setFaqs((faqRes.data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Category CRUD ──
  const addCategory = async () => {
    const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) + 1 : 0;
    const { data, error } = await supabase.from('help_categories').insert({
      label: 'Nova Categoria',
      description: 'Descrição da categoria',
      icon_name: 'help-circle',
      sort_order: maxOrder,
    } as any).select().single();
    if (error) { toast.error('Erro ao criar categoria'); return; }
    setCategories(prev => [...prev, data as any]);
    toast.success('Categoria criada!');
  };

  const updateCategory = async (cat: HelpCategory) => {
    setSaving(true);
    const { error } = await supabase.from('help_categories').update({
      label: cat.label, description: cat.description, icon_name: cat.icon_name,
      sort_order: cat.sort_order, enabled: cat.enabled, updated_at: new Date().toISOString(),
    } as any).eq('id', cat.id);
    setSaving(false);
    if (error) { toast.error('Erro ao salvar'); return; }
    toast.success('Categoria salva!');
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Excluir categoria e todos os artigos?')) return;
    // Delete steps of articles in this category
    const catArticleIds = articles.filter(a => a.category_id === id).map(a => a.id);
    if (catArticleIds.length > 0) {
      await supabase.from('help_steps').delete().in('article_id', catArticleIds);
    }
    await supabase.from('help_articles').delete().eq('category_id', id);
    await supabase.from('help_categories').delete().eq('id', id);
    setCategories(prev => prev.filter(c => c.id !== id));
    setArticles(prev => prev.filter(a => a.category_id !== id));
    setSteps(prev => prev.filter(s => !catArticleIds.includes(s.article_id)));
    toast.success('Categoria excluída');
  };

  // ── Article CRUD ──
  const addArticle = async (categoryId: string) => {
    const catArticles = articles.filter(a => a.category_id === categoryId);
    const maxOrder = catArticles.length > 0 ? Math.max(...catArticles.map(a => a.sort_order)) + 1 : 0;
    const { data, error } = await supabase.from('help_articles').insert({
      category_id: categoryId, title: 'Novo Artigo', icon_name: 'file-text',
      purpose: 'Propósito do artigo', sort_order: maxOrder,
    } as any).select().single();
    if (error) { toast.error('Erro ao criar artigo'); return; }
    setArticles(prev => [...prev, data as any]);
    toast.success('Artigo criado!');
  };

  const updateArticle = async (art: HelpArticle) => {
    setSaving(true);
    const { error } = await supabase.from('help_articles').update({
      title: art.title, icon_name: art.icon_name, purpose: art.purpose,
      sort_order: art.sort_order, enabled: art.enabled, updated_at: new Date().toISOString(),
    } as any).eq('id', art.id);
    setSaving(false);
    if (error) { toast.error('Erro ao salvar'); return; }
    toast.success('Artigo salvo!');
  };

  const deleteArticle = async (id: string) => {
    if (!confirm('Excluir artigo e seus passos?')) return;
    await supabase.from('help_steps').delete().eq('article_id', id);
    await supabase.from('help_articles').delete().eq('id', id);
    setArticles(prev => prev.filter(a => a.id !== id));
    setSteps(prev => prev.filter(s => s.article_id !== id));
    toast.success('Artigo excluído');
  };

  // ── Step CRUD ──
  const addStep = async (articleId: string) => {
    const artSteps = steps.filter(s => s.article_id === articleId);
    const maxOrder = artSteps.length > 0 ? Math.max(...artSteps.map(s => s.sort_order)) + 1 : 0;
    const { data, error } = await supabase.from('help_steps').insert({
      article_id: articleId, title: 'Novo Passo', description: 'Descrição do passo', sort_order: maxOrder,
    } as any).select().single();
    if (error) { toast.error('Erro ao criar passo'); return; }
    setSteps(prev => [...prev, { ...data, image_url: null, video_url: null } as any]);
    toast.success('Passo adicionado!');
  };

  const updateStep = async (step: HelpStep) => {
    const { error } = await supabase.from('help_steps').update({
      title: step.title, description: step.description, sort_order: step.sort_order,
    } as any).eq('id', step.id);
    if (error) { toast.error('Erro ao salvar passo'); return; }
    toast.success('Passo salvo!');
  };

  const deleteStep = async (id: string) => {
    await supabase.from('help_steps').delete().eq('id', id);
    setSteps(prev => prev.filter(s => s.id !== id));
    toast.success('Passo removido');
  };

  // ── FAQ CRUD ──
  const addFaq = async () => {
    const maxOrder = faqs.length > 0 ? Math.max(...faqs.map(f => f.sort_order)) + 1 : 0;
    const { data, error } = await supabase.from('help_faqs').insert({
      question: 'Nova pergunta?', answer: 'Resposta aqui...', sort_order: maxOrder,
    } as any).select().single();
    if (error) { toast.error('Erro ao criar FAQ'); return; }
    setFaqs(prev => [...prev, data as any]);
    toast.success('FAQ criada!');
  };

  const updateFaq = async (faq: HelpFaq) => {
    const { error } = await supabase.from('help_faqs').update({
      question: faq.question, answer: faq.answer, sort_order: faq.sort_order,
      enabled: faq.enabled, updated_at: new Date().toISOString(),
    } as any).eq('id', faq.id);
    if (error) { toast.error('Erro ao salvar FAQ'); return; }
    toast.success('FAQ salva!');
  };

  const deleteFaq = async (id: string) => {
    if (!confirm('Excluir FAQ?')) return;
    await supabase.from('help_faqs').delete().eq('id', id);
    setFaqs(prev => prev.filter(f => f.id !== id));
    toast.success('FAQ excluída');
  };

  // ── Helpers ──
  const setCatField = (id: string, field: keyof HelpCategory, value: any) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };
  const setArtField = (id: string, field: keyof HelpArticle, value: any) => {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };
  const setStepField = (id: string, field: keyof HelpStep, value: any) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };
  const setFaqField = (id: string, field: keyof HelpFaq, value: any) => {
    setFaqs(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const selectedCategory = selectedCatId ? categories.find(c => c.id === selectedCatId) : null;

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex gap-2">
        {([
          { key: 'categories', label: '📂 Categorias & Artigos', icon: BookOpen },
          { key: 'faqs', label: '❓ FAQs', icon: MessageCircleQuestion },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => { setView(tab.key as any); setSelectedCatId(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              view === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Categories list ── */}
      {view === 'categories' && !selectedCatId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Categorias ({categories.length})</p>
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={addCategory}>
              <Plus className="h-3 w-3" /> Nova Categoria
            </Button>
          </div>

          {categories.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhuma categoria criada ainda.</p>
          )}

          {categories.sort((a, b) => a.sort_order - b.sort_order).map(cat => {
            const catArticleCount = articles.filter(a => a.category_id === cat.id).length;
            return (
              <div key={cat.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <input value={cat.label} onChange={e => setCatField(cat.id, 'label', e.target.value)}
                      className="w-full text-sm font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-foreground" />
                    <textarea value={cat.description} onChange={e => setCatField(cat.id, 'description', e.target.value)}
                      rows={2} className="w-full text-xs bg-transparent border border-border rounded-md p-2 text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setCatField(cat.id, 'enabled', !cat.enabled)}
                      className={`p-1 rounded-md transition-colors ${cat.enabled ? 'text-primary' : 'text-muted-foreground'}`}
                      title={cat.enabled ? 'Visível' : 'Oculta'}>
                      {cat.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => deleteCategory(cat.id)} className="p-1 rounded-md text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select value={cat.icon_name} onChange={e => setCatField(cat.id, 'icon_name', e.target.value)}
                    className="h-7 text-[11px] bg-background border border-input rounded-md px-2 text-foreground">
                    {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                  <input type="number" value={cat.sort_order} onChange={e => setCatField(cat.id, 'sort_order', parseInt(e.target.value) || 0)}
                    className="w-14 h-7 text-[11px] text-center bg-background border border-input rounded-md text-foreground" title="Ordem" />
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => updateCategory(cat)} disabled={saving}>
                    <Save className="h-3 w-3" /> Salvar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1" onClick={() => setSelectedCatId(cat.id)}>
                    📝 {catArticleCount} artigo{catArticleCount !== 1 ? 's' : ''} →
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Articles for selected category ── */}
      {view === 'categories' && selectedCatId && selectedCategory && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => { setSelectedCatId(null); setExpandedArticle(null); }}
              className="p-1 rounded-md hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button>
            <p className="text-xs font-semibold text-foreground flex-1">
              Artigos de "{selectedCategory.label}" ({articles.filter(a => a.category_id === selectedCatId).length})
            </p>
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => addArticle(selectedCatId)}>
              <Plus className="h-3 w-3" /> Novo Artigo
            </Button>
          </div>

          {articles.filter(a => a.category_id === selectedCatId).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum artigo nesta categoria.</p>
          )}

          {articles.filter(a => a.category_id === selectedCatId).sort((a, b) => a.sort_order - b.sort_order).map(art => {
            const artSteps = steps.filter(s => s.article_id === art.id).sort((a, b) => a.sort_order - b.sort_order);
            const isExpanded = expandedArticle === art.id;

            return (
              <div key={art.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <button onClick={() => setExpandedArticle(isExpanded ? null : art.id)} className="mt-0.5">
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                    <div className="flex-1 space-y-1.5">
                      <input value={art.title} onChange={e => setArtField(art.id, 'title', e.target.value)}
                        className="w-full text-sm font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-foreground" />
                      <textarea value={art.purpose} onChange={e => setArtField(art.id, 'purpose', e.target.value)}
                        rows={2} className="w-full text-xs bg-transparent border border-border rounded-md p-2 text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="Propósito / Para que serve" />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setArtField(art.id, 'enabled', !art.enabled)}
                        className={`p-1 rounded-md ${art.enabled ? 'text-primary' : 'text-muted-foreground'}`}>
                        {art.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => deleteArticle(art.id)} className="p-1 rounded-md text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-6 flex-wrap">
                    <select value={art.icon_name} onChange={e => setArtField(art.id, 'icon_name', e.target.value)}
                      className="h-7 text-[11px] bg-background border border-input rounded-md px-2 text-foreground">
                      {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                    <input type="number" value={art.sort_order} onChange={e => setArtField(art.id, 'sort_order', parseInt(e.target.value) || 0)}
                      className="w-14 h-7 text-[11px] text-center bg-background border border-input rounded-md text-foreground" />
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => updateArticle(art)} disabled={saving}>
                      <Save className="h-3 w-3" /> Salvar
                    </Button>
                    <span className="text-[10px] text-muted-foreground">{artSteps.length} passo(s)</span>
                  </div>
                </div>

                {/* Steps */}
                {isExpanded && (
                  <div className="border-t border-border px-3 py-2 space-y-2 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-muted-foreground">Passos</p>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => addStep(art.id)}>
                        <Plus className="h-2.5 w-2.5" /> Passo
                      </Button>
                    </div>

                    {artSteps.map((step, si) => (
                      <div key={step.id} className="bg-card border border-border rounded-lg p-2 space-y-1.5">
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">
                            {si + 1}
                          </span>
                          <div className="flex-1 space-y-1">
                            <input value={step.title} onChange={e => setStepField(step.id, 'title', e.target.value)}
                              className="w-full text-xs font-medium bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-foreground"
                              placeholder="Título do passo" />
                            <textarea value={step.description} onChange={e => setStepField(step.id, 'description', e.target.value)}
                              rows={2} className="w-full text-[11px] bg-transparent border border-border rounded-md p-1.5 text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                              placeholder="Descrição detalhada" />

                            {/* Media editor */}
                            <StepMediaEditor
                              step={step}
                              onUpdate={(updated) => setSteps(prev => prev.map(s => s.id === updated.id ? updated : s))}
                            />
                          </div>
                          <div className="flex flex-col items-center gap-1 shrink-0">
                            <input type="number" value={step.sort_order} onChange={e => setStepField(step.id, 'sort_order', parseInt(e.target.value) || 0)}
                              className="w-10 h-6 text-[10px] text-center bg-background border border-input rounded text-foreground" />
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => updateStep(step)}>
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteStep(step.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── FAQs view ── */}
      {view === 'faqs' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">FAQs ({faqs.length})</p>
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={addFaq}>
              <Plus className="h-3 w-3" /> Nova FAQ
            </Button>
          </div>

          {faqs.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhuma FAQ criada ainda.</p>
          )}

          {faqs.sort((a, b) => a.sort_order - b.sort_order).map(faq => (
            <div key={faq.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-1.5">
                  <input value={faq.question} onChange={e => setFaqField(faq.id, 'question', e.target.value)}
                    className="w-full text-sm font-medium bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none text-foreground"
                    placeholder="Pergunta" />
                  <textarea value={faq.answer} onChange={e => setFaqField(faq.id, 'answer', e.target.value)}
                    rows={3} className="w-full text-xs bg-transparent border border-border rounded-md p-2 text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Resposta" />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setFaqField(faq.id, 'enabled', !faq.enabled)}
                    className={`p-1 rounded-md ${faq.enabled ? 'text-primary' : 'text-muted-foreground'}`}>
                    {faq.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => deleteFaq(faq.id)} className="p-1 rounded-md text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" value={faq.sort_order} onChange={e => setFaqField(faq.id, 'sort_order', parseInt(e.target.value) || 0)}
                  className="w-14 h-7 text-[11px] text-center bg-background border border-input rounded-md text-foreground" />
                <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => updateFaq(faq)}>
                  <Save className="h-3 w-3" /> Salvar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminHelpCenterManager;
