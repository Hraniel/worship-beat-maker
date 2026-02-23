import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBodyScroll } from '@/hooks/useBodyScroll';
import logoDark from '@/assets/logo-dark.png';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Search, Drum, Music, Waves, Sliders, Clock, Bluetooth,
  Sparkles, Pencil, Eye, Store, ListMusic, Volume2, HelpCircle,
  ChevronDown, ChevronRight, Play, Headphones, BookOpen, Lightbulb,
  MessageCircleQuestion, ExternalLink, Image
} from 'lucide-react';

/* ─── FAQ Data ─── */
const FAQ_ITEMS = [
  { q: 'Os sons funcionam offline?', a: 'Sim! Após carregar os sons pela primeira vez, eles ficam armazenados localmente no seu dispositivo via IndexedDB. Você pode tocar mesmo sem internet.' },
  { q: 'Como importar sons da Glory Store?', a: 'Segure um pad, selecione "Importar da Glory Store" e escolha o som desejado entre os packs adquiridos. O som será baixado e salvo localmente no dispositivo.' },
  { q: 'Posso usar controlador MIDI?', a: 'Sim! Conecte um controlador MIDI via USB ou Bluetooth. O app detecta automaticamente. Acesse as configurações MIDI no menu para mapear notas e CCs.' },
  { q: 'Como compartilhar meu repertório?', a: 'No repertório, toque no ícone de compartilhar do evento. Um link público será gerado para que outros músicos vejam as músicas, BPMs e tonalidades.' },
  { q: 'Meu metrônomo está sem som, o que fazer?', a: 'Verifique se o modo silencioso do dispositivo está desativado e se o volume do metrônomo no mixer (página 1 do fader) está acima de zero.' },
  { q: 'Os efeitos de áudio consomem mais bateria?', a: 'Minimamente. Os efeitos (EQ, Reverb, Delay) usam a Web Audio API nativa do navegador, otimizada para performance em tempo real.' },
  { q: 'Como salvo as configurações de uma música?', a: 'Ao adicionar uma música ao repertório, todas as configurações (BPM, volumes, pans, efeitos, sons, MIDI) são salvas automaticamente. Ao recarregar a música, tudo é restaurado.' },
  { q: 'Qual a diferença entre os planos?', a: 'O plano Free oferece funcionalidades básicas. O Pro libera mais pads e importações. O Master dá acesso a efeitos de áudio (EQ, Reverb, Delay) e recursos avançados.' },
];

/* ─── Tutorial Categories & Content ─── */
interface TutorialStep {
  title: string;
  description: string;
}

interface TutorialArticle {
  title: string;
  icon: React.ReactNode;
  purpose: string;
  steps: TutorialStep[];
}

interface TutorialCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  screenshot?: string;
  articles: TutorialArticle[];
}

