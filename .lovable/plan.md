

# Plano: Estabilizar pads e conteudo das abas (sem tocar Landing nem Loja)

## Arquivos que NAO serao alterados
- `src/pages/Landing.tsx` — intacto
- `src/pages/Dashboard.tsx` — intacto
- Nenhum outro arquivo alem do `src/pages/Index.tsx`

## Problema

Na linha 1672 do `Index.tsx`, o footer mobile usa:
```
flex-[0_0_auto] max-h-[45vh]
```
Isso significa que o footer tem tamanho baseado no conteudo (auto), com um teto de 45vh. Como cada aba (Mix, Met, Tap, Pads) tem conteudo de altura diferente, o footer muda de tamanho e os pads se movem.

## O que sera alterado

### Unica mudanca: linha 1672 do `src/pages/Index.tsx`

Trocar apenas as classes de dimensionamento do footer no modo nao-foco:

**De:**
```
flex-[0_0_auto] max-h-[45vh] lg:max-h-none
```

**Para:**
```
h-[45vh] flex-none lg:h-auto lg:flex-1
```

Isso faz o footer ter SEMPRE a mesma altura (45vh) no mobile, independente de qual aba esta ativa. Os pads, Mix, Metronomo e Tap ficam todos na mesma posicao.

### Nada mais sera alterado

- As 5 abas internas (Mix, Met, Tap, Pads, Loja) continuam exatamente como estao
- O conteudo que nao couber rola internamente (o `overflow-y-auto` da linha 1984 ja cuida disso)
- Nenhum padding, margem ou estrutura interna sera mexido

