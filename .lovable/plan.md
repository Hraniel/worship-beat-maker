

## Corrigir a barra preta definitivamente

### Problema

O `body` esta configurado com `position: fixed` e `height: 100%`. No iOS, um elemento fixo com `height: 100%` nao inclui a area do safe-area-inset-bottom. Isso faz o body ser MENOR que a tela fisica. O container do Index.tsx tenta usar `height: 100dvh` (que e maior), mas o body com `overflow: hidden` corta a parte de baixo -- mostrando o fundo preto do sistema.

O Dashboard funciona porque o `useBodyScroll()` troca o body para `position: static` e `min-height: 100dvh`, permitindo que ele cubra a tela inteira.

### Solucao

Mudar o `height` do body de `100%` para `100dvh` no CSS global. Com isso, mesmo com `position: fixed`, o body vai cobrir a tela fisica inteira (incluindo safe areas). O `#root` herda esse tamanho e o container do Index.tsx tambem.

As paginas com scroll (Dashboard, Pricing, Landing) nao serao afetadas porque a classe `.scrollable-page` ja aplica `height: auto !important` e `position: static !important`.

### Compatibilidade com outros celulares

Sim. A unidade `dvh` (dynamic viewport height) e suportada por todos os navegadores modernos (Safari iOS 15.4+, Chrome Android, Samsung Internet). Ela se adapta automaticamente ao tamanho real da tela, incluindo:
- iPhones com Dynamic Island ou notch
- iPhones com botao Home
- Android com barra de navegacao por gestos
- Android com botoes de navegacao tradicionais
- Tablets em qualquer orientacao

### Detalhes tecnicos

**Arquivo: `src/index.css`**

Alterar o bloco global `html, body` (linhas 6-12):
- Mudar `height: 100%` para `height: 100dvh`

Alterar o bloco `body` dentro de `@layer base` (aprox. linha 93):
- Mudar `height: 100%` para `height: 100dvh`

Alterar o bloco `#root` (linhas 14-17):
- Mudar `height: 100%` para `height: 100dvh`

Alterar o segundo `#root` dentro de `@layer base`:
- Mudar `height: 100%` para `height: 100dvh`

**Arquivo: `src/pages/Index.tsx` (linha 820)**

Manter `height: '100dvh'` no container (ja esta correto). Nenhuma mudanca necessaria neste arquivo.

Sao apenas mudancas de valor CSS em um unico arquivo (`src/index.css`). Nenhuma logica de componente e alterada.

