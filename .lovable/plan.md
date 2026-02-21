

# Plano: Estabilizar pads e barra superior entre todas as paginas

## Problema atual

O container da "top bar" (acima do conteudo de cada aba) tem `min-h-[24px]` mas o conteudo dentro dele varia por pagina:
- **Mix (footerPage 0)**: mostra botoes 1, 2, 3 (altura real ~24px)
- **Tap Tempo (footerPage 2)**: insere um spacer de 28px (altura diferente!)
- **Metronomo, Pads, Loja**: container vazio (colapsa para min-h de 24px, mas sem padding interno consistente)

Isso causa micro-deslocamentos nos pads principais ao trocar de aba porque a altura efetiva do "top bar" nao e exatamente a mesma em todos os casos.

## Solucao

Transformar o "top bar" em um container de **altura fixa absoluta**, igual em todas as paginas, independente do conteudo interno.

### Detalhes tecnicos

**Arquivo: `src/pages/Index.tsx`**

1. **Unificar a altura do top bar** - Trocar `min-h-[24px]` por uma altura fixa (`h-[28px]`) que acomode tanto os botoes 1,2,3 quanto o spacer do Tap Tempo. Usar `h-[28px] shrink-0` para garantir que nunca mude.

2. **Remover o spacer separado do Tap Tempo** - O `<div className="h-[28px]" />` dentro do top bar para `footerPage === 2` se torna desnecessario porque o container ja tem altura fixa de 28px.

3. **Conteudo condicional dentro do container fixo** - Os botoes 1,2,3 continuam aparecendo apenas na Mix page, mas agora dentro de um container que sempre ocupa exatamente 28px, sem variacao.

4. **Garantir que o `flex-1 min-h-0 overflow-y-auto`** do conteudo das paginas abaixo do top bar comece sempre na mesma posicao vertical.

### Mudanca no codigo (unica alteracao)

Linha ~1967 do Index.tsx:

De:
```text
<div className="flex items-center gap-1 px-2 pt-1 pb-0 shrink-0 min-h-[24px]">
  {footerPage === 0 && ...botoes 1,2,3...}
  {footerPage === 2 && <div className="h-[28px]" />}
</div>
```

Para:
```text
<div className="flex items-center gap-1 px-2 shrink-0 h-[28px]">
  {footerPage === 0 && ...botoes 1,2,3...}
</div>
```

- `h-[28px]` fixo substitui `min-h-[24px]` + `pt-1`
- Remove o spacer condicional do Tap Tempo
- Resultado: mesma posicao exata dos pads em todas as 5 abas

