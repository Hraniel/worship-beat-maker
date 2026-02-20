
# Corrigir Metrônomo Minimizado Oculto

## Problema
O footer mobile tem `overflow-hidden` combinado com `max-h-[22vh]`. Os faders ocupam quase todo o espaço disponível, e o `overflow-hidden` corta a mini-barra do metrônomo que fica logo abaixo dos faders.

## Solução
Trocar `overflow-hidden` por `overflow-visible` no footer mobile (modo não-foco), permitindo que a mini-barra do metrônomo apareça sem ser cortada.

## Detalhes Técnicos

### Arquivo: `src/pages/Index.tsx` (linha 1259)

Alterar a classe do footer de:
```
overflow-hidden
```
para:
```
overflow-visible
```

Apenas essa mudança na classe CSS do footer resolve o problema — o elemento preto que "tampa" o metrônomo é o próprio `overflow-hidden` cortando o conteúdo que ultrapassa o `max-h-[22vh]`.
