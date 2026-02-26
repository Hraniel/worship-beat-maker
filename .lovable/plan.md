

# Corrigir Audio em Segundo Plano -- Worker Timer + Recuperacao do Loop Engine

## Problema Real
Os mecanismos de keep-alive atuais (Web Locks, oscillator silencioso, WAV silencioso) mantem o `AudioContext` vivo, mas o **`setInterval` do loop engine** (`loop-engine.ts`) e congelado pelo iOS quando o app vai para background. Quando o timer acorda, `nextTickAudioTime` ficou muito atras de `ctx.currentTime`, causando um burst de centenas de subdivisoes "atrasadas" ou simplesmente silencio.

## Solucao (2 partes)

### 1. Web Worker Timer para o Loop Engine
Mover o timer do scheduler para um **Web Worker inline** (criado via Blob URL). Timers em Web Workers sao **significativamente menos throttled** pelo iOS Safari em background comparado a timers na main thread.

**Arquivo:** `src/lib/timer-worker.ts` (novo)
- Worker simples que recebe mensagens `start`/`stop` com intervalo
- Posta `tick` de volta para a main thread a cada intervalo

**Arquivo:** `src/lib/loop-engine.ts`
- Substituir `window.setInterval(schedulerTick, 25)` pelo Web Worker timer
- Fallback para `setInterval` caso Web Workers nao estejam disponiveis

### 2. Recuperacao Inteligente no schedulerTick
Quando `nextTickAudioTime` fica muito atras de `ctx.currentTime` (ex: mais de 0.5s), significa que o timer ficou congelado. Em vez de tentar agendar centenas de subdivisoes atrasadas, **pular para o presente** mantendo o alinhamento de compasso.

**Arquivo:** `src/lib/loop-engine.ts`
- Detectar gap > 0.5s entre `nextTickAudioTime` e `ctx.currentTime`
- Reancorrar `nextTickAudioTime` para `ctx.currentTime + 0.005`
- Manter `currentSubdivision` alinhado ao compasso para nao perder o ritmo

### 3. Visibility Recovery no Index.tsx
Quando o app volta ao foco, forcar um "re-sync" do loop engine para garantir que o timer worker esta ativo.

**Arquivo:** `src/pages/Index.tsx`

## Detalhes Tecnicos

```text
Main Thread                    Web Worker
+-----------+                  +------------+
| loop-engine|  -- start(25) -->| setInterval|
|           |  <-- tick --------|   (25ms)   |
| schedulerTick()              |            |
|   -> scheduleSubdivision()   |            |
|   -> Web Audio pre-schedule  |            |
+-----------+                  +------------+
```

### Novo arquivo `src/lib/timer-worker.ts`:
- Cria um Web Worker inline via `new Worker(URL.createObjectURL(new Blob(...)))`
- Exporta funcoes `startWorkerTimer(callback, interval)` e `stopWorkerTimer()`
- Fallback automatico para `setInterval` se Worker nao disponivel

### Mudancas em `src/lib/loop-engine.ts`:
- Importar e usar o worker timer em vez de `window.setInterval`
- No `schedulerTick()`: adicionar deteccao de gap temporal e pular subdivisoes atrasadas em vez de tentar agenda-las todas
- Limitar o while loop a no maximo ~8 subdivisoes por tick para evitar travamento

### Mudancas em `src/pages/Index.tsx`:
- No handler de `visibilitychange`, importar e chamar uma funcao `resyncEngine()` exportada do loop-engine para forcar re-ancoragem do timer

## Arquivos Modificados
1. `src/lib/timer-worker.ts` -- Novo: Web Worker timer inline
2. `src/lib/loop-engine.ts` -- Worker timer + recuperacao de gap temporal
3. `src/pages/Index.tsx` -- Chamar resync ao voltar do background

