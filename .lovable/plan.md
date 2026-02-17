

# Correções nos Faders do Mixer

## 1. Remover animação de clipping
- Eliminar o componente `ClipIndicator` do `MixerStrip.tsx`
- Remover a referência a ele dentro do `VuTicks`

## 2. Cores Solo/Mute
As cores já estão implementadas corretamente (amarelo para Solo, vermelho para Mute). Nenhuma alteração necessária.

## 3. Nome do fader do metrônomo
- Alterar `shortLabel: 'MET'` para `shortLabel: 'Metrônomo'` em `src/pages/Index.tsx` (linha 867)

## Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/MixerStrip.tsx` | Remover `ClipIndicator` e sua referência no `VuTicks` |
| `src/pages/Index.tsx` | `shortLabel: 'Metrônomo'` no canal do metrônomo |

