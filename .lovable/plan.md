

# Reordenar Efeitos + Resetar estado dos submenus ao reabrir

## Alterações em `src/components/DrumPad.tsx`

### 1. Mover "Efeitos" para logo abaixo de "Renomear"
Atualmente a seção de efeitos (linhas 508-547) fica no final do menu, após os botões de reset. Mover esse bloco inteiro para logo após o bloco de "Renomear" (após linha 391), antes do separador e seção de import.

### 2. Resetar submenus ao abrir o menu
Quando `showMenu` muda para `true`, resetar `showEffects`, `showColorPicker`, `showStorePicker` e `isRenaming` para `false`. Isso garante que ao reabrir o menu do pad, nenhuma aba interna fique aberta.

Implementação: adicionar um `useEffect` que observa `showMenu` e, quando `true`, fecha todos os submenus:

```typescript
useEffect(() => {
  if (showMenu) {
    setShowEffects(false);
    setShowColorPicker(false);
    setShowStorePicker(false);
    setIsRenaming(false);
  }
}, [showMenu]);
```

## Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/components/DrumPad.tsx` | Mover bloco de efeitos + adicionar useEffect de reset |

