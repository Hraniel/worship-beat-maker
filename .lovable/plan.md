

## Problema Real

O problema nao e de padding ou safe-area. E um problema **estrutural de layout**. A barra de atalhos (Metronomo, Afinador, Loja) esta aninhada dentro de uma hierarquia que a corta:

```text
Root (100dvh, overflow-hidden, flex-col)
  +-- header (shrink-0)
  +-- div.flex-1 (overflow-hidden)        <-- ESTE CONTAINER CORTA O CONTEUDO
  |     +-- main.flex-1 (pad grid)
  |     +-- footer (shrink-0)
  |           +-- conteudo do footer (Mix/Met/Tools)
  |           +-- BARRA DE ATALHOS        <-- CORTADA pelo overflow-hidden do pai
  +-- modais...
```

A barra de atalhos fica dentro do `footer`, que fica dentro de um `div` com `overflow-hidden`. Quando o conteudo total (main + footer) excede o espaco disponivel, a parte inferior e cortada — exatamente onde ficam os botoes.

A aba "Planos" (Dashboard/Loja) funciona porque usa um layout completamente diferente (`useBodyScroll`) com rolagem normal.

## Solucao

Mover a barra de atalhos para **fora** do container `overflow-hidden`, tornando-a um filho direto do container raiz. Assim ela nunca sera cortada.

### Estrutura Nova:

```text
Root (100dvh, overflow-hidden, flex-col)
  +-- header (shrink-0)
  +-- div.flex-1 (overflow-hidden)
  |     +-- main.flex-1 (pad grid)
  |     +-- footer (shrink-0)
  |           +-- conteudo do footer (Mix/Met/Tools)
  +-- BARRA DE ATALHOS (shrink-0)         <-- MOVIDA PARA FORA
```

### Detalhes Tecnicos

**Arquivo: `src/pages/Index.tsx`**

1. **Remover** o bloco da barra de atalhos (linhas ~1612-1647) de dentro do `<footer>`
2. **Inserir** esse mesmo bloco como filho direto do `<div>` raiz (apos o fechamento do `</div>` que contem main+footer, antes dos modais)
3. A barra mantem o `paddingBottom: env(safe-area-inset-bottom)` para que o fundo se estenda ate a borda do dispositivo e os botoes fiquem acima do indicador home
4. A barra tera `shrink-0` para nunca ser comprimida

Isso resolve o problema de uma vez porque a barra de atalhos deixa de depender do espaco sobrante dentro do container com overflow cortado.
