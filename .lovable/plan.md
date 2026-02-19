
## Objetivo

Adicionar verificação de conectividade ao sistema de "soft reload" para que:
- **Com internet:** comportamento atual — tela de carregamento aparece, cache é limpo, loja é atualizada
- **Sem internet:** tela de carregamento NÃO aparece, o cache é preservado, o usuário usa o app offline normalmente

---

## Como detectar a conectividade

O browser expõe `navigator.onLine` (booleano síncrono) que indica se o dispositivo tem uma rota de rede ativa. Para maior confiabilidade, também pode-se tentar uma requisição real. Para este caso, `navigator.onLine` é suficiente porque:
- Quando o usuário volta ao app (visibilitychange), já há um valor atualizado
- Se `navigator.onLine === false`, o dispositivo definitivamente não tem internet
- Falso-positivo (navigator.onLine = true mas sem internet real) é raro e tem impacto baixo — o cache seria limpo e o fetch falharia graciosamente sem quebrar nada

---

## Mudanças necessárias

### 1. `src/hooks/useAppReloadGuard.ts`

Adicionar verificação de `navigator.onLine` **antes** de setar `showLoading = true`, nos dois lugares onde isso acontece:

**No `useEffect` de montagem inicial (usuario retorna depois de fechar o navegador):**
```typescript
if (lastActive > 0 && elapsed >= AWAY_THRESHOLD_MS) {
  // Só mostra a tela de carregamento se houver internet
  if (navigator.onLine) {
    setShowLoading(true);
  }
  // Se offline: silenciosamente ignora — cache preservado
}
```

**No `handleVisibilityChange` (usuario sai e volta para o app):**
```typescript
} else if (document.visibilityState === 'visible') {
  const stored = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) ?? '0', 10);
  const away = Date.now() - stored;
  if (stored > 0 && away >= AWAY_THRESHOLD_MS) {
    // Só dispara se houver internet
    if (navigator.onLine) {
      setShowLoading(true);
    }
    // Se offline: ignora — cache mantido para uso offline
  }
}
```

### 2. `src/components/AppLoadingScreen.tsx`

A limpeza de cache dentro do `AppLoadingScreen` já está protegida pelo fato de que o componente **só é renderizado quando `showLoading = true`**, e esse estado só será `true` quando `navigator.onLine` for verdadeiro após a mudança. Portanto, **não precisa de alteração** — a lógica já funciona corretamente em cascata.

---

## Fluxo completo após a mudança

```text
Usuário sai do app por 2+ minutos → visibilitychange → 'visible'
  │
  ├─ navigator.onLine === true (tem internet)
  │    └─ setShowLoading(true)
  │         └─ AppLoadingScreen aparece
  │              └─ caches.keys() → delete todos os caches SW
  │              └─ label: "Limpando cache... → Preparando app... → Pronto!"
  │              └─ onDone() → dismiss() → store e app recarregam com dados frescos
  │
  └─ navigator.onLine === false (sem internet)
       └─ showLoading permanece false
            └─ App continua normalmente com cache existente
            └─ Usuário usa o app offline sem interrupção
```

---

## Arquivo a modificar

| Arquivo | Mudança |
|---|---|
| `src/hooks/useAppReloadGuard.ts` | Adicionar `if (navigator.onLine)` antes de cada `setShowLoading(true)` |

Apenas 2 linhas adicionadas (uma para cada ponto de disparo), sem alterar nenhuma outra lógica.
