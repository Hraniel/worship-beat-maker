
# Fix: Busca no songbpm.com usando URL direta com slugs do Spotify

## Causa Raiz

A função `fetchSongBpm` no edge function `suggest-pad-config` usa a URL de pesquisa `https://songbpm.com/searches?q=...`. Após investigação, essa URL de busca do songbpm.com retorna "Not Found" para qualquer query — ela não funciona como endpoint de pesquisa acessível externamente.

O site songbpm.com usa URLs diretas no formato:
```
https://songbpm.com/@{artist-slug}/{track-slug}
```

Exemplo verificado:
- Artista: `Bethel Music` → slug: `bethel-music`
- Música: `Goodness of God` → slug: `goodness-of-god`
- URL final: `https://songbpm.com/@bethel-music/goodness-of-god`
- Resultado: BPM 128, Key G#/Ab — correto!

O nome e artista **já chegam corretamente do Spotify** via `track.name` e `track.artist` no frontend.

## Plano de Correção

### Único arquivo alterado: `supabase/functions/suggest-pad-config/index.ts`

#### 1. Nova função `toSlug()`

Criar uma função utilitária para converter texto em slug compatível com o songbpm.com:

- Converter para minúsculas
- Remover acentos e caracteres especiais
- Substituir espaços por hifens
- Remover caracteres que não sejam letras, números ou hifens
- Remover hifens duplicados ou nas extremidades

Exemplos:
```
"Bethel Music"       → "bethel-music"
"Goodness of God"    → "goodness-of-god"
"Julliany Souza"     → "julliany-souza"
"Quem É Esse"        → "quem-e-esse"
"Kirk Franklin"      → "kirk-franklin"
```

#### 2. Atualizar `fetchSongBpm()` para usar URL direta

Trocar a URL de busca pela URL direta:

```
ANTES: https://songbpm.com/searches?q={trackName}+{artist}
DEPOIS: https://songbpm.com/@{artistSlug}/{trackSlug}
```

- O artista que vem do Spotify pode ter múltiplos artistas separados por vírgula (ex: `"Bethel Music, Jenn Johnson"`). Nesse caso, usar apenas o **primeiro artista**.
- Fazer scrape da página com Firecrawl (já conectado)
- Parsear BPM e Key do markdown retornado (a estrutura da página já foi verificada e funciona)

#### 3. Fallback inteligente

Se a URL direta não retornar dados (música não encontrada), o comportamento atual já cobre: a IA usa seu conhecimento musical como fallback.

## Fluxo Final

```text
Usuário seleciona música no Spotify
        ↓
Frontend envia track.name + track.artist (dados exatos do Spotify)
        ↓
Edge function converte para slugs:
  "Bethel Music" → "bethel-music"
  "Goodness of God" → "goodness-of-god"
        ↓
Firecrawl acessa: songbpm.com/@bethel-music/goodness-of-god
        ↓
Extrai BPM e Tom reais da página
        ↓
GPT-5 recebe BPM e Tom confirmados + gera config dos pads
```

## Técnico: Parsing da resposta do songbpm.com

A página retorna markdown com os dados assim:
```
128  BPM
Key  G♯/A♭
```

O regex atual para BPM já funciona. Para o Key, precisa lidar com o formato `G♯/A♭` (com símbolo unicode ♯ e ♭), convertendo para o formato da app: `G#`, `Ab`, etc.

Será adicionado tratamento para:
- `♯` → `#`
- `♭` → `b`
- Pegar apenas a primeira tonalidade quando houver barra (ex: `G♯/A♭` → `G#`)
- Identificar se é `major` ou `minor` pela palavra-chave na página
