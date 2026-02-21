

# Corrigir popup de Modo Silencioso -- disparar ao tocar um pad

## Problema

O detector de modo silencioso cria um **novo AudioContext** para testar, mas no iOS esse novo contexto fica "suspended" ate uma interacao do usuario -- so que a interacao acontece no contexto principal do app, nao nesse de teste. Resultado: o check sempre encontra `ctx.state === "suspended"` e retorna sem verificar nada.

Alem disso, o hook roda em timer automatico (2s + a cada 5s), mas o comportamento pedido e que o popup apareca **ao tocar em um pad**.

## Solucao

1. Mudar o hook para expor uma funcao `triggerCheck()` que pode ser chamada sob demanda
2. Usar o AudioContext **do app** (via `getAudioContext()`) em vez de criar um novo -- assim ele ja esta desbloqueado apos o toque no pad
3. Chamar `triggerCheck()` dentro do `DrumPad` apos o usuario tocar em um pad
4. Remover os timers automaticos (ou mante-los como fallback secundario, mas o gatilho principal sera o toque no pad)

## Alteracoes

### 1. `src/hooks/useSilentModeDetector.ts`

- Importar `getAudioContext` de `@/lib/audio-engine`
- Em `checkSilentMode`: usar o AudioContext do app em vez de criar um novo. Remover o early return de `ctx.state === "suspended"` (o contexto do app ja estara ativo)
- Expor `triggerCheck` no retorno do hook para chamada externa
- Manter intervalo periodico como fallback mas com delay inicial maior (5s)

### 2. `src/components/DrumPad.tsx`

- Receber uma nova prop opcional `onPadPlayed?: () => void`
- Chamar `onPadPlayed()` dentro da funcao `fireSound` (apos o som ser disparado, garantindo que o AudioContext esta ativo)

### 3. `src/components/PadGrid.tsx`

- Receber `onPadPlayed?: () => void` e repassa-la para cada `DrumPad`

### 4. `src/pages/Index.tsx`

- Extrair `triggerCheck` do hook `useSilentModeDetector`
- Passar `triggerCheck` como `onPadPlayed` para o `PadGrid`

## Detalhes tecnicos

```text
Fluxo:
  Usuario toca pad
    -> DrumPad.fireSound()
    -> playSound() (AudioContext ativo)
    -> onPadPlayed() chamado
    -> triggerCheck()
    -> Usa getAudioContext() do app (ja desbloqueado)
    -> AnalyserNode mede output real
    -> sum === 0 ? mostra banner : nao mostra
```

A chave da correcao e usar o AudioContext compartilhado do app (`getAudioContext()`) que ja esta `running` apos o toque, em vez de criar um novo que sempre estara `suspended`.
