
## Reorganizar layout Desktop/Tablet: Faders → Metrônomo → Continuous Pads

### O que precisa mudar

A solicitação é para **desktop e tablet apenas** (não altera mobile):

1. **Inverter posição**: Continuous Pads sobem acima dos Faders → agora Faders ficam primeiro, Continuous Pads ficam por último
2. **Metrônomo completo abaixo dos Faders**: Em vez do bloco minimizável atual, exibir o `<Metronome>` completo direto (sem header de collapse, já expandido)
3. **Remover mini-bar do metrônomo**: A barra compacta `BPM · 4/4 · ▶` que aparece na aba Mix do landscape e no tablet será removida

A sequência final para desktop e tablet será:
```text
[Faders (MixerStrip)]
        ↓
[Metrônomo completo]
        ↓
[Continuous Pads (AmbientPads)]
```

---

### Onde estão os 3 contextos de layout

#### 1. Desktop (`lg:block` — `hidden lg:block`)
**Arquivo**: `src/pages/Index.tsx`, linhas ~1159–1258

Sequência atual:
- Faders (`MixerStrip`)
- Metronome (collapsible com header)
- Continuous Pads

Mudança:
- Faders (`MixerStrip`) — sem alteração
- Metrônomo completo sem header de collapse (só `<Metronome>` + `<PanControl>` dentro de um card)
- Continuous Pads (`<AmbientPads>`)
- **Remover** o header colapsável atual do metronome

#### 2. Tablet (`md:block lg:hidden` — linhas ~1261–1320)
**Arquivo**: `src/pages/Index.tsx`, linhas ~1260–1320

Sequência atual:
- Faders
- Metronome (full, sem header de collapse neste contexto)
- Continuous Pads

A sequência já está correta neste contexto! Mas ainda há uma **mini-barra de metrônomo** abaixo dos faders na aba Mix do landscape (dentro de `LandscapeSwipePanels`). Essa barra precisa ser removida.

#### 3. Landscape sidebar (Mix tab dentro de `LandscapeSwipePanels`)
**Arquivo**: `src/components/LandscapeSwipePanels.tsx`, linhas ~127–152

Sequência atual na aba Mix:
- Ambient Pads (topo)
- Faders
- Mini-bar BPM/metrônomo (bottom)

Mudança:
- Faders (topo)
- Metrônomo completo abaixo
- Continuous Pads (bottom)
- **Remover** a mini-bar inferior

O `mixer` prop recebido já contém faders + continuous pads dentro dele (definido em `Index.tsx` nas linhas ~1046–1087). A abordagem mais limpa é remover os continuous pads do prop `mixer` em `Index.tsx` e passá-los via `ambientPads`, e ajustar `LandscapeSwipePanels` para renderizar: faders → metronome → ambient pads.

---

### Mudanças técnicas

#### `src/components/LandscapeSwipePanels.tsx`

Na aba **Mix** (não-focus), alterar a ordem:
- **Remover** `<div>` de ambient pads do topo da aba Mix
- **Remover** mini-bar BPM/metrônomo do bottom
- **Adicionar** o conteúdo do `metronome` prop abaixo dos faders
- **Adicionar** ambient pads abaixo do metronome

A prop `metronome` já existe e é passada de `Index.tsx` — basta usá-la aqui na aba Mix.

#### `src/pages/Index.tsx` — Bloco Desktop (`hidden lg:block`)

1. Remover o bloco de metronome com header colapsável (linhas ~1213–1245)
2. Adicionar card de metrônomo sem collapse logo após os faders:
```tsx
<div className="bg-card rounded-lg border border-border overflow-hidden" data-tutorial="metronome">
  {spotifyTrackName && (
    <div className="px-3 py-1 border-b border-border/50">
      <span className="text-xs font-medium text-primary">♪ {spotifyTrackName}</span>
    </div>
  )}
  <Metronome bpm={bpm} ... />
  <PanControl ... />
</div>
```
3. AmbientPads permanece abaixo do metronome (sem mudança de posição)

#### `src/pages/Index.tsx` — Bloco Tablet (`md:block lg:hidden`, linhas ~1260–1320)

A sequência atual (Faders → Metronome → AmbientPads) já está correta. Apenas:
- Verificar se o metronome no tablet tem header de collapse → se tiver, simplificar para exibição direta
- Confirmar que não há mini-bar de BPM extra aqui

#### `src/pages/Index.tsx` — prop `mixer` para `LandscapeSwipePanels` (linhas ~1046–1087)

Atualmente, o `mixer` prop contém faders **e** continuous pads embaixo. Para a nova ordem funcionar no landscape, os continuous pads serão removidos do `mixer` prop (já que serão renderizados no `LandscapeSwipePanels` após o metronome).

---

### Resumo de arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/pages/Index.tsx` | Desktop: remove header colapsável do met, add met full abaixo dos faders. Remove AmbientPads do interior do `mixer` prop. |
| `src/components/LandscapeSwipePanels.tsx` | Aba Mix: remove ambient pads do topo e mini-bar do bottom; adiciona metronome completo + ambient pads abaixo dos faders. |

Nenhuma mudança no layout mobile (abas Mix/Met do footer continuam iguais).
