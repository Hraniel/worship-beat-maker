

# Remoção Solo/Mute + Layout Landscape Completo

## 1. Remover botões Solo e Mute dos faders

Eliminar o componente `SoloMuteButtons` do `MixerStrip.tsx` e remover as props `isMuted`, `isSoloed`, `onToggleMute`, `onToggleSolo` da interface `FaderChannel` e do componente `Fader`.

## 2. Layout landscape para mobile/tablet

Quando o dispositivo estiver na horizontal, o layout muda completamente:

```text
+--------------------------------------------------+
|              HEADER (barra superior)              |
+---------------------------+----------------------+
|                           |  Continuous Pads     |
|                           +----------------------+
|       PAD GRID            |  Mixer Faders        |
|    (ocupa toda a          +----------------------+
|     metade esquerda)      |  Metrônomo           |
|                           |  (compacto)          |
+---------------------------+----------------------+
```

- **Esquerda**: Grade de pads 3x3 ocupando toda a altura disponivel
- **Direita**: Painel lateral com Continuous Pads, Faders do Mixer e Metronomo empilhados verticalmente
- Header continua no topo
- Tudo ocupa 100% da tela sem scroll

## Detalhes Tecnicos

### Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/MixerStrip.tsx` | Remover `SoloMuteButtons`, props de solo/mute da interface e do `Fader` |
| `src/components/LandscapeSwipePanels.tsx` | Reformular para aceitar tambem faders e metronomo; em landscape, usar layout side-by-side (pads a esquerda, painel direito com ambient+faders+metronomo) |
| `src/pages/Index.tsx` | Passar faders e metronomo como props para `LandscapeSwipePanels`; remover props solo/mute dos channels |
| `src/hooks/use-mobile.tsx` | Adicionar hook `useIsLandscape()` reutilizavel |
| `src/index.css` | Ajustar media queries de landscape para o novo layout |

### Hook useIsLandscape

Criar um hook compartilhado que detecta orientacao horizontal em mobile/tablet (largura > altura e altura <= 600px para incluir tablets).

### LandscapeSwipePanels refatorado

- Recebera novas props: `mixer` e `metronome` (ReactNode)
- Em portrait: layout atual (pads em cima, ambient embaixo, footer com mixer/metronomo separado)
- Em landscape: layout horizontal com pads a esquerda e painel direito com ambient + mixer + metronomo em coluna com scroll interno

### MixerStrip simplificado

- Remover `SoloMuteButtons` completamente
- Remover `isMuted`, `isSoloed`, `onToggleMute`, `onToggleSolo` da interface
- Remover logica de opacidade baseada em `isMuted` no Fader
- Os faders ficam mais compactos sem os botoes S/M

