
# Indicador Visual de Scroll entre Faders e Metronomo

## Problema
O usuario nao percebe que existe uma rolagem vertical (scroll snap) entre o Mixer (faders) e o Metronomo no footer mobile.

## Solucao
Adicionar um indicador visual de paginacao (dots) + seta animada entre as duas secoes, similar aos dots de paginacao ja usados no MixerStrip para os faders.

### O que sera adicionado

1. **Dots de paginacao** no rodape do container de scroll snap -- dois pontos (um para Mixer, um para Metronomo) que indicam qual secao esta visivel
2. **Seta animada para baixo** (chevron pulsante) visivel quando o usuario esta na pagina do Mixer, indicando que ha mais conteudo abaixo. A seta desaparece ao rolar para o Metronomo.

### Implementacao

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Index.tsx` | Adicionar um listener de `onScroll` no container snap para detectar qual pagina esta visivel; renderizar dots + chevron animado sobre o container |

### Detalhes tecnicos

- Usar `onScroll` no container `snap-y` para calcular `scrollTop / scrollHeight` e determinar a pagina ativa (0 = mixer, 1 = metronomo)
- Renderizar dois dots no centro inferior do container, com o dot ativo destacado (cor `primary`)
- Quando na pagina 0 (mixer), mostrar um icone `ChevronDown` com animacao `animate-bounce` abaixo dos dots para chamar atencao
- Os dots e a seta ficam com `position: absolute` dentro do container, com `pointer-events-none` para nao interferir no toque
- A seta desaparece apos o primeiro scroll ou quando a pagina ativa for 1
