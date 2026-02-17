
# Ajustes de Interface e Configuracoes

## 1. Header: esconder elementos quando nao ha musica selecionada

Quando o banner "Selecione uma musica" estiver visivel (sem `currentSongId`), os botoes da barra superior (Repertorio, Modo Foco, slider de tamanho) serao ocultados -- somente o menu hamburger permanece visivel.

## 2. Header: trocar posicao do Repertorio com Modo Foco

O botao de Modo Foco vira antes do Repertorio na ordem dos elementos do header.

## 3. Header: esconder nome do app em mobile

O texto "GP" (versao mobile) sera removido. Apenas o icone/logo permanece em telas pequenas.

## 4. Pads: area nao rolavel e responsiva

- Remover `overflow-auto` da area dos pads, usar `overflow-hidden`
- No `PadGrid`, ajustar o grid para usar `aspect-square` nos pads e `max-width` responsivo baseado na altura disponivel, garantindo que os 9 pads fiquem visiveis sem corte
- Centralizar vertical e horizontalmente com flex

## 5. Faders: scroll horizontal por swipe entre abas

O MixerStrip ja tem paginacao com swipe (slide animation entre paginas de 4 canais). Adicionar suporte a gestos de toque (touch swipe) para navegar entre as paginas arrastando o dedo para esquerda/direita.

## 6. Faders e Metronomo: area de scroll rapido vertical

No footer (modo vertical), o Mixer e Metronomo ficarao dentro de um container de scroll vertical com `snap` para que o usuario deslize rapidamente entre os dois. Somente um sera visivel por vez, como paginas com scroll snap.

## 7. Configuracoes: aba "Sobre"

Nova aba com icone `Info` contendo informacoes basicas do app (nome, versao, descricao breve).

## 8. Configuracoes: ajustes textuais

- Botao "Ver Planos": remover icone Crown, texto muda para "Gerenciar"
- Botao "Acessar Glory Store": remover icone Store, texto muda para "Acessar"
- Aba Audio: "Esquerdo" vira "L", "Direito" vira "R", botoes menores, sem setinhas

## Detalhes Tecnicos

### Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Index.tsx` | Ocultar botoes do header quando `!currentSongId`; trocar ordem Foco/Repertorio; esconder "GP" em mobile; footer com scroll snap entre mixer e metronomo |
| `src/components/PadGrid.tsx` | Ajustar grid para `overflow-hidden`, usar altura disponivel para calcular tamanho dos pads responsivamente |
| `src/components/MixerStrip.tsx` | Adicionar suporte a touch swipe para mudar de pagina |
| `src/components/SettingsDialog.tsx` | Adicionar aba "Sobre"; remover icones/emojis dos botoes; ajustar L/R na aba de audio |
| `src/components/LandscapeSwipePanels.tsx` | Garantir que pads nao tenham scroll na area principal |

### Footer com scroll snap (modo vertical)

O footer tera `overflow-y-auto` com `scroll-snap-type: y mandatory`. O mixer e o metronomo terao `scroll-snap-align: start` e `min-height` de 100% do container, permitindo transicao rapida entre os dois com deslize do dedo.

### Touch swipe nos faders

Detectar `touchstart`/`touchend` com diferenca de X > 50px para acionar `goToPage(page+1)` ou `goToPage(page-1)`, tornando a navegacao entre abas de faders mais natural no celular.

### Aba Sobre

Contera: nome do app "Glory Pads", versao, descricao curta e link de contato/suporte.
