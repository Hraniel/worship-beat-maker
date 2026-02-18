
# Redesign: Busca no songbpm.com como busca principal + Spotify apenas para preview

## Visão Geral da Mudança

O fluxo atual usa o Spotify como busca principal. O novo fluxo inverte isso:

- **Busca principal** → songbpm.com (BPM e Tom reais)
- **Spotify** → campo separado, opcional, apenas para reproduzir o preview de 30s da música

---

## Por que o songbpm.com não tem busca direta acessível

A URL `https://songbpm.com/searches?q=...` retorna "Not Found" para qualquer busca — é uma rota interna que não funciona externamente. Porém, a Firecrawl tem um **endpoint de busca na web** (`POST /v1/search`) que pode fazer uma busca `site:songbpm.com {artista} {música}` e retornar os links das páginas encontradas. Em seguida, a página do resultado (ex: `/@bethel-music/goodness-of-god`) é raspada para extrair BPM e Tom.

---

## Novo Fluxo

```text
[Campo 1 - Busca principal]
  Usuário digita: "Goodness of God Bethel Music"
         ↓
  Firecrawl Search: site:songbpm.com "goodness of god bethel music"
         ↓
  Retorna URLs: ["https://songbpm.com/@bethel-music/goodness-of-god", ...]
         ↓
  Raspa a primeira URL → BPM: 128, Tom: G#
         ↓
  Exibe resultado com capa, BPM, Tom, link do Spotify (se houver na página)
         ↓
  Usuário clica em "Analisar com IA" → GPT-5 gera config dos pads

[Campo 2 - Preview Spotify (opcional, aparece após selecionar música)]
  Usuário digita nome no campo de preview do Spotify
         ↓
  Busca no Spotify → exibe lista
         ↓
  Usuário clica Play → toca 30s de preview
```

---

## Mudanças Técnicas

### 1. Nova edge function: `supabase/functions/songbpm-search/index.ts`

Responsável por buscar músicas no songbpm.com usando Firecrawl Search + scrape:

- Recebe `{ query: string }` (ex: `"goodness of god bethel music"`)
- Chama `POST https://api.firecrawl.dev/v1/search` com query `site:songbpm.com {query}` e `limit: 5`
- Filtra os resultados para apenas URLs no padrão `songbpm.com/@artist/track`
- Para as primeiras 3 URLs encontradas, faz scrape paralelo com Firecrawl
- De cada página, extrai: nome da música, artista, BPM, Tom, duração, modo (major/minor), link do Spotify (que aparece na página)
- Retorna array de resultados com esses dados

### 2. Atualizar `supabase/functions/suggest-pad-config/index.ts`

- Remover a função `fetchSongBpm()` de dentro dessa edge function
- O BPM e Tom agora chegam **já prontos** do frontend (pré-buscados no songbpm.com)
- A função recebe: `{ trackName, artist, bpm?, key? }` e usa esses valores confirmados no prompt da IA

### 3. Refatorar `src/components/SpotifySearch.tsx` → renomear para `src/components/MusicAISearch.tsx`

O componente é completamente redesenhado com dois campos:

**Seção 1 — Busca no songbpm.com (campo principal):**
- Input de texto livre: "Buscar música no songbpm..."
- Botão de busca → chama a nova edge function `songbpm-search`
- Exibe lista de resultados: nome, artista, BPM, Tom
- Ao clicar em um resultado → seleciona e ativa a análise da IA

**Seção 2 — Preview Spotify (seção colapsável/secundária, após selecionar música):**
- Título: "Ouvir preview no Spotify (opcional)"
- Input de texto: busca no Spotify
- Exibe lista de faixas com botão Play (preview 30s)
- Player compacto com barra de progresso
- Essa seção só aparece após uma música do songbpm.com ser selecionada

**Estado da análise (seção 3):**
- Quando o usuário clica em "Analisar com IA" (após selecionar música do songbpm.com)
- Mostra spinner de análise → resultado com BPM, Tom, padrão, efeitos dos pads
- Botão "Aplicar configuração"

### 4. Atualizar referências ao componente

- Em `src/pages/Index.tsx` (ou onde quer que `SpotifySearch` seja importado), atualizar o import para `MusicAISearch`

---

## Estrutura dos Dados

### Tipo `SongBpmResult` (novo):
```typescript
interface SongBpmResult {
  name: string;       // "Goodness of God"
  artist: string;     // "Bethel Music"
  bpm: number;        // 128
  key: string;        // "G#"
  mode: string;       // "major" | "minor"
  duration?: string;  // "4:30"
  spotifyUrl?: string; // URL do Spotify encontrada na página do songbpm
  songbpmUrl: string; // URL original no songbpm.com
}
```

---

## Extração de Dados da Página songbpm.com

A página do songbpm.com já contém o link do Spotify no formato:
```
[Listen on Spotify](https://open.spotify.com/track/2C5WGOg1zIxkUnKP3mY6go)
```

Isso permite extrair o `trackId` do Spotify diretamente da página do songbpm.com, sem precisar que o usuário busque manualmente no Spotify — a busca do Spotify no campo de preview pode já ser pré-preenchida com o nome da música selecionada.

---

## Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `supabase/functions/songbpm-search/index.ts` | Criar (nova edge function) |
| `supabase/functions/suggest-pad-config/index.ts` | Simplificar (remover fetchSongBpm, receber bpm/key prontos) |
| `src/components/SpotifySearch.tsx` | Refatorar completamente (renomear para MusicAISearch) |
| `src/components/MusicAISearch.tsx` | Criar (componente redesenhado) |
| `src/pages/Index.tsx` (ou onde SpotifySearch é usado) | Atualizar import |
