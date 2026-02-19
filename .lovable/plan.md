

## Redesign dos Drum Pads

### O que muda

O design atual usa uma borda completa ao redor do pad. O novo design, baseado na imagem de referencia, tem:

1. **Barra colorida no topo** -- uma faixa fina e vibrante no topo de cada pad (em vez de borda completa)
2. **Texto do shortName colorido** -- a sigla do pad (KCK, SNR, etc.) usa a mesma cor da barra
3. **Nome completo abaixo** -- subtitulo em cor suave (muted) abaixo da sigla
4. **Corpo escuro** -- fundo preto/escuro sem a textura de borracha atual
5. **Borda sutil cinza** -- borda fina e discreta ao redor do pad (nao colorida)
6. **Cores customizadas se aplicam** -- quando o usuario muda a cor pelo PadColorPicker, a barra do topo e o texto da sigla mudam para a cor escolhida

### Estados visuais mantidos

- **Hit (active)**: flash de brilho + glow na cor do pad
- **Loop ativo**: barra do topo pulsa + glow sutil
- **Locked**: overlay com cadeado (sem mudanca)
- **Edit mode**: icone de engrenagem (sem mudanca)

### Arquivos alterados

#### `src/components/DrumPad.tsx`
- Remover `border-2` e a classe `drum-pad-idle` do botao principal
- Adicionar um `div` absoluto no topo do pad como barra colorida (h-[3px] rounded-t)
- Mudar a cor do `shortName` para usar `colorSolid` (cor do pad)
- Adicionar o nome completo (`pad.name`) como subtitulo abaixo do shortName
- Ajustar o background para gradiente escuro fixo (sem textura de pontos)
- Border passa a ser `border border-white/10` (sutil, neutra)
- Estados active/looping continuam alterando a barra do topo e o glow

#### `src/index.css`
- Atualizar `.drum-pad-idle` para usar apenas gradiente escuro sem dot pattern
- Ajustar `loop-border` para animar a barra do topo em vez da borda completa

### Detalhes tecnicos

```text
Pad Layout (novo):
+--[barra colorida 3px]--------+
|                               |
|     KCK  (cor do pad)         |
|     Kick (muted)              |
|                               |
+-------------------------------+
  borda: 1px white/10
  fundo: gradiente hsl(0 0% 8%) -> hsl(0 0% 4%)
```

Logica de cor:
- Se `customColor` existe: barra e texto usam `hsl(customColor)`
- Se nao: usa `hsl(var(pad.colorVar))` (cor padrao da categoria)
- Todos os estados (idle, active, looping) respeitam a cor customizada
- O `PadColorPicker` continua funcionando sem mudancas -- apenas o visual do pad muda

