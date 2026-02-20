

## Video de Fundo em Todas as Secoes da Landing Page

### Resumo

Expandir o suporte a video de fundo (atualmente so no Hero) para todas as secoes da landing page, com controles independentes de URL, opacidade e enquadramento (object-fit) para cada secao. Os videos terao tamanho contido dentro da secao (nao full-screen), respeitando a altura natural do conteudo.

### Secoes que receberao suporte a video

| Secao | Config prefix | Fundo |
|-------|--------------|-------|
| Hero | `hero_video_*` | Ja existe |
| Stats | `stats_video_*` | Escuro |
| Features (Recursos) | `features_video_*` | Claro |
| App Screenshots | `screenshots_video_*` | Claro |
| Sound Store | `store_video_*` | Escuro |
| How It Works | `howitworks_video_*` | Claro |
| Pricing | `pricing_video_*` | Escuro |
| CTA Final | `cta_video_*` | Claro |
| Footer | `footer_video_*` | Escuro |

### Chaves de configuracao por secao (3 keys cada)

Para cada secao `PREFIX`:
- `{PREFIX}_url` -- URL do video (MP4/WebM)
- `{PREFIX}_opacity` -- Opacidade (0 a 1, padrao 0.15)
- `{PREFIX}_fit` -- Enquadramento: cover, contain, fill

### Passo 1 -- Landing.tsx: Componente reutilizavel de video

Criar um componente interno `SectionVideo` que recebe `url`, `opacity` e `fit`, renderizando o `<video>` com posicionamento absoluto dentro da secao. Cada secao que ja tem `position: relative` e `overflow: hidden` recebera esse componente condicionalmente.

Para secoes que nao tem `overflow: hidden`, adicionar a classe para que o video nao extrapole os limites da secao (enquadramento contido).

### Passo 2 -- Landing.tsx: Aplicar em cada secao

Adicionar `<SectionVideo>` em cada componente de secao (Stats, Features, AppScreenshots, SoundSection, HowItWorks, Pricing, FinalCTA, Footer), lendo as config keys correspondentes.

Cada secao tera `position: relative` e `overflow: hidden` para garantir que o video fique contido na area visivel da secao, sem ocupar a tela inteira.

### Passo 3 -- AdminLandingEditor.tsx: Bloco reutilizavel de edicao de video

Criar uma funcao `renderVideoBlock(prefix, label)` que renderiza o grupo de campos:
- Upload/URL do video
- Preview inline
- Botao remover
- Slider de opacidade
- Select de enquadramento (Cover / Contain / Fill)

### Passo 4 -- AdminLandingEditor.tsx: Adicionar blocos de video nas abas

- **Aba Hero**: ja existe (manter como esta)
- **Aba Estilos** (AdminLandingStyleEditor): Adicionar blocos de video para Stats, Features, Screenshots, Store, HowItWorks, Pricing, CTA, Footer -- cada um dentro da secao de estilo correspondente

Como o `AdminLandingStyleEditor` e um componente separado, os blocos de video serao adicionados no `AdminLandingEditor` nas abas relevantes:
- Aba **Loja**: bloco de video para SoundSection
- Aba **Imagens**: bloco de video para Screenshots
- Aba **Conteudo**: blocos de video para HowItWorks, Stats, Footer
- Aba **Textos**: blocos de video para Features, Pricing, CTA

### Passo 5 -- Atualizar TAB_KEYS

Adicionar as novas keys de video ao mapa `TAB_KEYS` para que o botao "Salvar tudo" inclua as configuracoes de video.

### Recomendacoes de tamanho por secao

| Secao | Resolucao sugerida | Formato | Duracao |
|-------|--------------------|---------|---------|
| Hero | 1920x1080 (16:9) | MP4/WebM | 5-15s |
| Stats | 1920x400 (widescreen) | MP4/WebM | 5-10s |
| Features | 1920x800 | MP4/WebM | 5-15s |
| Screenshots | 1920x800 | MP4/WebM | 5-15s |
| Store | 1920x600 | MP4/WebM | 5-10s |
| HowItWorks | 1920x600 | MP4/WebM | 5-10s |
| Pricing | 1920x800 | MP4/WebM | 5-10s |
| CTA | 1920x500 | MP4/WebM | 5-10s |
| Footer | 1920x300 | MP4/WebM | 5-10s |

Todos sem audio, em loop, maximo 15MB cada.

### Detalhes Tecnicos

**Arquivos modificados:**
- `src/pages/Landing.tsx` -- componente `SectionVideo` reutilizavel + integracao em todas as secoes
- `src/components/AdminLandingEditor.tsx` -- funcao `renderVideoBlock` + blocos de video nas abas relevantes

**Nenhuma migracao SQL necessaria** -- as keys sao criadas automaticamente pelo upsert existente no admin.

