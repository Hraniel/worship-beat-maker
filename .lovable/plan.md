
# Ajuste do Footer do Tablet: Continuous Pads sem corte de overflow

## Problemas identificados

### 1. Continuous Pads ausentes no tablet (fora do foco)
O bloco tablet fora do foco (linhas 1224–1280 do `Index.tsx`) termina após o metrônomo sem renderizar nenhum `<AmbientPads>`. O bloco só contém faders + metrônomo.

### 2. Continuous Pads ausentes no tablet (modo foco)
O bloco tablet em foco (linhas 1281–1301) exibe só a mini-barra BPM. A linha 1299 tem um comentário dizendo "AmbientPads renderizados via LandscapeSwipePanels", mas isso não funciona no portrait — apenas no landscape. Os pads nunca aparecem.

### 3. Footer pai corta o conteúdo no modo foco
O footer pai (linha 1148) usa:
```
max-h-[20vh] md:max-h-[18vh] lg:max-h-none
```
No modo foco em tablet (`md`), `max-h-[18vh]` corta qualquer coisa que ultrapasse 18% da altura da tela — o que elimina os Continuous Pads mesmo que sejam adicionados.

### 4. Tablet fora do foco: container sem `overflow-y-auto`
O container interno `div.hidden.md:block.lg:hidden` usa `space-y-1.5` sem `overflow-y-auto`, então quando o conteúdo for maior que o espaço disponível, ele transborda silenciosamente ou é cortado pelo `overflow-visible` do pai.

---

## Mudanças necessárias

### `src/pages/Index.tsx`

**Ajuste 1 — Footer pai: remover `max-h` no tablet em modo foco**

Linha 1148, classe do `<footer>`:
```
// ANTES
focusMode ? 'p-1 max-h-[20vh] md:max-h-[18vh] lg:max-h-none focus-footer'
// DEPOIS
focusMode ? 'p-1 max-h-[20vh] md:max-h-none lg:max-h-none focus-footer'
```
O tablet em foco não deve ter altura máxima limitada — ele deve crescer naturalmente para acomodar a mini-barra + pads.

**Ajuste 2 — Tablet fora do foco: adicionar `<AmbientPads>` após o metrônomo**

Após o bloco do metrônomo (linha 1278), antes do `</div>` de fechamento do container tablet, adicionar:
```tsx
{/* Continuous Pads — abaixo do metrônomo */}
<div data-tutorial="ambient-pads" className="pt-1">
  <AmbientPads panDisabled={audioSettings.ambientStereo === 'mono'} />
</div>
```

Também adicionar `overflow-y-auto` ao container para garantir rolagem caso o conteúdo seja maior que o espaço:
```tsx
// ANTES
<div className="hidden md:block lg:hidden p-1.5 space-y-1.5">
// DEPOIS
<div className="hidden md:block lg:hidden p-1.5 space-y-1.5 overflow-y-auto">
```

**Ajuste 3 — Tablet modo foco: adicionar `<AmbientPads>` abaixo da mini-barra**

Dentro do bloco foco do tablet (linhas 1281–1301), substituir o comentário obsoleto por:
```tsx
{/* Continuous Pads — abaixo da mini-barra no modo foco */}
<div data-tutorial="ambient-pads" className="mt-1">
  <AmbientPads panDisabled={audioSettings.ambientStereo === 'mono'} />
</div>
```

---

## Resultado esperado por dispositivo

```text
TABLET (md, portrait)
├── Fora do foco:
│   Footer: [Faders (paginado)] → [Metrônomo completo] → [Continuous Pads]
│   overflow-y-auto garante rolagem se necessário
│   max-h: none → sem corte
│
└── Modo foco:
    Footer: [Mini-barra BPM + play/pause] → [Continuous Pads]
    max-h: none → sem corte (removido md:max-h-[18vh])
    Metrônomo: hidden mas montado (áudio ativo)
```

---

## Arquivos a modificar

- **`src/pages/Index.tsx`**: 3 ajustes pontuais — footer pai (1 linha), bloco tablet fora do foco (+`<AmbientPads>` + `overflow-y-auto`), bloco tablet foco (+`<AmbientPads>` e remoção de comentário obsoleto).
