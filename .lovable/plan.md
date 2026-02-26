

# Loops Nativas via Web Audio (Sem Dependencia de Timers JS)

## Problema Real
O iOS Safari **suspende toda execucao de JavaScript** (incluindo Web Workers) apos ~30 segundos em background. Nenhum truque de keep-alive (Web Locks, oscillator silencioso, silent WAV) resolve isso porque o problema nao e o AudioContext sendo suspenso — e o **timer JS que agenda os sons** que para de funcionar.

A abordagem atual depende de um timer (setInterval no Worker) que acorda a cada 25ms para agendar subdivisoes. Quando o iOS congela o JS, nenhuma subdivisao e agendada = silencio.

## Solucao: Pre-renderizar Loops como AudioBuffers Nativos

A Web Audio API suporta `AudioBufferSourceNode.loop = true`, que **funciona no nivel do OS** sem precisar de JavaScript. Uma vez que o buffer comeca a tocar em loop, ele continua tocando mesmo com JS congelado.

### Como funciona:

```text
ANTES (timer-dependente):
  Timer JS (25ms) --> scheduleSubdivision() --> playKick/playSnare...
  [iOS congela JS] --> silencio

DEPOIS (nativo):
  Pre-render loop inteiro num AudioBuffer
  --> AudioBufferSourceNode.loop = true
  --> Web Audio toca nativamente (sem JS)
  [iOS congela JS] --> audio continua!
```

### Implementacao:

#### 1. Nova funcao `renderLoopToBuffer()` em `audio-engine.ts`
- Usa `OfflineAudioContext` para renderizar o padrao de loop (kick, snare, etc.) em um unico AudioBuffer
- Para loops com `loopSteps`, renderiza cada hit sintetizado na posicao correta do buffer
- Para loops com custom buffer (audio importado), retorna o buffer existente diretamente
- Duracao do buffer = (60/BPM) * beatsPerBar * loopBars

#### 2. Mudancas em `loop-engine.ts`
- Quando um loop e adicionado, chamar `renderLoopToBuffer()` para pre-renderizar
- Tocar o buffer resultante com `source.loop = true` e `source.loopEnd` configurado
- Manter o timer existente apenas para o **metronomo** e **visual feedback** (indicador de beat)
- Quando o loop e removido, parar o source node
- Quando BPM muda, re-renderizar e reiniciar os buffers

#### 3. Volume dinamico via GainNode
- Cada loop nativo tem seu proprio GainNode
- `updateLoopVolume()` ajusta o gain em tempo real sem precisar re-renderizar

### Limitacoes e trade-offs:
- Mudar BPM requer re-renderizar os buffers (pequeno gap de ~50ms)
- O metronomo continua dependente do timer (aceitavel — e so feedback visual/sonoro auxiliar)
- Loops sintetizados (kick+snare patterns) precisam de OfflineAudioContext para renderizar

## Detalhes Tecnicos

### Novo em `audio-engine.ts`:
```typescript
// Renderiza um padrao de loop inteiro em um AudioBuffer
export async function renderLoopToBuffer(
  loopSteps: [number, string][],
  bpm: number,
  beatsPerBar: number,
  loopBars: number,
  volume: number
): Promise<AudioBuffer>
```

### Mudancas em `loop-engine.ts`:
- `addLoop()`: chama renderLoopToBuffer() e inicia AudioBufferSourceNode com loop=true
- `removeLoop()`: para o source node nativo
- `setLoopBpm()`: re-renderiza todos os loops ativos
- Novo Map `nativeLoopSources` para rastrear os source nodes nativos
- Novo Map `nativeLoopGains` para controle de volume em tempo real

### `Index.tsx`:
- Sem mudancas necessarias (a visibilitychange recovery continua como fallback)

## Arquivos Modificados
1. `src/lib/audio-engine.ts` — Nova funcao `renderLoopToBuffer()` usando OfflineAudioContext
2. `src/lib/loop-engine.ts` — Loops tocam via AudioBufferSourceNode.loop=true (nativo, sem timer)