const CATEGORIES: TutorialCategory[] = [
  {
    id: 'pads',
    label: 'Pads de Bateria',
    icon: <Drum className="h-5 w-5" />,
    description: 'A tela principal do app. Os pads são botões interativos que reproduzem sons de bateria, percussão e loops ao toque.',
    // screenshot will be added when real screenshots are provided
    articles: [
      {
        title: 'Tocando os Pads',
        icon: <Play className="h-4 w-4" />,
        purpose: 'Os pads servem como uma bateria eletrônica portátil. Cada pad reproduz um som diferente — kicks, snares, hi-hats, claps, crashes e mais. É a forma principal de tocar no Glory Pads.',
        steps: [
          { title: 'Toque para reproduzir', description: 'Basta tocar em qualquer pad para ouvir o som correspondente. A cor do pad indica a categoria do som (vermelho = kick, laranja = snare, amarelo = hi-hat, etc).' },
          { title: 'Opções avançadas do pad', description: 'Segure (pressão longa) em qualquer pad para abrir o menu de opções: ajustar volume individual, pan (esquerda/direita), renomear o pad, alterar sua cor, aplicar efeitos de áudio e importar sons da Glory Store.' },
          { title: 'Tamanho dos pads', description: 'No menu (≡), use os botões – e + para diminuir ou aumentar o tamanho dos pads. Útil para adaptar à quantidade de pads que você precisa visualizar.' },
          { title: 'Grid 3x3', description: 'Os pads são organizados em uma grade 3x3 por página. Navegue entre as páginas (1, 2, 3) para acessar todos os pads disponíveis.' },
        ],
      },
      {
        title: 'Loops Rítmicos',
        icon: <Music className="h-4 w-4" />,
        purpose: 'Os loops são padrões rítmicos pré-gravados que tocam em repetição contínua, sincronizados com o BPM do metrônomo. Servem para criar uma base rítmica consistente sem precisar tocar manualmente.',
        steps: [
          { title: 'Ativar/desativar', description: 'Os pads de loop (identificados por nomes como WSP, WFL) funcionam como toggle: toque uma vez para iniciar o loop e toque novamente para parar. Enquanto ativo, o pad exibe uma borda animada.' },
          { title: 'Sincronização automática com BPM', description: 'Os loops se ajustam automaticamente ao BPM definido no metrônomo. Se você alterar o BPM de 120 para 90, o loop acompanha a mudança em tempo real.' },
          { title: 'Entrada no tempo certo', description: 'Os loops sempre começam alinhados ao kick (batida 1) do compasso para manter a sincronia musical perfeita, independentemente de quando você tocar o pad.' },
        ],
      },
    ],
  },
  {
    id: 'repertorio',
    label: 'Repertório & Eventos',
    icon: <ListMusic className="h-5 w-5" />,
    description: 'O sistema de repertório permite organizar músicas por evento (culto, ensaio, show), salvando todas as configurações de cada música automaticamente.',
    // screenshot will be added when real screenshots are provided
    articles: [
      {
        title: 'Criando e Gerenciando Eventos',
        icon: <ListMusic className="h-4 w-4" />,
        purpose: 'Eventos organizam suas músicas para cada ocasião. Crie eventos como "Culto Domingo", "Ensaio Quarta" ou "Conferência" e adicione as músicas do repertório em cada um. O app lembra o último evento selecionado.',
        steps: [
          { title: 'Criar evento', description: 'Toque em "Repertório" no cabeçalho e depois em "+ Novo Evento". Defina um nome (ex: Culto Domingo) e a data do evento.' },
          { title: 'Adicionar músicas', description: 'Dentro do evento, toque em "+ Música" para adicionar. Cada música salva automaticamente: BPM, tom, volumes de cada pad, panorâmicas, efeitos de áudio, sons customizados e mapeamentos MIDI.' },
          { title: 'Carregar uma música', description: 'Toque no nome da música dentro do evento para carregá-la. Todos os pads, volumes, efeitos e configurações serão restaurados instantaneamente.' },
          { title: 'Navegação rápida entre músicas', description: 'Use os botões ◀ ▶ que aparecem no cabeçalho quando um evento está ativo para navegar entre as músicas sem abrir o repertório. Também funciona via MIDI CC.' },
        ],
      },
      {
        title: 'Compartilhamento de Repertório',
        icon: <ExternalLink className="h-4 w-4" />,
        purpose: 'Compartilhe o repertório do evento com outros músicos da banda via link público. Eles poderão ver a lista de músicas, BPMs e tonalidades — útil para ensaios e preparação.',
        steps: [
          { title: 'Gerar link público', description: 'No evento, toque no ícone de compartilhamento. Um link será gerado e pode ser enviado por WhatsApp, email ou qualquer mensageiro.' },
          { title: 'O que aparece no link', description: 'Os músicos que acessarem verão: nome do evento, data, lista de músicas com BPM e tonalidade de cada uma. Não é necessário ter conta no app.' },
        ],
      },
    ],
  },
  {
    id: 'ambient',
    label: 'Continuous Pads',
    icon: <Waves className="h-5 w-5" />,
    description: 'Pads de notas sustentadas que criam atmosferas sonoras contínuas. Ideais para momentos de louvor, oração e transições.',
    articles: [
      {
        title: 'Usando Continuous Pads',
        icon: <Waves className="h-4 w-4" />,
        purpose: 'Os Continuous Pads geram notas musicais sustentadas (como pads de teclado) que tocam continuamente. Servem para criar atmosferas de louvor, preencher espaços sonoros e fazer transições suaves entre músicas.',
        steps: [
          { title: 'Ativar notas', description: 'Na aba "Pads" do rodapé, expanda a seção "Continuous Pads". Toque em qualquer nota (C, D, E, F...) para ativá-la. Toque novamente para desativar. Múltiplas notas podem soar simultaneamente para criar acordes.' },
          { title: 'Volume individual', description: 'Use o slider vertical à esquerda para ajustar o volume dos continuous pads de forma independente dos pads de bateria.' },
          { title: 'Pan (panorâmica)', description: 'O knob laranja controla a direção do som: gire para L (esquerda) ou R (direita). Útil para separar os pads de ambiente do som de bateria no retorno de palco.' },
        ],
      },
    ],
  },
  {
    id: 'mixer',
    label: 'Volume & Mixer',
    icon: <Volume2 className="h-5 w-5" />,
    description: 'O mixer de faders oferece controle granular de volume para cada pad, metrônomo, continuous pads e saída master.',
    // screenshot will be added when real screenshots are provided
    articles: [
      {
        title: 'Mixer de Faders',
        icon: <Sliders className="h-4 w-4" />,
        purpose: 'O mixer funciona como uma mesa de som digital. Ele permite ajustar o volume individual de cada pad, do metrônomo e dos continuous pads, além de controlar o volume master (geral). É essencial para equilibrar os sons ao vivo.',
        steps: [
          { title: 'Navegação entre páginas', description: 'O mixer é dividido em 3 páginas (1, 2, 3) para acomodar todos os faders. A página 1 contém metrônomo, PAD principal e os primeiros pads. Navegue entre as páginas tocando nos números.' },
          { title: 'Faders individuais', description: 'Arraste cada fader para cima/baixo para ajustar o volume. O valor aparece abaixo de cada fader (0-100). O fader "Master" controla o volume geral de toda a saída de áudio.' },
          { title: 'Pan Master', description: 'O knob laranja na parte inferior direciona toda a saída de áudio para esquerda (L) ou direita (R). Útil para enviar o som do app para apenas um lado do retorno/fone.' },
        ],
      },
    ],
  },
  {
    id: 'metronomo',
    label: 'Metrônomo',
    icon: <Clock className="h-5 w-5" />,
    description: 'Metrônomo integrado com controle de BPM, compasso, sync de loops e indicador visual de batidas.',
    // screenshot will be added when real screenshots are provided
    articles: [
      {
        title: 'Configurando o Metrônomo',
        icon: <Clock className="h-4 w-4" />,
        purpose: 'O metrônomo serve como referência rítmica para manter o tempo durante a performance. Ele sincroniza os loops, fornece clique audível e exibe indicadores visuais de batida. O BPM e compasso são salvos por música no repertório.',
        steps: [
          { title: 'Ajuste de BPM', description: 'Use o slider horizontal para ajustar rapidamente, os botões – / + para ajuste fino, ou toque diretamente no número do BPM para digitar um valor exato.' },
          { title: 'Compasso', description: 'Escolha entre 4/4, 3/4 ou 6/8 tocando nos botões correspondentes. O compasso afeta a contagem do metrônomo e a sincronização dos loops.' },
          { title: 'Play / Stop', description: 'Toque no botão Play (verde) para iniciar o metrônomo. Quando em execução, o botão fica vermelho (Stop) e os indicadores visuais piscam a cada batida.' },
          { title: 'Sync', description: 'O botão "Sync" (roxo) sincroniza os pads de loop com o grid rítmico do metrônomo. Quando ativo, os loops respeitam o tempo exato das batidas.' },
          { title: 'Tom da música', description: 'O campo "Tom" permite definir a tonalidade da música (C, D, Em, etc). Essa informação é salva automaticamente no repertório e aparece no compartilhamento.' },
          { title: 'Pan do metrônomo', description: 'O knob "Pan Metrônomo" direciona o clique para L ou R. Muito útil para ouvir o clique separado da banda — envie para apenas um lado do fone/retorno.' },
        ],
      },
    ],
  },
  {
    id: 'midi',
    label: 'MIDI',
    icon: <Bluetooth className="h-5 w-5" />,
    description: 'Conecte controladores MIDI (USB ou Bluetooth) e mapeie pads, volumes, BPM e navegação de músicas.',
    articles: [
      {
        title: 'Controlador MIDI',
        icon: <Bluetooth className="h-4 w-4" />,
        purpose: 'A integração MIDI permite usar controladores físicos (pads, pedaleiras, teclados) para tocar os pads, ajustar volumes e navegar entre músicas. Ideal para performances ao vivo onde você precisa de controle tátil.',
        steps: [
          { title: 'Conexão', description: 'Conecte um controlador MIDI via USB ou Bluetooth ao seu dispositivo. O app detecta automaticamente via Web MIDI API. Um indicador MIDI aparece quando conectado.' },
          { title: 'Mapeamento de notas', description: 'No menu de configurações MIDI, associe cada nota do controlador a um pad específico. Toque a nota no controlador e depois selecione o pad de destino.' },
          { title: 'Mapeamento de CCs', description: 'Controles contínuos (CCs) podem ser mapeados para: volume master, BPM, navegação anterior/próxima música, e volume individual de pads.' },
          { title: 'Salvo por música', description: 'Todos os mapeamentos MIDI (notas, CCs e canais) são salvos individualmente por música no repertório. Ao trocar de música, os mapeamentos são restaurados automaticamente.' },
        ],
      },
    ],
  },
  {
    id: 'effects',
    label: 'Efeitos de Áudio',
    icon: <Sparkles className="h-5 w-5" />,
    description: 'Aplique EQ de 3 bandas, Reverb e Delay com sync ao BPM em cada pad individualmente. Recurso do plano Master.',
    articles: [
      {
        title: 'EQ, Reverb e Delay',
        icon: <Sparkles className="h-4 w-4" />,
        purpose: 'Os efeitos de áudio permitem moldar o som de cada pad individualmente. Use o EQ para ajustar frequências (graves, médios, agudos), Reverb para adicionar profundidade espacial e Delay para criar repetições rítmicas. Essencial para polir o som ao vivo.',
        steps: [
          { title: 'Acesso aos efeitos', description: 'Segure (pressão longa) em qualquer pad e selecione "Efeitos" no menu de opções. O painel de efeitos se abre com três seções: EQ, Reverb e Delay.' },
          { title: 'EQ de 3 bandas', description: 'Ajuste Low (graves), Mid (médios) e High (agudos) com sliders individuais. Valores positivos amplificam, negativos atenuam. Útil para remover frequências indesejadas ou realçar o caráter do som.' },
          { title: 'Reverb', description: 'Adiciona uma "cauda" de reverberação ao som, simulando ambientes como salas, igrejas ou halls. Ajuste o Mix (quantidade de efeito) e o Decay (duração da reverberação).' },
          { title: 'Delay sincronizado ao BPM', description: 'Ative "Sync BPM" para que o tempo do delay se sincronize com o metrônomo. Escolha subdivisões musicais (1/4, 1/8, 1/16) para que as repetições caiam exatamente no tempo da música.' },
        ],
      },
    ],
  },
  {
    id: 'modos',
    label: 'Modos Especiais',
    icon: <Eye className="h-5 w-5" />,
    description: 'Modo Edição para configurar pads rapidamente e Modo Foco para maximizar a área de toque.',
    articles: [
      {
        title: 'Modo Edição',
        icon: <Pencil className="h-4 w-4" />,
        purpose: 'O Modo Edição transforma o toque simples em um atalho para as configurações de cada pad. Em vez de segurar (pressão longa), basta tocar em qualquer pad para abrir suas opções. Ideal para configurar rapidamente múltiplos pads.',
        steps: [
          { title: 'Ativar', description: 'Abra o menu (≡) e ative "Modo Edição". Os pads ficarão com indicador visual diferenciado mostrando que estão em modo de configuração.' },
          { title: 'Editar pads', description: 'Com o modo ativo, toque em qualquer pad para abrir suas opções (volume, pan, cor, efeitos, importação). Não é necessário segurar o pad.' },
          { title: 'Desativar', description: 'Volte ao menu (≡) e desative "Modo Edição" para voltar ao comportamento normal de toque (reprodução de som).' },
        ],
      },
      {
        title: 'Modo Foco',
        icon: <Eye className="h-4 w-4" />,
        purpose: 'O Modo Foco remove o cabeçalho da tela para maximizar a área dos pads. Perfeito para apresentações ao vivo onde você precisa do maior espaço possível para tocar.',
        steps: [
          { title: 'Ativar', description: 'No menu (≡), ative "Modo Foco". O cabeçalho (com nome da música, navegação e menu) será ocultado, dando mais espaço vertical para os pads.' },
          { title: 'Acessos rápidos', description: 'Mesmo no modo foco, o metrônomo e os Continuous Pads continuam acessíveis via footer. Você não perde funcionalidade.' },
          { title: 'Sair do modo foco', description: 'Toque na área do cabeçalho (agora reduzida) ou deslize para baixo para restaurar a visualização completa.' },
        ],
      },
    ],
  },
  {
    id: 'store',
    label: 'Glory Store',
    icon: <Store className="h-5 w-5" />,
    description: 'Loja de packs de sons profissionais. Adquira, baixe e importe diretamente para seus pads.',
    articles: [
      {
        title: 'Navegando e Comprando',
        icon: <Store className="h-4 w-4" />,
        purpose: 'A Glory Store é onde você encontra packs de sons profissionais para expandir sua biblioteca. Os packs incluem kicks, snares, hi-hats, loops, continuous pads, efeitos e mais — todos projetados para worship e louvor.',
        steps: [
          { title: 'Acesso à loja', description: 'Toque em "Loja" no rodapé do app ou acesse pelo menu (≡) > "Glory Store". A loja abre com catálogos organizados por categoria.' },
          { title: 'Filtros e categorias', description: 'Use o botão "Categorias" para filtrar por tipo de som: Bateria, Loops (4/4, 3/4, 6/8), Continuous Pads, Efeitos e outros.' },
          { title: 'Ouvir preview', description: 'Cada pack possui previews de áudio. Toque no botão de play em cada som para ouvir antes de comprar.' },
          { title: 'Comprar pack', description: 'Toque em "Comprar" no card do pack. O pagamento é processado de forma segura. É necessário estar logado.' },
        ],
      },
      {
        title: 'Importando para os Pads',
        icon: <Headphones className="h-4 w-4" />,
        purpose: 'Após adquirir um pack, os sons ficam disponíveis para importar em qualquer pad. O som é baixado e salvo localmente, funcionando offline.',
        steps: [
          { title: 'Importar som', description: 'Segure qualquer pad > "Importar da Glory Store". Filtre por pack adquirido e selecione o som desejado.' },
          { title: 'Download automático', description: 'O som é baixado e armazenado localmente no dispositivo. Após o primeiro download, funciona offline.' },
          { title: 'Biblioteca pessoal', description: 'Seus packs adquiridos aparecem na seção "Minha Biblioteca" na loja. Packs removidos podem ser restaurados a qualquer momento.' },
        ],
      },
    ],
  },
];

