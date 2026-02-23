import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBodyScroll } from '@/hooks/useBodyScroll';
import logoDark from '@/assets/logo-dark.png';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Search, Drum, Music, Waves, Sliders, Clock, Bluetooth,
  Sparkles, Pencil, Eye, Store, ListMusic, Volume2, HelpCircle,
  ChevronDown, ChevronRight, Play, Headphones, BookOpen, Lightbulb,
  MessageCircleQuestion, ExternalLink
} from 'lucide-react';

/* ─── FAQ Data ─── */
const FAQ_ITEMS = [
  { q: 'Os sons funcionam offline?', a: 'Sim! Após carregar os sons pela primeira vez, eles ficam armazenados localmente no seu dispositivo via IndexedDB. Você pode tocar mesmo sem internet.' },
  { q: 'Como importar sons da Glory Store?', a: 'Segure um pad, selecione "Importar da Glory Store" e escolha o som desejado entre os packs adquiridos. O som será baixado e salvo offline.' },
  { q: 'Posso usar controlador MIDI?', a: 'Sim! Conecte um controlador MIDI via USB ou Bluetooth. Acesse as configurações MIDI no menu e mapeie notas para pads e CCs para funções.' },
  { q: 'Como compartilhar meu repertório?', a: 'No repertório, toque no ícone de compartilhar do evento. Um link público será gerado para que outros músicos vejam as músicas e BPMs.' },
  { q: 'Meu metrônomo está sem som, o que fazer?', a: 'Verifique se o modo silencioso do dispositivo está desativado e se o volume do metrônomo no mixer está acima de zero.' },
  { q: 'Os efeitos de áudio consomem mais bateria?', a: 'Minimamente. Os efeitos (EQ, Reverb, Delay) usam a Web Audio API nativa do navegador, que é otimizada para performance em tempo real.' },
];

/* ─── Tutorial Categories & Content ─── */
interface TutorialArticle {
  title: string;
  icon: React.ReactNode;
  steps: { title: string; description: string }[];
}

interface TutorialCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  articles: TutorialArticle[];
}

