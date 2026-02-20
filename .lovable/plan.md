

# Adicionar toggle de Sync (quantização) no Metrônomo

## O que muda

Atualmente, quando o metrônomo ou loops estão rodando, todos os pads são automaticamente quantizados (sincronizados ao grid de semicolcheias). O usuário quer poder ligar/desligar essa sincronização globalmente, com um botão no metrônomo.

## Como funciona

Um botão "Sync" será adicionado na barra de controles do metrônomo. Quando ativado, os pads terão seus toques quantizados ao grid rítmico. Quando desativado, os pads tocam imediatamente ao toque, mesmo com o metrônomo ligado.

## Detalhes Tecnicos

### 1. `src/lib/loop-engine.ts` -- Estado global de sync

Adicionar uma variavel `syncEnabled` (default `true`) com getter/setter exportados:

- `setSyncEnabled(enabled: boolean)`
- `isSyncEnabled(): boolean`

Modificar `getQuantizeDelay()` para retornar `0` quando sync estiver desabilitado.

### 2. `src/components/Metronome.tsx` -- Botao Sync

Adicionar um botao toggle "Sync" na linha de controles (ao lado dos botoes de formula de compasso). O botao fica destacado quando ativo (estilo similar aos botoes de time signature selecionados).

O estado sera gerenciado localmente e sincronizado via `setSyncEnabled()` / `isSyncEnabled()` do loop-engine.

### 3. Persistencia

Salvar a preferencia no `localStorage` com a chave `drum-pads-sync-enabled` para manter entre sessoes.

### Resumo

| Arquivo | Mudanca |
|---|---|
| `src/lib/loop-engine.ts` | Adicionar `syncEnabled`, `setSyncEnabled()`, `isSyncEnabled()`; condicionar `getQuantizeDelay()` |
| `src/components/Metronome.tsx` | Adicionar botao toggle "Sync" na UI com persistencia em localStorage |

Nenhuma alteracao necessaria no `DrumPad.tsx` -- ele ja usa `getQuantizeDelay()` que passara a respeitar o novo flag automaticamente.

