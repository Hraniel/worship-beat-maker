
# Plano: Containers fixos com altura calculada (Opção B)

## Diagnóstico raiz

O `<footer>` mobile NÃO tem altura fixa. Ele usa `shrink-0` (não encolhe) mas cresce livremente com o conteúdo. Como cada aba (Mix, Met, Tap, Pads, Loja) tem conteúdo de altura diferente, o footer muda de tamanho, empurrando a `<main>` (pads) para cima/baixo.

### Estrutura atual (mobile):
```
div.flex-1.flex-col.overflow-hidden
  ├── main.flex-1 (pad grid) — ocupa o espaço restante
  └── footer.shrink-0 (SEM altura fixa!) — cresce com conteúdo
      └── div.h-full.flex-col
          ├── top bar h-[28px] (OK, fixo)
          └── div.flex-1 (conteúdo da aba — VARIÁVEL!)
```

## Solução: Footer com altura fixa no mobile

### Mudanças em `src/pages/Index.tsx`:

1. **Footer mobile: definir altura fixa** — Adicionar uma classe de altura fixa para o footer no mobile (ex: `h-[45vh]` ou `max-h-[280px]`) para que ele nunca mude de tamanho independente do conteúdo da aba ativa. O conteúdo interno faz scroll se necessário.

2. **Unificar padding das 5 abas** — A aba Pads (footerPage 3) tem `px-1.5` extra que as outras não têm. Remover ou adicionar a todas para uniformidade.

3. **Conteúdo da aba com overflow-y-auto** — Já existe no container pai, mas cada aba individual deve respeitar `h-full` sem expandir além do container fixo.

### Alternativa mais precisa:

Em vez de altura fixa em vh/px, usar a abordagem `overflow-hidden` no footer + `h-full` nos containers internos para que o footer nunca cresça além do espaço alocado pelo flex. O problema atual é que `shrink-0` impede o footer de encolher, permitindo que cresça indefinidamente.

**Trocar `shrink-0` por uma altura controlada:**
- Mobile não-focus: substituir `overflow-hidden` (já existe!) + garantir que o container interno use `h-full overflow-hidden` em vez de crescer.

O verdadeiro fix é garantir que o footer tenha `flex-shrink: 0` E `flex-grow: 0` E `flex-basis` fixo, OU simplesmente uma altura fixa.