const CATEGORIES: TutorialCategory[] = [
  {
    id: 'pads',
    label: 'Pads de Bateria',
    icon: <Drum className="h-5 w-5" />,
    description: 'Aprenda a tocar, personalizar e configurar os pads de bateria.',
    articles: [
      {
        title: 'Tocando os Pads',
        icon: <Play className="h-4 w-4" />,
        steps: [
          { title: 'Toque para reproduzir', description: 'Cada pad toca um som diferente de bateria, percussão ou loop. Basta tocar para ouvir o som.' },
          { title: 'Opções avançadas', description: 'Segure um pad para acessar opções: volume individual, pan (L/R), renomear, alterar cor, efeitos de áudio e importar sons.' },
          { title: 'Tamanho dos pads', description: 'No menu, use os botões – e + para ajustar o tamanho dos pads conforme sua preferência.' },
        ],
      },
      {
        title: 'Loops Rítmicos',
        icon: <Music className="h-4 w-4" />,
        steps: [
          { title: 'Ativar/desativar', description: 'Os pads de loop (ex: WSP, WFL) funcionam como toggle: toque para iniciar e toque novamente para parar.' },
          { title: 'Sincronização com BPM', description: 'Os loops sincronizam automaticamente com o BPM do metrônomo. Altere o BPM e o loop acompanha.' },
          { title: 'Início na batida 1', description: 'Os loops sempre começam no kick (batida 1) do próximo compasso para manter a sincronia perfeita.' },
        ],
      },
    ],
  },
  {
    id: 'repertorio',
    label: 'Repertório & Eventos',
    icon: <ListMusic className="h-5 w-5" />,
    description: 'Organize músicas, eventos e navegue entre repertórios.',
    articles: [
      {
        title: 'Criando Eventos',
        icon: <ListMusic className="h-4 w-4" />,
        steps: [
          { title: 'Novo evento', description: 'Crie eventos (ex: Culto Domingo) com data e adicione músicas ao repertório de cada evento.' },
          { title: 'Músicas por evento', description: 'Cada música salva BPM, tom, volumes, pans, efeitos, sons customizados e mapeamentos MIDI automaticamente.' },
          { title: 'Navegação rápida', description: 'Use os botões ◀ ▶ no cabeçalho para navegar entre músicas do evento ativo. Também funciona via MIDI CC.' },
        ],
      },
      {
        title: 'Compartilhamento',
        icon: <ExternalLink className="h-4 w-4" />,
        steps: [
          { title: 'Link público', description: 'Gere um link de compartilhamento para que outros músicos vejam o repertório com músicas, BPMs e tonalidades.' },
          { title: 'Evento persistente', description: 'O último evento selecionado permanece ativo mesmo ao sair e voltar ao app.' },
        ],
      },
    ],
  },
  {
    id: 'ambient',
    label: 'Continuous Pads',
    icon: <Waves className="h-5 w-5" />,
    description: 'Crie atmosferas com pads de notas sustentadas.',
    articles: [
      {
        title: 'Usando Continuous Pads',
        icon: <Waves className="h-4 w-4" />,
        steps: [
          { title: 'Ativar notas', description: 'Toque nos pads de notas para criar atmosferas de louvor. Cada pad representa uma nota musical sustentada.' },
          { title: 'Volume individual', description: 'Use o slider vertical para ajustar o volume dos continuous pads de forma independente.' },
          { title: 'Pan (panorâmica)', description: 'O knob laranja controla a panorâmica esquerda/direita dos continuous pads.' },
        ],
      },
    ],
  },
  {
    id: 'mixer',
    label: 'Volume & Mixer',
    icon: <Volume2 className="h-5 w-5" />,
    description: 'Controle volumes individuais e master com o mixer de faders.',
    articles: [
      {
        title: 'Mixer de Faders',
        icon: <Sliders className="h-4 w-4" />,
        steps: [
          { title: 'Páginas do mixer', description: 'Navegue entre as páginas 1, 2 e 3 do mixer para controlar volumes individuais de cada pad, metrônomo, continuous pads e master.' },
          { title: 'Pan Master', description: 'O knob laranja direciona todo o áudio para esquerda (L) ou direita (R). Útil para separar instrumentos no retorno.' },
        ],
      },
    ],
  },
  {
    id: 'metronomo',
    label: 'Metrônomo',
    icon: <Clock className="h-5 w-5" />,
    description: 'Configure BPM, compasso e sincronize com loops.',
    articles: [
      {
        title: 'Configurando o Metrônomo',
        icon: <Clock className="h-4 w-4" />,
        steps: [
          { title: 'Ajuste de BPM', description: 'Ajuste o BPM com slider, botões +/– ou clicando diretamente no número. Escolha compasso (4/4, 3/4, 6/8).' },
          { title: 'Sync', description: 'O botão Sync sincroniza os pads de loop com o grid rítmico do metrônomo.' },
          { title: 'Tom da música', description: 'O campo Tom permite editar a tonalidade da música, que é salva automaticamente no repertório.' },
          { title: 'Pan do metrônomo', description: 'O knob laranja direciona o clique do metrônomo para L ou R. Útil para ouvir separado da banda.' },
        ],
      },
    ],
  },
  {
    id: 'midi',
    label: 'MIDI',
    icon: <Bluetooth className="h-5 w-5" />,
    description: 'Conecte controladores MIDI USB ou Bluetooth.',
    articles: [
      {
        title: 'Controlador MIDI',
        icon: <Bluetooth className="h-4 w-4" />,
        steps: [
          { title: 'Conexão', description: 'Conecte um controlador MIDI USB ou Bluetooth. O app detecta automaticamente o dispositivo.' },
          { title: 'Mapeamento', description: 'Mapeie notas MIDI para pads e CCs para funções como volume, BPM e navegação de músicas.' },
          { title: 'Salvo por música', description: 'Os mapeamentos MIDI (notas, CCs, canais) são salvos individualmente por música e restaurados automaticamente.' },
        ],
      },
    ],
  },
  {
    id: 'effects',
    label: 'Efeitos de Áudio',
    icon: <Sparkles className="h-5 w-5" />,
    description: 'EQ, Reverb e Delay com sync ao BPM.',
    articles: [
      {
        title: 'EQ, Reverb e Delay',
        icon: <Sparkles className="h-4 w-4" />,
        steps: [
          { title: 'Acesso', description: 'Segure um pad para abrir os efeitos: EQ de 3 bandas, Reverb e Delay. Recurso exclusivo do plano Master.' },
          { title: 'Delay sincronizado', description: 'Ative "Sync BPM" no delay para sincronizar com o metrônomo. Escolha subdivisões musicais (1/4, 1/8, etc).' },
        ],
      },
    ],
  },
  {
    id: 'modos',
    label: 'Modos Especiais',
    icon: <Eye className="h-5 w-5" />,
    description: 'Modo Edição e Modo Foco para diferentes situações.',
    articles: [
      {
        title: 'Modo Edição',
        icon: <Pencil className="h-4 w-4" />,
        steps: [
          { title: 'Ativar', description: 'Ative no menu para acessar configurações de cada pad com um toque, sem precisar segurar.' },
        ],
      },
      {
        title: 'Modo Foco',
        icon: <Eye className="h-4 w-4" />,
        steps: [
          { title: 'Tela cheia', description: 'Oculta o cabeçalho para maximizar os pads. Ideal para apresentações ao vivo!' },
          { title: 'Acesso rápido', description: 'Metrônomo e Continuous Pads continuam acessíveis mesmo no modo foco.' },
        ],
      },
    ],
  },
  {
    id: 'store',
    label: 'Glory Store',
    icon: <Store className="h-5 w-5" />,
    description: 'Adquira e importe packs de sons profissionais.',
    articles: [
      {
        title: 'Comprando e Importando',
        icon: <Store className="h-4 w-4" />,
        steps: [
          { title: 'Acesso', description: 'Acesse a loja pelo menu ou pela aba Loja no rodapé. É necessário estar logado para comprar.' },
          { title: 'Importar para pads', description: 'Após adquirir, segure um pad e selecione "Importar da Glory Store" para aplicar o som diretamente.' },
          { title: 'Offline', description: 'Após importar, os sons ficam salvos localmente e funcionam sem internet.' },
        ],
      },
    ],
  },
];

