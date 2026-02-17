

# Plano de Melhorias: Mixer, Pads, Metronomo e Responsividade

## 1. Animacao de transicao mais rapida na paginacao dos faders

**Arquivo:** `src/components/MixerStrip.tsx`
- Reduzir a duracao da animacao de slide de `0.25s` para `0.12s` na prop `transition` do `motion.div` (linha 242).

---

## 2. Ultimo pad alinhado a esquerda (nao centralizado)

**Arquivo:** `src/components/MixerStrip.tsx`
- Na `motion.div` que renderiza os `pagedPads`, quando a ultima pagina tem menos de 4 faders, os faders ficam centralizados por causa do `flex-1`. Solucao: remover `flex-1` dos faders paginados e usar largura fixa proporcional (`w-1/4` ou `calc(25% - gap)`) para que os itens fiquem alinhados a esquerda sem esticar.

---

## 3. Novo fader automatico ao adicionar pad

**Arquivo:** `src/pages/Index.tsx`
- Atualmente, o mixer renderiza apenas `defaultPads.slice(0, 9)`. Alterar para renderizar todos os pads visiveis de forma dinamica. Se o usuario tiver acesso a mais pads (via tier), os faders extras devem ser incluidos no array de `channels` do `MixerStrip`.
- Usar `TIERS[tier].maxPads` para determinar quantos pads renderizar no mixer, garantindo que cada pad tenha seu fader.

---

## 4. Opcao de redefinir pad(s) para configuracao padrao

**Arquivo:** `src/pages/Index.tsx` + `src/components/PadGrid.tsx` ou `src/components/DrumPad.tsx`
- Adicionar duas funcoes no `Index.tsx`:
  - `handleResetPad(padId)`: reseta volume para 0.7, pan para 0, efeitos para defaults, remove som customizado, restaura nome original.
  - `handleResetAllPads()`: aplica `handleResetPad` em todos os pads.
- Expor essas opcoes no menu de contexto do pad (long-press ou edit mode), adicionando botoes "Redefinir este pad" e "Redefinir todos".
- Adicionar um botao "Redefinir Todos" no menu principal (hamburger) ou no modo de edicao.

---

## 5. Responsividade 100% para tablet (pads, continuous, faders, knobs)

**Arquivos:** `src/components/PadGrid.tsx`, `src/components/AmbientPads.tsx`, `src/components/MixerStrip.tsx`, `src/pages/Index.tsx`
- **PadGrid:** Ajustar `gridMaxWidth` para usar `min(gridMaxWidth, 100%)` e gaps responsivos com classes Tailwind `md:gap-4`.
- **AmbientPads:** Grid de notas com `gap` e `h` responsivos via `md:h-10 md:text-xs`.
- **MixerStrip:** Faders com `FADER_HEIGHT` responsivo (usar classe CSS ou media query). Em tablets (md), aumentar para ~130px. VU ticks e thumbs proporcionais.
- **PanKnob:** Ajustar tamanho do knob via classes `md:w-8 md:h-8`.
- **Footer/layout:** Ajustar `max-h` do footer para tablets com `md:max-h-[40vh]`.

---

## 6. Eliminar knob do Continuous Pad

**Arquivo:** `src/components/AmbientPads.tsx`
- Remover o bloco JSX que renderiza o `PanKnob` e o botao de Lock (linhas 172-191), mantendo apenas o botao de "Stop" quando ha notas ativas.
- O controle de pan do Continuous Pad ficara exclusivamente nas Configuracoes (aba Audio do SettingsDialog), que ja esta implementado.

---

## 7. Metronomo BPM com debounce no slider

**Arquivos:** `src/components/Metronome.tsx` + `src/lib/loop-engine.ts`
- Adicionar estado local `pendingBpm` no `Metronome.tsx` que atualiza imediatamente o display do BPM.
- Usar `onPointerUp` ou `onValueCommit` do Slider (ou um debounce de ~400ms) para so chamar `onBpmChange` quando o usuario parar de mexer.
- No `loop-engine.ts`, o `setLoopBpm` ja reinicia o engine -- com o debounce, ele so reiniciara quando o usuario soltar o slider.
- Alternativa: detectar `onPointerDown`/`onPointerUp` no slider para saber quando o usuario esta arrastando, e so aplicar o BPM final no `onPointerUp`.

---

## 8. Corrigir tempos 3/4 e 6/8

**Arquivo:** `src/lib/loop-engine.ts`
- **Problema:** O `setLoopTimeSignature` so extrai o numero de cima (`beatsPerBar = parseInt(ts.split('/')[0])`), mas nao considera o denominador. Para 6/8, `beatsPerBar = 6`, e o calculo `subsPerBeat = 16 / 6 = 2.666...` nao e inteiro, causando beats irregulares.
- **Solucao:** Ajustar o numero de subdivisoes por compasso com base no denominador:
  - 4/4: 16 subdivisoes por compasso, 4 beats, `subsPerBeat = 4`
  - 3/4: 16 subdivisoes por compasso mas apenas 3 beats. Usar 12 subdivisoes (3 x 4) para alinhar corretamente. Ou manter 16 e calcular `subsPerBeat = Math.round(16/3)` -- mas isso causa irregularidade.
  - **Melhor abordagem:** Mudar `SUBDIVISIONS_PER_BAR` para ser dinamico:
    - 4/4 -> 16 subdivisoes (4 x 4)
    - 3/4 -> 12 subdivisoes (3 x 4)
    - 6/8 -> 12 subdivisoes (6 x 2, pois colcheias sao a unidade)
  - Criar funcao `getSubdivisionsForTimeSignature(ts)` que retorna o valor correto.
  - Atualizar `tick()` para usar esse valor dinamico em vez da constante `SUBDIVISIONS_PER_BAR`.
  - Atualizar `subsPerBeat` para: 4/4 -> 4, 3/4 -> 4, 6/8 -> 2.

---

## Detalhes Tecnicos - Resumo de Arquivos

| Arquivo | Mudancas |
|---------|----------|
| `src/components/MixerStrip.tsx` | Animacao mais rapida (0.12s), ultimo pad alinhado a esquerda, responsividade tablet |
| `src/pages/Index.tsx` | Faders dinamicos por tier, funcoes resetPad/resetAll, botao reset no menu |
| `src/components/AmbientPads.tsx` | Remover PanKnob, responsividade tablet |
| `src/components/Metronome.tsx` | Debounce no slider de BPM |
| `src/lib/loop-engine.ts` | Subdivisoes dinamicas por time signature (corrige 3/4 e 6/8) |
| `src/components/PadGrid.tsx` | Responsividade tablet |
| `src/components/DrumPad.tsx` | Botao "Redefinir pad" no menu de contexto |

