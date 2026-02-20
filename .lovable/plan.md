

## Corrigir a barra preta na tela principal

### Causa raiz identificada

O container do Index.tsx usa `height: calc(100dvh + env(safe-area-inset-bottom))`, que e MAIOR que o body. O body tem `position: fixed; height: 100%; overflow: hidden`, entao ele **corta** a parte de baixo do container. O resultado e que o fundo do container nao chega ate a borda do dispositivo.

```text
body (position: fixed, height: 100%, overflow: hidden)
  #root (height: 100%)
    Container (height: calc(100dvh + safe-area) = MAIOR que #root)
      ... conteudo ...
      parte inferior → CORTADA pelo overflow:hidden do body
```

### Solucao

Trocar `height: calc(100dvh + env(safe-area-inset-bottom, 0px))` por `height: 100%` no container raiz do Index.tsx.

Com `viewport-fit=cover` (ja configurado no index.html), o body em `position: fixed; height: 100%` cobre a tela INTEIRA, incluindo a area do home indicator. O `#root` herda isso. Se o container do Index usar `height: 100%`, ele herda o tamanho completo do body, preenchendo tudo.

O `paddingBottom: env(safe-area-inset-bottom)` continua para empurrar o conteudo acima do indicador home.

### Detalhes tecnicos

**Arquivo: `src/pages/Index.tsx` (linha 820)**

Alterar o style do container raiz:

De:
```tsx
height: 'calc(100dvh + env(safe-area-inset-bottom, 0px))'
```

Para:
```tsx
height: '100%'
```

Manter tudo o mais igual (paddingTop, paddingLeft, paddingRight, paddingBottom, boxSizing).

Esta e uma mudanca de uma unica propriedade CSS. Nenhum outro arquivo precisa ser alterado.
