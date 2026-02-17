
# Ajustes no Slider, Metronomo e Botao Stop

## 1. Thumb maior no mobile (slider.tsx)
Aumentar o thumb de `h-4 w-4` para `h-6 w-6` em telas touch/mobile usando a classe `@media (pointer: coarse)` ou classes responsivas do Tailwind (`md:h-4 md:w-4`).

## 2. Volume do metronomo sem travar BPM (Metronome.tsx)
O problema atual: quando o volume do metronomo muda via MixerStrip, o `setMetronomeVol` no Index.tsx causa re-render, que pode re-criar callbacks do Metronome. A funcao `setMetronomeVolume` no loop-engine ja e segura (so muda uma variavel, sem reiniciar o engine). Nenhuma alteracao necessaria no loop-engine. Porem, no Index.tsx, o callback `onChange` do canal metronomo esta inline e recria a cada render. Vou envolver em `useCallback` para evitar re-renders desnecessarios no Metronome.

## 3. Botao Stop vermelho (Metronome.tsx)
Atualmente o botao Play e Stop usam a mesma classe (`bg-foreground text-background`). Vou diferenciar: quando `isPlaying` for true, o botao Stop usara `bg-destructive text-destructive-foreground` (vermelho).

## Arquivos alterados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/ui/slider.tsx` | Thumb com tamanho maior em mobile (`h-6 w-6` default, `md:h-4 md:w-4` em desktop) |
| `src/components/Metronome.tsx` | Botao Stop com classe `bg-destructive` quando `isPlaying` |
| `src/pages/Index.tsx` | Estabilizar callback do volume do metronomo com `useCallback` |
