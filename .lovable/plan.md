
# Efeito Visual no Metronomo/Continuous + Animacao de Scroll na Paginacao

## Resumo

1. Adicionar emissao de `emitPadHit('ambient')` quando uma nota do Continuous Pad e tocada, para que o fader do Continuous reaja visualmente ao som.
2. O fader do Metronomo ja possui o efeito visual (o loop-engine ja chama `emitPadHit('metronome')` a cada beat) -- verificar se esta funcionando corretamente.
3. Substituir a paginacao de corte abrupto dos faders por uma animacao de transicao (slide/scroll suave) ao mudar de pagina.

## Detalhes Tecnicos

### 1. Ambient/Continuous Pad -- Emitir flash no fader

**Arquivo: `src/components/AmbientPads.tsx`**
- Importar `emitPadHit` de `MixerStrip`
- Na funcao `toggleAmbientNote` (ao ativar uma nota), chamar `emitPadHit('ambient')`
- Isso fara com que o fader do Continuous Pad pisque em branco quando uma nota e ativada

### 2. Animacao de scroll na paginacao dos faders

**Arquivo: `src/components/MixerStrip.tsx`**
- Envolver a area dos pads paginados em um container com `overflow-hidden`
- Ao mudar de pagina, aplicar uma animacao CSS de transicao (translateX) nos faders que entram e saem
- Usar uma `key` baseada na pagina com `framer-motion` (ja instalado no projeto) para animar a entrada/saida dos faders com `AnimatePresence` e `motion.div`
- A animacao sera um slide horizontal: ao ir para a proxima pagina, os faders deslizam para a esquerda; ao voltar, deslizam para a direita
- Duracao da animacao: ~250ms com easing suave

### Estrutura da animacao (MixerStrip)

```text
[MET] [CNT] | <-- slide animation --> [Pad1] [Pad2] [Pad3] [Pad4] | [MST]
                                       ← pagina anterior | proxima pagina →
```

Usar `AnimatePresence` do framer-motion com `mode="wait"` e direcao baseada na mudanca de pagina (anterior vs proxima) para controlar se o slide entra pela esquerda ou direita.
