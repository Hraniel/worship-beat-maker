
# Diagnóstico definitivo: por que os Continuous Pads não aparecem

## Causa raiz real

A abordagem atual embute os `<AmbientPads>` **dentro do prop `padGrid`**, dentro de um div com `w-full h-full flex items-center justify-center overflow-hidden`. O problema é que:

1. O `LandscapeSwipePanels` em modo portrait envolve o `padGrid` num div com `flex-1 flex justify-center min-h-0 overflow-hidden`
2. O `padGrid` em si tem `w-full h-full` — logo preenche todo o espaço disponível
3. `PadGrid` dentro dele usa `maxWidth` para se auto-limitar, mas o container externo continua `w-full`
4. Os `AmbientPads` ficam numa `div` à direita dentro desse container `w-full`, mas **o `overflow-hidden` no nível do `LandscapeSwipePanels` corta qualquer coisa que ultrapasse a área visível**
5. Além disso, o preview roda a ~757px, abaixo do breakpoint de 768px — então `isTablet` retorna `false` e `isDesktop` retorna `false`, fazendo a condição `(isTablet || isDesktop) && !isLandscape` ser sempre `false` no ambiente de preview

## Solução correta

Em vez de colocar os `<AmbientPads>` dentro do `padGrid` prop (que fica dentro de containers com `overflow-hidden`), renderizá-los **no nível do `LandscapeSwipePanels`** como um painel irmão do grid, em modo portrait para tablet/desktop.

O `LandscapeSwipePanels` já conhece `isTablet` e `isDesktop` internamente. A mudança é:

**No branch portrait (`!isLandscape`) do `LandscapeSwipePanels`:**

```text
ANTES:
  <div flex-col>
    <div flex-1> {padGrid} </div>        ← padGrid contém PadGrid + AmbientPads
    {!isDesktop && !isTablet && ambientPads}  ← mobile only
  </div>

DEPOIS:
  <div flex-col>
    <div flex-1 flex-row>               ← linha horizontal
      <div flex-1> {padGrid} </div>     ← apenas PadGrid, sem overflow-hidden no nível do row
      {(isTablet || isDesktop) && (
        <div w-[150px] shrink-0>        ← AmbientPads ao lado
          {ambientPads}
        </div>
      )}
    </div>
    {!isDesktop && !isTablet && (
      <div shrink-0>  {ambientPads} </div>  ← mobile: abaixo
    )}
  </div>
```

Isso move a lógica de exibição lado-a-lado para **dentro** do `LandscapeSwipePanels`, onde há controle total do layout, sem depender de `overflow-hidden` externo.

## Mudanças nos arquivos

### `src/components/LandscapeSwipePanels.tsx`

No branch `!isLandscape` (portrait), substituir o layout atual por:

```tsx
if (!isLandscape) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className={`flex-1 flex min-h-0 gap-2 ${focusMode ? 'items-start' : 'items-center'}`}>
        {/* Pad grid — ocupa o espaço restante */}
        <div className="flex-1 flex justify-center min-h-0 overflow-hidden">
          {padGrid}
        </div>
        {/* Continuous Pads ao lado — só tablet/desktop portrait */}
        {(isTablet || isDesktop) && (
          <div className="w-[150px] xl:w-[170px] shrink-0 self-center pr-2">
            {ambientPads}
          </div>
        )}
      </div>
      {/* Mobile portrait: Continuous Pads abaixo do grid */}
      {!isDesktop && !isTablet && (
        <div className={`shrink-0 border-t border-border/30 ${focusMode ? 'px-2 py-0.5' : 'px-2 py-1'}`}>
          {ambientPads}
        </div>
      )}
    </div>
  );
}
```

### `src/pages/Index.tsx`

1. **Remover `<AmbientPads>` de dentro do `padGrid` prop** (linhas 1014–1019) — não é mais necessário lá, pois o `LandscapeSwipePanels` gerencia o posicionamento
2. **Restaurar o `ambientPads` prop** para passar `<AmbientPads>` diretamente (não só o botão de foco), pois agora o `LandscapeSwipePanels` usa esse prop também no modo portrait tablet/desktop:

```tsx
ambientPads={
  <div data-tutorial="ambient-pads" className="...">
    {/* Botão de foco (mobile portrait) */}
    {!isTablet && !isDesktop && currentSongId && !editMode && (
      <button onClick={toggleFocusMode} ...>
        {focusMode ? 'Sair' : 'Foco'}
      </button>
    )}
    {/* Pads: só mobile portrait — tablet/desktop gerenciado pelo LandscapeSwipePanels */}
    {!isTablet && !isDesktop && (
      <AmbientPads panDisabled={audioSettings.ambientStereo === 'mono'} />
    )}
  </div>
}
```

Mas na verdade a forma mais limpa é passar o `<AmbientPads>` **diretamente** como `ambientPads` prop e deixar o `LandscapeSwipePanels` decidir onde e quando renderizá-lo (landscape → no painel mix; portrait tablet/desktop → ao lado do grid; portrait mobile → abaixo do grid).

O botão de foco pode ser mantido separadamente no `ambientPads` prop apenas para mobile, ou movido para outro lugar.

## Plano de implementação

**Arquivo 1: `src/components/LandscapeSwipePanels.tsx`**
- No branch `!isLandscape`, criar um flex-row com `padGrid` à esquerda e `ambientPads` à direita (condicionado a `isTablet || isDesktop`)
- Para mobile, manter `ambientPads` abaixo do grid como antes

**Arquivo 2: `src/pages/Index.tsx`**
- Remover o bloco de `AmbientPads` de dentro do `padGrid` prop (retornar ao `padGrid` contendo apenas o `<PadGrid>`)
- Ajustar o `ambientPads` prop para passar `<AmbientPads panDisabled={...} />` diretamente
- Manter o botão de foco separado do `ambientPads` prop (ele pode ir junto com `ambientPads` para mobile, ou ser extraído para o footer mobile)

## Resultado esperado

- **Mobile portrait**: AmbientPads abaixo do grid ✓
- **Tablet portrait (768–1024px)**: AmbientPads ao lado direito do grid, sem corte ✓
- **Desktop portrait (1024px+)**: AmbientPads ao lado direito do grid, sem corte ✓
- **Landscape tablet/desktop**: AmbientPads dentro do painel Mix (comportamento existente) ✓
