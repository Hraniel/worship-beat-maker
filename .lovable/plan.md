
## Plano de Padronização — Settings Dialog (Desktop e Tablet)

### Diagnóstico do problema

A edição anterior introduziu dois problemas no `SettingsDialog.tsx`:

1. **Textos menores que o necessário**: as abas (TabsTrigger) foram reduzidas para `text-[10px] sm:text-[11px]`, quando o padrão original era `text-xs` (12px). Os títulos de seção também ficaram em `text-[11px]`, abaixo do padrão.

2. **Containers com `max-w-xs` forçados**: todas as abas (Áudio, Loja, Planos, Guia, Sobre) receberam `max-w-xs mx-auto`, o que cria uma caixa estreita descentrada dentro de um diálogo que já tem seu próprio tamanho fixo (`max-w-sm` / `max-w-md`).

3. **Dialog não aumenta para desktop**: o diálogo continua em `max-w-sm sm:max-w-md`, que é pequeno para telas maiores. No desktop/tablet, poderia ter um tamanho mais confortável (`sm:max-w-lg`).

---

### O que será corrigido

#### 1. Dialog — tamanho padronizado

```
mobile:  max-w-sm  (atual — mantém)
tablet/desktop:  max-w-lg  (aumenta de md → lg)
landscape fullscreen: sem mudança
```

#### 2. Abas (TabsTrigger) — tamanho de texto unificado

Remover `text-[10px] sm:text-[11px]` → usar `text-xs` em todas as abas (padrão Tailwind, 12px). Ícones permanecem `h-3.5 w-3.5`.

#### 3. Containers de conteúdo — sem `max-w-xs` artificial

Todas as abas passam a usar `w-full` com padding interno, sem restrição de largura forçada que cria aspecto "espremido".

Aba por aba:

| Aba | Antes | Depois |
|-----|-------|--------|
| Áudio | `max-w-sm mx-auto` | `w-full` — cards ocupam a largura do dialog |
| Loja | `max-w-xs mx-auto` | `w-full max-w-sm mx-auto` — centralizado mas mais folgado |
| Planos | `max-w-xs mx-auto` | `w-full max-w-sm mx-auto` |
| Guia | `max-w-xs mx-auto` | `w-full` — lista ocupa a largura total |
| Sobre | `max-w-xs mx-auto` | `w-full max-w-sm mx-auto` |

#### 4. Títulos de seção — padronizados em `text-xs` (não `text-[11px]`)

Labels como "Glory Store", "Planos e Assinatura", "Guia Prático", "Sobre": `text-xs font-semibold`.

#### 5. Botões de ação (Loja/Planos) — tamanho adequado

Botões "Acessar a Loja" e "Gerenciar plano": de `text-xs py-1.5` para `text-sm py-2 px-5` — mais clicáveis e proporcionais.

#### 6. Aba "Sobre" — texto legível

- Título `Glory Pads`: de `text-xs` → `text-sm font-bold`
- Versão: de `text-[10px]` → `text-xs`
- Descrição: de `text-xs` → `text-sm`

---

### Arquivos alterados

- **`src/components/SettingsDialog.tsx`** — único arquivo a ser editado

### O que NÃO muda

- Layout landscape (fullscreen) — já está correto
- Componente `StereoOption` — já usa tamanhos bons (`text-sm` no label, `text-xs` nos botões)
- Lógica de estado e callbacks — sem alterações
- Layout do `Index.tsx` — fora do escopo desta padronização