const Help = () => {
  const navigate = useNavigate();
  useBodyScroll();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const q = searchQuery.toLowerCase().trim();

  const filteredCategories = CATEGORIES.filter(cat => {
    if (!q) return true;
    if (cat.label.toLowerCase().includes(q)) return true;
    return cat.articles.some(a =>
      a.title.toLowerCase().includes(q) ||
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
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft className="h-4 w-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-violet-500" />
              <span className="font-bold text-sm text-gray-900">Central de Ajuda</span>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate('/app')}
            className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg h-8 px-3 text-xs font-medium gap-1.5">
            <Play className="h-3 w-3" />
            Abrir App
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-violet-900 p-6 sm:p-10 mb-8">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 40%, rgba(139,92,246,0.5), transparent 50%), radial-gradient(circle at 80% 60%, rgba(236,72,153,0.3), transparent 50%)' }} />
          <div className="relative z-10 text-center max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-300 mb-4">
              <HelpCircle className="h-3 w-3" />
              Guias & Tutoriais
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Como podemos ajudar?</h1>
            <p className="text-sm text-gray-300 mb-6">Encontre tutoriais, guias e respostas para usar o Glory Pads ao máximo.</p>

            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar tutoriais, funcionalidades..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: <BookOpen className="h-4 w-4 text-violet-500" />, label: 'Tutoriais', value: CATEGORIES.reduce((a, c) => a + c.articles.length, 0).toString() },
            { icon: <Lightbulb className="h-4 w-4 text-amber-500" />, label: 'Categorias', value: CATEGORIES.length.toString() },
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
              Voltar às categorias
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
                {selectedCat.icon}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedCat.label}</h2>
                <p className="text-xs text-gray-500">{selectedCat.description}</p>
              </div>
            </div>

            <div className="space-y-3">
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
                          <p className="text-[11px] text-gray-400">{article.steps.length} passo{article.steps.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        <div className="relative pl-6 pt-4 space-y-4">
                          {/* vertical line */}
                          <div className="absolute left-[9px] top-4 bottom-0 w-px bg-violet-200" />
                          {article.steps.map((step, si) => (
                            <div key={si} className="relative">
                              <div className="absolute -left-6 top-0.5 h-[18px] w-[18px] rounded-full bg-violet-100 border-2 border-violet-400 flex items-center justify-center">
                                <span className="text-[9px] font-bold text-violet-600">{si + 1}</span>
                              </div>
                              <h4 className="text-sm font-semibold text-gray-800 mb-0.5">{step.title}</h4>
                              <p className="text-xs text-gray-500 leading-relaxed">{step.description}</p>
                            </div>
                          ))}
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
            <h2 className="text-base font-bold text-gray-900 mb-4">Categorias</h2>
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
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-violet-400 transition-colors mt-1" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{cat.label}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{cat.description}</p>
                  <p className="text-[10px] text-violet-500 font-semibold mt-2">
                    {cat.articles.length} tutorial{cat.articles.length !== 1 ? 's' : ''}
                  </p>
                </button>
              ))}
            </div>

            {/* FAQ Section */}
            <div className="mb-10">
              <div className="flex items-center gap-2.5 mb-4">
                <MessageCircleQuestion className="h-5 w-5 text-emerald-500" />
                <h2 className="text-base font-bold text-gray-900">Perguntas Frequentes</h2>
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

            {/* Dica rápida */}
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl border border-violet-200 p-5 sm:p-6 mb-6">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                  <Lightbulb className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-violet-900 mb-1">Dica Rápida</h3>
                  <p className="text-xs text-violet-700 leading-relaxed">
                    Dentro do app, toque no ícone <HelpCircle className="inline h-3 w-3" /> no cabeçalho para iniciar um tutorial interativo que destaca cada funcionalidade diretamente na tela.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Help;
