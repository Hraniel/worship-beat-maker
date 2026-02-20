

# Reduzir Altura dos Elementos Inferiores no Mobile

## Objetivo
Diminuir a altura ocupada pelos Continuous Pads, Faders e Metrônomo minimizado para que não invadam a última fileira dos pads principais. Sem scroll — apenas compactação.

## Mudanças

### 1. Continuous Pads mais compactos (AmbientPads.tsx)
- Reduzir altura dos botões de nota de `h-8` para `h-6` no mobile
- Reduzir o gap do grid de `gap-[3px]` para `gap-[2px]`

### 2. Container dos Continuous Pads com menos padding (LandscapeSwipePanels.tsx)
- No mobile portrait, reduzir padding de `px-2 py-1` para `px-2 py-0.5`
- Reduzir border para não adicionar espaço extra

### 3. Footer mais compacto (Index.tsx)
- Reduzir `max-h-[28vh]` para `max-h-[22vh]` no footer mobile
- Mini-barra BPM: reduzir padding de `py-1` para `py-0.5` e ícones de `h-4 w-4` para `h-3.5 w-3.5`
- Faders container: reduzir padding de `pt-1` para `pt-0.5`
- Abas Mix/Met: reduzir altura dos botões de aba

## Detalhes Técnicos

### `src/components/AmbientPads.tsx`
- Linha dos botões: trocar `h-8 md:h-10` por `h-6 md:h-10`
- Grid: trocar `gap-[3px] md:gap-1` por `gap-[2px] md:gap-1`

### `src/components/LandscapeSwipePanels.tsx`
- Linha 68: trocar `px-2 py-1` por `px-1.5 py-0.5`

### `src/pages/Index.tsx`
- Footer: trocar `max-h-[28vh]` por `max-h-[22vh]`
- Mini-barra BPM (linha ~1533): trocar `py-1` por `py-0.5`, ícones Play/Pause de `h-4 w-4` para `h-3.5 w-3.5`
- Faders container (linha ~1503): trocar `pt-1` por `pt-0.5`

Resultado: aproximadamente 30-40px a menos de ocupação vertical na parte inferior, liberando espaço para os pads principais.
