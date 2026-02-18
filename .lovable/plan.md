

# Fix: Spotify AI nao traz BPM e Tom corretos

## Causa Raiz

A Spotify deprecou as APIs `audio-features` e `audio-analysis` em novembro de 2024. O edge function `spotify-search` ainda chama esses endpoints, mas eles retornam erro (403 ou 404). Como resultado:
- `features` chega como `null` no `suggest-pad-config`
- `analysis` chega como `null`
- A IA recebe a mensagem "dados nao disponiveis" e tenta estimar, mas nem sempre acerta

## Plano de Correcao

### 1. Remover chamadas deprecadas do `spotify-search` (edge function)

- Remover as chamadas para `/v1/audio-features/{trackId}` e `/v1/audio-analysis/{trackId}` pois nao funcionam mais
- Manter apenas a chamada `/v1/tracks/{trackId}` que ainda funciona e retorna dados basicos (nome, artista, album, duracao)
- Retornar `features: null` e `analysis: null` explicitamente para que o frontend saiba que nao ha dados

### 2. Melhorar o prompt da IA no `suggest-pad-config` (edge function)

- Reforcar no prompt que a IA DEVE usar seu conhecimento musical interno para determinar BPM e tom
- Remover a logica condicional que monta o prompt com dados do Spotify (ja que nunca terao dados)
- Simplificar o `userPrompt` para focar no nome da musica e artista, pedindo explicitamente: "Voce PRECISA saber o BPM e tom desta musica. Use seu conhecimento musical."
- Manter a estrutura de resposta JSON igual

### 3. Cleanup no frontend `SpotifySearch.tsx`

- Remover o passo "Obtendo dados de audio..." ja que nao ha mais dados para obter
- Chamar diretamente o `suggest-pad-config` com apenas `trackName` e `artist`
- Remover a chamada intermediaria ao `spotify-search` com `trackId` (que buscava features/analysis)
- Simplificar o fluxo: buscar musica -> selecionar -> IA analisa pelo nome

### Resumo de arquivos alterados

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/spotify-search/index.ts` | Remover bloco de audio-features e audio-analysis; manter apenas search e track basico |
| `supabase/functions/suggest-pad-config/index.ts` | Simplificar prompt removendo logica de features/analysis; reforcar que IA deve usar conhecimento proprio |
| `src/components/SpotifySearch.tsx` | Remover chamada intermediaria de features; passar direto para suggest-pad-config com nome e artista |

