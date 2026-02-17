

# Plano de Melhorias: Metronomo, Faders, Continuous Pad e Modo Foco

## 1. BPM clicavel para digitacao manual

**Arquivo:** `src/components/Metronome.tsx`
- Ao clicar no numero do BPM exibido, ele se transforma em um `<input type="number">` editavel.
- O usuario digita o valor desejado (40-240) e confirma com Enter ou ao perder foco (blur).
- Se o metronomo estiver tocando, o novo BPM so sera aplicado quando a contagem voltar ao tempo 1 (beat 0). Para isso, armazenar o BPM pendente e aplica-lo no callback do `onMetronomeBeat` quando `beat === 0`.

**Arquivo:** `src/pages/Index.tsx`
- O display do BPM no header do metronomo (linha 893) tambem se tornara clicavel com a mesma logica.

---

## 2. Animacao dos faders limitada ao volume + indicador de clipping

**Arquivo:** `src/components/MixerStrip.tsx`
- **VU Ticks:** O `activeLevel` atualmente usa `Math.max(volume, flash)`. Mudar para: o flash so pode acender ticks ate o nivel do volume (`Math.min(flash, volume)`). Assim, se volume = 30%, o flash so ilumina ate 30%.
- **Indicador de clipping:** Se o som estiver muito alto (flash > volume), mostrar indicadores coloridos:
  - Flash > volume em ate 20%: ponto **amarelo** no topo do fader (aviso).
  - Flash > volume em mais de 20%: ponto **vermelho** (clipping extremo).
- Adicionar um pequeno circulo (4x4px) acima das VU ticks que muda de cor conforme o nivel de clipping.

---

## 3. Atualizar nomes dos faders para refletir nomes reais dos pads

**Arquivo:** `src/pages/Index.tsx` (linha 871)
- Atualmente: `shortLabel: padNames[pad.id] || 'P${i + 1}'`
- Mudar para: `shortLabel: padNames[pad.id] || pad.name` para exibir o nome real do pad (ex: "Kick", "Snare") em vez de "P1", "P2".

---

## 4. Botao Stop do Continuous Pad vira Play/Pause branco

**Arquivo:** `src/components/AmbientPads.tsx`
- Substituir o icone `StopCircle` por logica condicional:
  - Se ha notas ativas: mostrar icone `Pause` (branco) para pausar.
  - Se ha notas pausadas: mostrar icone `Play` (branco) para retomar.
- O botao sera sempre visivel (nao apenas quando `hasActive`), com cor branca (`text-white`).
- Adicionar estado `isPaused` para controlar pausa/retomada das notas ativas.

---

## 5. Fader Master com nome "Master"

**Arquivo:** `src/pages/Index.tsx` (linha 875)
- Mudar `shortLabel: 'MST'` para `shortLabel: 'Master'`.

---

## 6. Botoes Solo (S) e Mute (M) em cada fader

**Arquivo:** `src/components/MixerStrip.tsx`
- Adicionar dois botoes empilhados verticalmente acima ou abaixo do fader: **S** (Solo) e **M** (Mute).
- Tamanho: 12x12px cada, com texto de 7px, empilhados com gap de 1px.
- **Solo (S):** Quando ativado, silencia todos os outros canais exceto o selecionado. Cor ativa: amarelo.
- **Mute (M):** Quando ativado, silencia apenas este canal. Cor ativa: vermelho.

**Interface do FaderChannel:**
- Adicionar props: `isMuted`, `isSoloed`, `onToggleMute`, `onToggleSolo`.

**Arquivo:** `src/pages/Index.tsx`
- Adicionar estados `mutedChannels: Set<string>` e `soloedChannels: Set<string>`.
- Logica: se algum canal esta em Solo, apenas os canais com Solo ativo tocam. Se um canal esta em Mute, ele nao toca.
- Aplicar mute/solo no volume efetivo passado ao `MixerStrip` e ao `audio-engine`.

---

## 7. Modo Foco: pads responsivos sem cortar laterais nem sobrepor continuous pad

**Arquivo:** `src/components/PadGrid.tsx`
- No modo foco, remover o `maxWidth` fixo e usar `width: 100%` com padding lateral seguro (`px-2`).
- Limitar a altura dos pads para nao ultrapassar a area disponivel (entre a barra de status e o continuous pad).
- Usar `aspect-ratio: 1` nos pads e calcular o tamanho maximo baseado em `calc((100dvh - statusBarHeight - continuousPadHeight - footerHeight) / 3)` para as 3 linhas.

**Arquivo:** `src/pages/Index.tsx`
- Passar prop `focusMode` para o `PadGrid` para que ele ajuste seu layout.
- Ajustar o container principal para usar `h-[100dvh]` com safe-area-inset para evitar a barra de notificacao.

---

## Resumo de Arquivos

| Arquivo | Mudancas |
|---------|----------|
| `src/components/Metronome.tsx` | Input editavel de BPM, aplicacao no tempo 1 |
| `src/pages/Index.tsx` | Nomes reais nos faders, Master label, estados Solo/Mute, BPM clicavel no header, focusMode prop |
| `src/components/MixerStrip.tsx` | VU limitado ao volume, clipping amarelo/vermelho, botoes S/M, interface atualizada |
| `src/components/AmbientPads.tsx` | Play/Pause branco substituindo Stop |
| `src/components/PadGrid.tsx` | Responsividade no modo foco |

