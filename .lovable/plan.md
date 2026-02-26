
# Melhorar Persistencia de Audio em Segundo Plano

## Problema
Quando o app e minimizado no celular (especialmente iOS), o sistema operacional suspende o `AudioContext` e o `setInterval` do loop engine para de funcionar, cortando o audio dos loops, metronomo e pads.

## Causa Raiz
- iOS Safari suspende agressivamente `setInterval`/`setTimeout` em background
- O `AudioContext` e suspenso pelo OS quando a tab perde foco
- O keep-alive atual (silent WAV + watchdog de 3s) nao e suficiente para iOS

## Solucao

### 1. Web Locks API para evitar suspensao da pagina
Usar `navigator.locks.request()` com uma promise que nunca resolve. Isso sinaliza ao browser que a pagina esta realizando trabalho critico e nao deve ser congelada.

**Arquivo:** `src/lib/audio-engine.ts`

### 2. Watchdog mais agressivo (1s em vez de 3s)
Reduzir o intervalo do watchdog de 3000ms para 1000ms para reagir mais rapido quando o AudioContext e suspenso.

**Arquivo:** `src/lib/audio-engine.ts`

### 3. Oscillator keep-alive via Web Audio
Adicionar um oscillator silencioso conectado diretamente ao `AudioContext.destination` (volume quase zero), que mantem o grafo de audio ativo mesmo quando o HTMLAudioElement e pausado pelo OS.

**Arquivo:** `src/lib/audio-engine.ts`

### 4. Recuperacao robusta no visibilitychange
Quando o app volta ao foco, alem de `resume()`, reconectar o oscillator keep-alive caso tenha sido desconectado e forcar re-play do HTMLAudioElement.

**Arquivo:** `src/pages/Index.tsx`

## Detalhes Tecnicos

```text
+----------------------------------+
|  startBackgroundKeepAlive()      |
|                                  |
|  1. HTMLAudioElement (10s WAV)   |
|  2. Web Audio oscillator (DC)   |
|  3. Media Session metadata      |
|  4. Web Locks API               |
|  5. Watchdog interval (1s)      |
+----------------------------------+
```

### Mudancas em `audio-engine.ts`:
- Adicionar oscillator keep-alive (frequencia 0Hz ou ganho 0.0001) ao `startBackgroundKeepAlive()`
- Adicionar `navigator.locks.request('audio-keep-alive', ...)` para prevenir freeze
- Reduzir watchdog para 1000ms
- No watchdog, verificar tambem o oscillator keep-alive

### Mudancas em `Index.tsx`:
- Na recuperacao de visibilidade, chamar `stopBackgroundKeepAlive()` seguido de `startBackgroundKeepAlive()` para forcar reset completo dos mecanismos

## Arquivos Modificados
1. `src/lib/audio-engine.ts` - Mecanismos de keep-alive aprimorados
2. `src/pages/Index.tsx` - Reset do keep-alive ao voltar do background
