

# Corrigir banner de modo silencioso: cooldown + reaparecer ao reativar

## Problemas identificados

1. **Sem cooldown**: A cada toque de pad, a detecao completa roda (cria oscilador, analyser, espera 100ms). Isso e desnecessario e pode impactar performance.
2. **Banner nao reaparece**: Quando o usuario fecha o banner e depois reativa o modo silencioso, o estado `dismissed` nunca e resetado porque `isSilent` nunca chegou a ser `false` (ou a transicao foi perdida entre checks).

## Solucao

### `src/hooks/useSilentModeDetector.ts`

1. **Adicionar cooldown de 5 segundos** no `triggerCheck`: usar um `lastCheckRef` com timestamp. Se a ultima verificacao foi ha menos de 5s, ignorar.

2. **Resetar `dismissed` automaticamente apos 10 segundos**: quando o usuario fecha o banner, em vez de ficar `dismissed` para sempre (ate `isSilent` mudar), agendar um reset apos 10s. Assim, se o dispositivo ainda estiver em modo silencioso no proximo toque apos 10s, o banner reaparece.

3. **Manter o reset quando `isSilent` vira `false`**: isso garante que ao desativar o silencioso e reativar, o banner aparece imediatamente no proximo toque.

### Detalhes tecnicos

```text
Fluxo com cooldown:
  Toque no pad -> triggerCheck()
    -> Verifica lastCheckRef: menos de 5s? -> ignora
    -> Mais de 5s? -> roda deteccao -> atualiza lastCheckRef

Fluxo de dismiss com auto-reset:
  Usuario fecha banner -> dismissed = true
    -> setTimeout(10s) -> dismissed = false
    -> Proximo toque apos cooldown -> deteccao roda novamente
    -> Se ainda silencioso -> banner reaparece
```

Apenas o arquivo `src/hooks/useSilentModeDetector.ts` sera alterado.

