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
  video_url: string | null;
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

/* ─── Default content seed data ─── */
const DEFAULT_CATEGORIES = [
  { label: 'Pads de Bateria', description: 'A tela principal do app. Os pads são botões interativos que reproduzem sons de bateria, percussão e loops ao toque.', icon_name: 'drum', articles: [
    { title: 'Tocando os Pads', icon_name: 'play', purpose: 'Os pads servem como uma bateria eletrônica portátil. Cada pad reproduz um som diferente — kicks, snares, hi-hats, claps, crashes e mais.', steps: [
      { title: 'Toque para reproduzir', description: 'Basta tocar em qualquer pad para ouvir o som correspondente. A cor do pad indica a categoria do som.' },
      { title: 'Opções avançadas do pad', description: 'Segure (pressão longa) em qualquer pad para abrir o menu de opções: ajustar volume individual, pan, renomear, alterar cor, aplicar efeitos e importar sons.' },
      { title: 'Tamanho dos pads', description: 'No menu (≡), use os botões – e + para diminuir ou aumentar o tamanho dos pads.' },
      { title: 'Grid 3x3', description: 'Os pads são organizados em uma grade 3x3 por página. Navegue entre as páginas (1, 2, 3) para acessar todos os pads.' },
    ]},
    { title: 'Loops Rítmicos', icon_name: 'music', purpose: 'Os loops são padrões rítmicos pré-gravados que tocam em repetição contínua, sincronizados com o BPM do metrônomo.', steps: [
      { title: 'Ativar/desativar', description: 'Os pads de loop funcionam como toggle: toque uma vez para iniciar o loop e toque novamente para parar.' },
      { title: 'Sincronização automática com BPM', description: 'Os loops se ajustam automaticamente ao BPM definido no metrônomo.' },
      { title: 'Entrada no tempo certo', description: 'Os loops sempre começam alinhados ao kick (batida 1) do compasso para manter a sincronia musical perfeita.' },
    ]},
  ]},
  { label: 'Repertório & Eventos', description: 'O sistema de repertório permite organizar músicas por evento, salvando todas as configurações automaticamente.', icon_name: 'list-music', articles: [
    { title: 'Criando e Gerenciando Eventos', icon_name: 'list-music', purpose: 'Eventos organizam suas músicas para cada ocasião. Crie eventos como "Culto Domingo", "Ensaio Quarta" e adicione músicas.', steps: [
      { title: 'Criar evento', description: 'Toque em "Repertório" no cabeçalho e depois em "+ Novo Evento". Defina um nome e a data do evento.' },
      { title: 'Adicionar músicas', description: 'Dentro do evento, toque em "+ Música" para adicionar. Cada música salva automaticamente: BPM, tom, volumes, panorâmicas, efeitos e mapeamentos MIDI.' },
      { title: 'Carregar uma música', description: 'Toque no nome da música dentro do evento para carregá-la. Todos os pads, volumes, efeitos e configurações serão restaurados.' },
      { title: 'Navegação rápida entre músicas', description: 'Use os botões ◀ ▶ no cabeçalho quando um evento está ativo para navegar entre as músicas. Também funciona via MIDI CC.' },
    ]},
    { title: 'Compartilhamento de Repertório', icon_name: 'external-link', purpose: 'Compartilhe o repertório do evento com outros músicos via link público.', steps: [
      { title: 'Gerar link público', description: 'No evento, toque no ícone de compartilhamento. Um link será gerado e pode ser enviado por WhatsApp, email ou mensageiro.' },
      { title: 'O que aparece no link', description: 'Os músicos verão: nome do evento, data, lista de músicas com BPM e tonalidade. Não é necessário ter conta no app.' },
    ]},
  ]},
  { label: 'Continuous Pads', description: 'Pads de notas sustentadas que criam atmosferas sonoras contínuas. Ideais para louvor, oração e transições.', icon_name: 'waves', articles: [
    { title: 'Usando Continuous Pads', icon_name: 'waves', purpose: 'Geram notas musicais sustentadas que tocam continuamente. Servem para criar atmosferas de louvor e transições suaves.', steps: [
      { title: 'Ativar notas', description: 'Na aba "Pads" do rodapé, expanda "Continuous Pads". Toque em qualquer nota (C, D, E, F...) para ativá-la. Múltiplas notas podem soar simultaneamente.' },
      { title: 'Volume individual', description: 'Use o slider vertical à esquerda para ajustar o volume dos continuous pads independentemente.' },
      { title: 'Pan (panorâmica)', description: 'O knob laranja controla a direção do som: L (esquerda) ou R (direita). Útil para separar o ambiente da bateria.' },
    ]},
  ]},
  { label: 'Volume & Mixer', description: 'O mixer de faders oferece controle granular de volume para cada pad, metrônomo, continuous pads e saída master.', icon_name: 'volume-2', articles: [
    { title: 'Mixer de Faders', icon_name: 'sliders', purpose: 'O mixer funciona como uma mesa de som digital para equilibrar os sons ao vivo.', steps: [
      { title: 'Navegação entre páginas', description: 'O mixer é dividido em 3 páginas para acomodar todos os faders. Navegue tocando nos números.' },
      { title: 'Faders individuais', description: 'Arraste cada fader para ajustar o volume (0-100). O fader "Master" controla o volume geral.' },
      { title: 'Pan Master', description: 'O knob laranja direciona toda a saída de áudio para esquerda (L) ou direita (R).' },
    ]},
  ]},
  { label: 'Metrônomo', description: 'Metrônomo integrado com controle de BPM, compasso, sync de loops e indicador visual de batidas.', icon_name: 'clock', articles: [
    { title: 'Configurando o Metrônomo', icon_name: 'clock', purpose: 'O metrônomo serve como referência rítmica. Sincroniza loops, fornece clique audível e indicadores visuais.', steps: [
      { title: 'Ajuste de BPM', description: 'Use o slider, os botões – / + para ajuste fino, ou toque no número do BPM para digitar um valor exato.' },
      { title: 'Compasso', description: 'Escolha entre 4/4, 3/4 ou 6/8. O compasso afeta a contagem e a sincronização dos loops.' },
      { title: 'Play / Stop', description: 'Toque em Play (verde) para iniciar. Os indicadores visuais piscam a cada batida.' },
      { title: 'Sync', description: 'O botão "Sync" sincroniza os pads de loop com o grid rítmico do metrônomo.' },
      { title: 'Tom da música', description: 'O campo "Tom" define a tonalidade (C, D, Em, etc). Salva automaticamente no repertório.' },
      { title: 'Pan do metrônomo', description: 'O knob "Pan Metrônomo" direciona o clique para L ou R. Útil para ouvir separado da banda.' },
    ]},
  ]},
  { label: 'MIDI', description: 'Conecte controladores MIDI (USB ou Bluetooth) e mapeie pads, volumes, BPM e navegação.', icon_name: 'bluetooth', articles: [
    { title: 'Controlador MIDI', icon_name: 'bluetooth', purpose: 'A integração MIDI permite usar controladores físicos para tocar pads, ajustar volumes e navegar entre músicas.', steps: [
      { title: 'Conexão', description: 'Conecte um controlador MIDI via USB ou Bluetooth. O app detecta automaticamente via Web MIDI API.' },
      { title: 'Mapeamento de notas', description: 'Nas configurações MIDI, associe cada nota a um pad. Toque a nota no controlador e selecione o pad.' },
      { title: 'Mapeamento de CCs', description: 'Controles contínuos podem ser mapeados para: volume master, BPM, navegação de músicas e volume individual.' },
      { title: 'Salvo por música', description: 'Todos os mapeamentos MIDI são salvos individualmente por música no repertório.' },
    ]},
  ]},
  { label: 'Efeitos de Áudio', description: 'Aplique EQ, Reverb e Delay com sync ao BPM em cada pad individualmente. Recurso do plano Master.', icon_name: 'sparkles', articles: [
    { title: 'EQ, Reverb e Delay', icon_name: 'sparkles', purpose: 'Os efeitos permitem moldar o som de cada pad: EQ para frequências, Reverb para profundidade e Delay para repetições.', steps: [
      { title: 'Acesso aos efeitos', description: 'Segure qualquer pad e selecione "Efeitos". O painel abre com EQ, Reverb e Delay.' },
      { title: 'EQ de 3 bandas', description: 'Ajuste Low, Mid e High. Valores positivos amplificam, negativos atenuam.' },
      { title: 'Reverb', description: 'Adiciona reverberação simulando ambientes como salas, igrejas ou halls. Ajuste Mix e Decay.' },
      { title: 'Delay sincronizado ao BPM', description: 'Ative "Sync BPM" para sincronizar o delay com o metrônomo. Escolha subdivisões (1/4, 1/8, 1/16).' },
    ]},
  ]},
  { label: 'Modos Especiais', description: 'Modo Edição para configurar pads rapidamente e Modo Foco para maximizar a área de toque.', icon_name: 'eye', articles: [
    { title: 'Modo Edição', icon_name: 'pencil', purpose: 'Transforma o toque simples em atalho para configurações. Toque em qualquer pad para abrir opções.', steps: [
      { title: 'Ativar', description: 'Abra o menu (≡) e ative "Modo Edição". Os pads ficam com indicador visual diferenciado.' },
      { title: 'Editar pads', description: 'Com o modo ativo, toque em qualquer pad para abrir opções (volume, pan, cor, efeitos, importação).' },
      { title: 'Desativar', description: 'Volte ao menu (≡) e desative "Modo Edição" para voltar ao comportamento normal.' },
    ]},
    { title: 'Modo Foco', icon_name: 'eye', purpose: 'Remove o cabeçalho para maximizar a área dos pads. Perfeito para apresentações ao vivo.', steps: [
      { title: 'Ativar', description: 'No menu (≡), ative "Modo Foco". O cabeçalho será ocultado, dando mais espaço para os pads.' },
      { title: 'Acessos rápidos', description: 'Mesmo no modo foco, metrônomo e Continuous Pads continuam acessíveis via footer.' },
      { title: 'Sair do modo foco', description: 'Toque na área do cabeçalho (reduzida) ou deslize para baixo para restaurar.' },
    ]},
  ]},
  { label: 'Glory Store', description: 'Loja de packs de sons profissionais. Adquira, baixe e importe diretamente para seus pads.', icon_name: 'store', articles: [
    { title: 'Navegando e Comprando', icon_name: 'store', purpose: 'A Glory Store é onde você encontra packs de sons profissionais para expandir sua biblioteca.', steps: [
      { title: 'Acesso à loja', description: 'Toque em "Loja" no rodapé do app ou acesse pelo menu (≡) > "Glory Store".' },
      { title: 'Filtros e categorias', description: 'Use o botão "Categorias" para filtrar por tipo de som: Bateria, Loops, Continuous Pads, Efeitos.' },
      { title: 'Ouvir preview', description: 'Cada pack possui previews de áudio. Toque no botão de play para ouvir antes de comprar.' },
      { title: 'Comprar pack', description: 'Toque em "Comprar" no card do pack. Pagamento seguro. É necessário estar logado.' },
    ]},
    { title: 'Importando para os Pads', icon_name: 'headphones', purpose: 'Após adquirir um pack, importe os sons em qualquer pad.', steps: [
      { title: 'Importar som', description: 'Segure qualquer pad > "Importar da Glory Store". Filtre por pack adquirido e selecione o som.' },
      { title: 'Download automático', description: 'O som é baixado e armazenado localmente. Após o download, funciona offline.' },
      { title: 'Biblioteca pessoal', description: 'Seus packs aparecem na seção "Minha Biblioteca". Packs removidos podem ser restaurados.' },
    ]},
  ]},
];

