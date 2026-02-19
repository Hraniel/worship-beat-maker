

## Ajustar sons do Kick e Snare nos loops

### Problemas identificados

1. **Kick com muito reverb**: O decay atual e 0.8s com duracao de 1200ms - isso cria uma cauda muito longa que soa como reverb excessivo.
2. **Snare "xiando"**: O parametro `noise: 0.7` (70% ruido branco) combinado com decay de 0.5s gera muito chiado. A frequencia de 200Hz tambem e baixa demais para uma caixa, contribuindo para o som pouco definido.

### Ajustes propostos

**Kick** - reduzir reverb, manter corpo:
- `decay`: 0.8 → **0.3** (cauda bem mais curta)
- `durationMs`: 1200 → **600** (cortar o arquivo mais cedo)
- Manter `freq: 50` e `punch: 0.9` (o ataque e corpo continuam bons)

**Snare** - reduzir chiado, mais estalo:
- `noise`: 0.7 → **0.4** (menos ruido branco, menos chiado)
- `freq`: 200 → **280** (frequencia mais alta = mais "crack")
- `decay`: 0.5 → **0.2** (cauda mais curta e seca)
- `durationMs`: 800 → **400** (cortar mais cedo)

### Alteracoes no codigo

Arquivo: `supabase/functions/generate-loop-sounds/index.ts`

Linha 34 (renderKick):
```typescript
// Antes
return synthHit({ freq: 50, decay: 0.8, punch: 0.9 }, 1200, sampleRate);
// Depois
return synthHit({ freq: 50, decay: 0.3, punch: 0.9 }, 600, sampleRate);
```

Linha 38 (renderSnare):
```typescript
// Antes
return synthHit({ freq: 200, decay: 0.5, noise: 0.7 }, 800, sampleRate);
// Depois
return synthHit({ freq: 280, decay: 0.2, noise: 0.4 }, 400, sampleRate);
```

### Proximo passo

Apos o ajuste, re-deploy da function e executar novamente para gerar os novos loops com os sons corrigidos.

