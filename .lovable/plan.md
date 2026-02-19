
# Delay Sincronizado com o Metrônomo (Tap Tempo Delay)

## Visão Geral

Atualmente, o campo "Tempo" do Delay em cada pad aceita um valor manual em milissegundos (100ms–1000ms). A proposta é adicionar uma opção opcional chamada **"Sync BPM"** que, quando ativada, calcula automaticamente o tempo do delay a partir do BPM atual do metrônomo, seguindo subdivisões musicais comuns (colcheia, semínima, colcheia pontuada, etc.).

Quando o BPM mudar no metrônomo, o delay de todos os pads que estiverem com "Sync BPM" ativo se atualiza automaticamente.

---

## Como o sistema funciona hoje

```text
loop-engine.ts         → armazena currentBpm (privado), expõe setLoopBpm()
audio-effects.ts       → PadEffects.delayTime (segundos, fixo)
                       → applyEffects() envia delayTime ao DelayNode
PadEffectsPanel.tsx    → slider manual de "Tempo" (ms)
DrumPad.tsx            → chama applyEffects() + PadEffectsPanel
Index.tsx              → gerencia bpm, padEffects
```

---

## Mudanças necessárias

### 1. `src/lib/loop-engine.ts`
Exportar uma função `getCurrentBpm()` para leitura do BPM atual de fora do módulo:
```ts
export function getCurrentBpm(): number { return currentBpm; }
```

### 2. `src/lib/audio-effects.ts`
Adicionar o campo `delaySyncBpm: boolean` na interface `PadEffects` e no `DEFAULT_EFFECTS`:
```ts
export interface PadEffects {
  // ...campos existentes...
  delaySyncBpm: boolean; // novo: sincronizar delay com BPM
}

export const DEFAULT_EFFECTS: PadEffects = {
  // ...valores existentes...
  delaySyncBpm: false,
};
```

Criar a função auxiliar `calcBpmDelayTime(bpm, subdivision)` que converte BPM em tempo de delay para uma subdivisão escolhida:
```ts
export type DelaySubdivision = '1/1' | '1/2' | '1/4' | '1/8' | '1/16' | '1/4d' | '1/8d';
export function calcBpmDelayTime(bpm: number, sub: DelaySubdivision): number {
  // ex: 1/4 = 60/bpm, 1/8 = 30/bpm, 1/4d = 90/bpm, etc.
}
```

### 3. `src/components/PadEffectsPanel.tsx`
Receber o BPM atual como prop (`bpm?: number`) e adicionar a UI de "Sync BPM" na seção do Delay:

- Quando `effects.delay > 0`, mostrar um **toggle switch** com o label "Sync BPM"
- Quando `delaySyncBpm = true`:
  - Ocultar o slider manual de "Tempo (ms)"
  - Exibir um **seletor de subdivisão** com botões compactos: `1/16`, `1/8`, `1/8p`, `1/4`, `1/4p`, `1/2`
  - Mostrar o tempo calculado em ms (ex: `"= 500ms"`) como informação
  - Ao mudar a subdivisão ou ao receber novo BPM, chamar `onChange` com o `delayTime` recalculado

- Quando `delaySyncBpm = false`:
  - Exibir o slider manual como antes (comportamento atual, sem mudança)

Nova interface de props:
```ts
interface PadEffectsPanelProps {
  effects: PadEffects;
  bpm?: number;           // novo
  onChange: (fx: PadEffects) => void;
}
```

### 4. `src/components/DrumPad.tsx`
Receber `bpm?: number` e passar para `PadEffectsPanel`:
```tsx
<PadEffectsPanel
  effects={effects}
  bpm={bpm}              // novo
  onChange={(fx) => onEffectsChange?.(pad.id, fx)}
/>
```

### 5. `src/components/PadGrid.tsx`
Receber e repassar `bpm?: number` para cada `DrumPad`.

### 6. `src/pages/Index.tsx`
Passar o `bpm` atual para `PadGrid`:
```tsx
<PadGrid
  // ...props existentes...
  bpm={bpm}              // novo
/>
```

Além disso, quando o BPM mudar (`setBpm`), qualquer pad com `delaySyncBpm: true` deve ter seu `delayTime` recalculado e aplicado automaticamente via `applyEffects()`. Isso será feito num `useEffect`:
```ts
useEffect(() => {
  // Para cada pad com delaySyncBpm: true, recalcular e reaplicar
  Object.entries(padEffects).forEach(([padId, fx]) => {
    if (fx.delaySyncBpm && fx.delay > 0) {
      const newDelayTime = calcBpmDelayTime(bpm, fx.delaySubdivision ?? '1/4');
      applyEffects(padId, { ...fx, delayTime: newDelayTime });
    }
  });
}, [bpm]);
```

---

## Armazenamento

O campo `delaySyncBpm` e a subdivisão escolhida (`delaySubdivision`) serão armazenados junto com os demais efeitos no `localStorage` pela função `saveAllEffects` já existente — nenhuma mudança necessária no storage.

Para a subdivisão, adicionaremos também `delaySubdivision: DelaySubdivision` na interface `PadEffects` com valor padrão `'1/4'`.

---

## Arquivos modificados (resumo)

| Arquivo | Mudança |
|---|---|
| `src/lib/loop-engine.ts` | Exportar `getCurrentBpm()` |
| `src/lib/audio-effects.ts` | Adicionar `delaySyncBpm`, `delaySubdivision`, `calcBpmDelayTime()` |
| `src/components/PadEffectsPanel.tsx` | UI de Sync BPM: toggle + seletor de subdivisão |
| `src/components/DrumPad.tsx` | Receber e passar `bpm` prop |
| `src/components/PadGrid.tsx` | Receber e passar `bpm` prop |
| `src/pages/Index.tsx` | Passar `bpm`, reaplica efeito quando BPM muda |

---

## Comportamento esperado (fluxo)

1. Usuário abre o menu do pad (longa pressão) → aba Efeitos → ativa Delay
2. Aparece o toggle "Sync BPM" (desativado por padrão)
3. Usuário ativa o toggle → slider de tempo desaparece, aparece seletor de subdivisão
4. Usuário escolhe `1/8` com BPM = 120 → delay = 250ms (calculado automaticamente)
5. Usuário muda o BPM no metrônomo para 90 → delay recalcula para 333ms sem interação manual
6. Ao desativar o toggle, o slider manual reaparece com o último valor usado

---

## Tier

Esse recurso faz parte dos **Efeitos de Áudio**, que já são exclusivos do plano **Master** — nenhuma mudança de permissões necessária.