/* ─── Screenshot component ─── */
const ScreenshotPreview = ({ src, alt }: { src: string; alt: string }) => (
  <div className="my-4 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-900">
    <img src={src} alt={alt} className="w-full max-w-[280px] mx-auto object-contain" loading="lazy" />
  </div>
);

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
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft className="h-4 w-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-violet-500" />
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
            <p className="text-sm text-gray-300 mb-6">Encontre tutoriais detalhados, guias com capturas de tela reais e respostas para usar o Glory Pads ao máximo.</p>

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

            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
                {selectedCat.icon}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedCat.label}</h2>
                <p className="text-xs text-gray-500">{selectedCat.description}</p>
              </div>
            </div>

            {/* Screenshot if available */}
            {selectedCat.screenshot && (
              <ScreenshotPreview src={selectedCat.screenshot} alt={selectedCat.label} />
            )}

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
                          <p className="text-[11px] text-gray-400">{article.steps.length} passo{article.steps.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        {/* Purpose box */}
                        <div className="mt-3 mb-4 p-3 rounded-lg bg-violet-50 border border-violet-100">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wide mb-0.5">Para que serve</p>
                              <p className="text-xs text-violet-800 leading-relaxed">{article.purpose}</p>
                            </div>
                          </div>
                        </div>

                        {/* Steps */}
                        <div className="relative pl-6 space-y-4">
                          <div className="absolute left-[9px] top-0 bottom-0 w-px bg-violet-200" />
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
                    <div className="flex items-center gap-1.5">
                      {cat.screenshot && <Image className="h-3 w-3 text-gray-300" />}
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-violet-400 transition-colors" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{cat.label}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{cat.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-violet-500 font-semibold">
                      {cat.articles.length} tutorial{cat.articles.length !== 1 ? 's' : ''}
                    </span>
                    {cat.screenshot && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                        <Image className="h-2.5 w-2.5" /> com imagem
                      </span>
                    )}
                  </div>
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
                    Dentro do app, toque no ícone <HelpCircle className="inline h-3 w-3" /> no cabeçalho para iniciar um tutorial interativo que destaca cada funcionalidade diretamente na tela, com guia passo a passo.
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
