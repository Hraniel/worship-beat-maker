
# Continuous Pads ao lado do Grid de Pads (espaço vazio ao lado do RIDE)

## O problema atual

O grid de pads 3x3 tem `maxWidth` dinâmico e fica centralizado na área `<main>`. Em tablets e desktops portrait, o Continuous Pad tenta aparecer no footer/sidebar, mas o footer tem alturas máximas e overflow que cortam o conteúdo — daí os pads nunca aparecerem.

## A solução proposta

Em vez de depender do footer, colocar o Continuous Pad **diretamente ao lado do grid 3x3**, aproveitando o espaço horizontal disponível à direita do grid quando a tela é mais larga (tablet e desktop portrait).

O layout passa a ser:

```text
┌────────────────────────────────────────────────┐
│  [KICK]   [SNARE]   [HH]                       │
│  [TOM]    [CRASH]   [RIDE]   │  CONTINUOUS     │
│  [PAD7]   [PAD8]   [PAD9]   │  PADS (grid     │
│                               │  de notas)      │
└────────────────────────────────────────────────┘
```

Ou seja: uma `<div>` com `flex flex-row` contendo o `PadGrid` à esquerda e o `AmbientPads` à direita, dentro do `<main>`, sempre visível — sem depender de footer, scroll ou max-height.

## Estratégia de exibição por dispositivo

| Dispositivo | Onde fica |
|---|---|
| Mobile portrait | Abaixo do grid (comportamento atual — via `ambientPads` prop do LandscapeSwipePanels) |
| **Tablet portrait** | **Ao lado direito do grid** (novo) |
| **Desktop portrait** | **Ao lado direito do grid** (novo) |
| Landscape (tablet/desktop) | Dentro do painel Mix do LandscapeSwipePanels (comportamento atual) |

## Mudanças técnicas

### 1. `src/pages/Index.tsx` — wrapper do PadGrid

Atualmente o `padGrid` prop passado ao `LandscapeSwipePanels` é apenas o `<PadGrid>` sozinho dentro de um `div`. A mudança é envolver o PadGrid + AmbientPads num container `flex`:

```tsx
// ANTES
padGrid={
  <div className="w-full h-full flex items-center justify-center ...">
    <PadGrid ... />
  </div>
}

// DEPOIS — para tablet/desktop portrait, adicionar AmbientPads ao lado
padGrid={
  <div className="w-full h-full flex items-center justify-center gap-3 ...">
    <PadGrid ... />
    {/* Continuous Pads ao lado do grid — só tablet/desktop portrait */}
    {(isTablet || isDesktop) && !isLandscape && (
      <div className="w-[140px] xl:w-[160px] shrink-0 self-center">
        <AmbientPads panDisabled={audioSettings.ambientStereo === 'mono'} />
      </div>
    )}
  </div>
}
```

### 2. `src/pages/Index.tsx` — remover duplicatas do footer

Com os Continuous Pads agora sempre visíveis ao lado do grid no tablet/desktop, as entradas duplicadas no footer podem ser removidas para evitar dois blocos de pads simultâneos:

- Remover o bloco `<AmbientPads>` do container tablet fora do foco (linha 1279-1282)
- Remover o bloco `<AmbientPads>` do container tablet foco (linha 1303-1306)
- Remover o bloco `<AmbientPads>` do container desktop (linha 1217-1220)

### 3. `src/components/LandscapeSwipePanels.tsx` — portrait portrait: não renderizar ambient abaixo do grid

No `LandscapeSwipePanels`, quando `!isLandscape && !isDesktop`, o `{ambientPads}` é renderizado abaixo do grid para mobile. Adicionar condição para não renderizar no tablet/desktop portrait (pois já aparece ao lado do grid):

```tsx
// Só renderiza o bloco de ambient abaixo do grid no mobile portrait
{!isDesktop && !isTablet && (
  <div className="shrink-0 border-t border-border/30 ...">
    {ambientPads}
  </div>
)}
```

Isso requer passar `isTablet` para o componente ou usar o hook internamente (o hook já é importado em `LandscapeSwipePanels`).

## Arquivos a modificar

- **`src/pages/Index.tsx`**: modificar o `padGrid` prop para incluir `<AmbientPads>` ao lado do grid para tablet/desktop portrait; remover duplicatas do footer
- **`src/components/LandscapeSwipePanels.tsx`**: condicionar a renderização do `ambientPads` abaixo do grid apenas para mobile portrait

## Resultado esperado

- Continuous Pads sempre visíveis, ao lado do grid, sem depender de footer ou scroll
- Mobile portrait: Pads abaixo do grid (comportamento existente)
- Tablet/Desktop portrait: Pads ao lado direito do grid, no espaço horizontal disponível
- Landscape: Pads dentro do painel Mix (comportamento existente)
