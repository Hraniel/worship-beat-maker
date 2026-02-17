

# Ajustes de Layout Mobile: Scroll, Foco e Landscape

## Problemas Identificados

1. **Scroll global indesejado**: O app inteiro esta rolando no mobile em vez de manter layout fixo (apenas o container de faders/metronomo deve rolar).
2. **Modo foco (vertical)**: Pads muito distantes do topo; continuous pads e metronomo distantes dos pads.
3. **Landscape mobile**: Pads podem ficar ocultos; painel lateral nao tem o mesmo esquema de scroll controlado.
4. **Volumes impedidos pelo scroll**: Ao arrastar faders verticais, o scroll do container pode interferir.

## Plano de Implementacao

### 1. Corrigir scroll global e reduzir container do footer (Index.tsx)

- O footer mobile (`<footer>`) com `max-h-[35vh]` pode ser grande demais e empurrar conteudo. Reduzir para `max-h-[28vh]` no modo normal e `max-h-[20vh]` no foco.
- Garantir que o container principal (`flex flex-col h-[100dvh] overflow-hidden`) nao permita scroll global. Verificar se nao ha `overflow-auto` nos containers pai.
- No container de snap-scroll dos faders/metronomo, adicionar `overscroll-behavior: contain` para evitar que o scroll "vaze" para o body.

### 2. Modo foco vertical: aproximar pads do topo (Index.tsx + LandscapeSwipePanels.tsx)

- No `LandscapeSwipePanels`, quando em portrait, trocar `items-center justify-center` do pad grid para `items-start justify-center` -- isso empurra os pads para cima, perto do header.
- Receber prop `focusMode` no componente para ajustar layout.
- No modo foco, remover padding extra do container dos continuous pads para que fiquem colados aos pads.

### 3. Landscape mobile: pads respondem melhor + scroll no painel lateral (LandscapeSwipePanels.tsx)

- No painel direito (landscape), aplicar o mesmo `overscroll-behavior: contain` e `touch-action: pan-y` para que o scroll vertical nao interfira nos faders.
- Garantir que o pad grid use `items-center` sem overflow oculto cortando pads.

### 4. Faders nao impedidos pelo scroll (MixerStrip.tsx + Index.tsx)

- O fader track ja usa `touch-none` e `setPointerCapture`, o que deveria funcionar. O problema e o container pai com `overflow-y-auto snap-y` que captura o gesto vertical.
- Solucao: no container de scroll do footer, adicionar `touch-action: pan-y` e no fader track manter `touch-none`. Quando um fader esta sendo arrastado (pointer captured), o scroll do container pai nao deveria interferir porque o pointer capture ja impede.
- Adicionar `overscroll-behavior: contain` no container scroll para isolar completamente.

### Resumo de arquivos alterados

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Index.tsx` | Reduzir max-height do footer mobile; adicionar `overscroll-behavior: contain` no container de scroll; passar `focusMode` para `LandscapeSwipePanels` |
| `src/components/LandscapeSwipePanels.tsx` | Receber prop `focusMode`; alinhar pads ao topo no modo foco (portrait); aplicar `overscroll-behavior: contain` no painel lateral (landscape) |
| `src/index.css` | Ajustar media queries landscape para footer mais compacto |