const DEFAULT_FAQS = [
  { question: 'Os sons funcionam offline?', answer: 'Sim! Após carregar os sons pela primeira vez, eles ficam armazenados localmente no seu dispositivo via IndexedDB. Você pode tocar mesmo sem internet.' },
  { question: 'Como importar sons da Glory Store?', answer: 'Segure um pad, selecione "Importar da Glory Store" e escolha o som desejado entre os packs adquiridos. O som será baixado e salvo localmente.' },
  { question: 'Posso usar controlador MIDI?', answer: 'Sim! Conecte um controlador MIDI via USB ou Bluetooth. O app detecta automaticamente. Acesse as configurações MIDI no menu para mapear notas e CCs.' },
  { question: 'Como compartilhar meu repertório?', answer: 'No repertório, toque no ícone de compartilhar do evento. Um link público será gerado para que outros músicos vejam as músicas, BPMs e tonalidades.' },
  { question: 'Meu metrônomo está sem som, o que fazer?', answer: 'Verifique se o modo silencioso do dispositivo está desativado e se o volume do metrônomo no mixer (página 1 do fader) está acima de zero.' },
  { question: 'Os efeitos de áudio consomem mais bateria?', answer: 'Minimamente. Os efeitos (EQ, Reverb, Delay) usam a Web Audio API nativa do navegador, otimizada para performance em tempo real.' },
  { question: 'Como salvo as configurações de uma música?', answer: 'Ao adicionar uma música ao repertório, todas as configurações (BPM, volumes, pans, efeitos, sons, MIDI) são salvas automaticamente.' },
  { question: 'Qual a diferença entre os planos?', answer: 'O plano Free oferece funcionalidades básicas. O Pro libera mais pads e importações. O Master dá acesso a efeitos de áudio (EQ, Reverb, Delay) e recursos avançados.' },
];

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

  // ── Import default content ──
  const [importing, setImporting] = useState(false);
  const importDefaultContent = async () => {
    if (!confirm('Importar todo o conteúdo padrão (9 categorias, 8 FAQs)? O conteúdo existente NÃO será apagado.')) return;
    setImporting(true);
    try {
      const baseOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) + 1 : 0;
      
      for (let ci = 0; ci < DEFAULT_CATEGORIES.length; ci++) {
        const dc = DEFAULT_CATEGORIES[ci];
        const { data: catData, error: catErr } = await supabase.from('help_categories').insert({
          label: dc.label, description: dc.description, icon_name: dc.icon_name, sort_order: baseOrder + ci,
        } as any).select().single();
        if (catErr || !catData) continue;

        for (let ai = 0; ai < dc.articles.length; ai++) {
          const da = dc.articles[ai];
          const { data: artData, error: artErr } = await supabase.from('help_articles').insert({
            category_id: (catData as any).id, title: da.title, icon_name: da.icon_name,
            purpose: da.purpose, sort_order: ai,
          } as any).select().single();
          if (artErr || !artData) continue;

          for (let si = 0; si < da.steps.length; si++) {
            const ds = da.steps[si];
            await supabase.from('help_steps').insert({
              article_id: (artData as any).id, title: ds.title, description: ds.description, sort_order: si,
            } as any);
          }
        }
      }

      // FAQs
      const baseFaqOrder = faqs.length > 0 ? Math.max(...faqs.map(f => f.sort_order)) + 1 : 0;
      for (let fi = 0; fi < DEFAULT_FAQS.length; fi++) {
        const df = DEFAULT_FAQS[fi];
        await supabase.from('help_faqs').insert({
          question: df.question, answer: df.answer, sort_order: baseFaqOrder + fi,
        } as any);
      }

      toast.success('Conteúdo padrão importado com sucesso!');
      await fetchAll();
    } catch {
      toast.error('Erro ao importar conteúdo');
    } finally {
      setImporting(false);
    }
  };

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
      sort_order: art.sort_order, enabled: art.enabled, video_url: art.video_url,
      updated_at: new Date().toISOString(),
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-semibold text-foreground">Categorias ({categories.length})</p>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={importDefaultContent} disabled={importing}>
                {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                Importar conteúdo padrão
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={addCategory}>
                <Plus className="h-3 w-3" /> Nova Categoria
              </Button>
            </div>
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
                      {/* YouTube video for article */}
                      <div className="flex items-center gap-1.5">
                        <Youtube className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <input value={art.video_url || ''} onChange={e => setArtField(art.id, 'video_url', e.target.value || null)}
                          placeholder="https://youtube.com/watch?v=... (vídeo do tópico)"
                          className="flex-1 h-7 px-2 text-[11px] bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                      </div>
                      {art.video_url && extractYouTubeId(art.video_url) && (
                        <div className="relative w-40 aspect-video rounded-md overflow-hidden border border-border">
                          <img src={`https://img.youtube.com/vi/${extractYouTubeId(art.video_url)}/mqdefault.jpg`} alt="YouTube" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Youtube className="h-5 w-5 text-red-500" />
                          </div>
                        </div>
                      )}
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
