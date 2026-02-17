# Corrigir cores do ZoomPopup do PanControl

## Problema

O componente `PanControl.tsx` usa `bg-orange-400` e `text-orange-400` no ZoomPopup, destoando do de uma acombinação de pretos e cinzas desde que sejam visiveis e profissionais.

## Alteracao


| Arquivo                         | Mudanca                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/components/PanControl.tsx` | Trocar `bg-orange-400` para `bg-primary` e `text-orange-400` para `text-primary` no ZoomPopup (2 linhas) |


Isso alinha o PanControl com o PanKnob e os demais ZoomPopups que ja usam as cores do tema (`primary`).