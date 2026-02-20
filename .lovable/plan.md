

## Corrigir a barra preta no topo

### Problema

O `body` tem `position: fixed` mas nenhum `top: 0` explicito. Quando esticamos o height com `calc(100dvh + env(safe-area-inset-bottom))`, o corpo cresceu pra baixo, mas nao esta ancorado no topo da tela. Alem disso, o `html` com `height: 100%` pode nao cobrir a area do safe-area-inset-top no iOS com `viewport-fit=cover`.

### Solucao

Duas mudancas no arquivo `src/index.css`:

1. **Adicionar `top: 0; left: 0;`** ao `body` (no bloco `@layer base`, linha 101, junto ao `position: fixed`) para garantir que ele se ancore no canto superior esquerdo da tela.

2. **Mudar `html` de `height: 100%` para `height: 100dvh`** (linha 7) para que o elemento html tambem cubra toda a area visivel, incluindo as safe areas.

### Detalhes tecnicos

**Arquivo: `src/index.css`**

Linha 7 - bloco `html`:
- De: `height: 100%;`
- Para: `height: 100dvh;`

Linhas 101-102 - bloco `body` dentro de `@layer base`:
- Adicionar: `top: 0;` e `left: 0;` logo apos `position: fixed;`

Nenhuma mudanca em componentes React. Apenas CSS.
