

## Corrigir Sistema de Usuarios Online (Presence)

### Problema

O tracking de presenca so existe no `Dashboard.tsx`. Isso significa que:

1. Usuarios que estao na pagina principal do app (`/app` - `Index.tsx`) **nao sao rastreados** como online
2. O admin so ve usuarios online se eles estiverem especificamente na pagina `/dashboard`
3. A limpeza do canal usa `channel.unsubscribe()` em vez de `supabase.removeChannel(channel)`, o que pode deixar canais orfaos

### Solucao

Criar um hook dedicado `usePresenceTracker` e usa-lo em **ambas** as paginas protegidas (`Index.tsx` e `Dashboard.tsx`), garantindo que qualquer usuario logado e ativo seja visivel para o admin.

### Arquivos

#### 1. Criar `src/hooks/usePresenceTracker.ts` (novo)

Hook reutilizavel que:
- Recebe o `user_id` do usuario logado
- Conecta ao canal `glory-pads-online` com a key do usuario
- Faz `channel.track()` ao se inscrever
- Faz cleanup correto com `channel.untrack()` + `supabase.removeChannel(channel)`
- Nao faz nada se `user_id` for `undefined` (usuario nao logado)

#### 2. Editar `src/pages/Dashboard.tsx`

- Remover o `useEffect` de presenca (linhas ~135-154) e o `presenceChannelRef`
- Importar e chamar `usePresenceTracker(user?.id)`

#### 3. Editar `src/pages/Index.tsx`

- Importar e chamar `usePresenceTracker(user?.id)` para que usuarios usando o app principal tambem aparecam como online

### Detalhes Tecnicos

```text
usePresenceTracker(userId):
  - Se userId undefined -> nao faz nada
  - Cria canal: supabase.channel('glory-pads-online', { config: { presence: { key: userId } } })
  - subscribe -> track({ user_id: userId, online_at: new Date().toISOString() })
  - cleanup -> untrack() + supabase.removeChannel(channel)
```

O `AdminAnalytics.tsx` permanece inalterado -- ele ja escuta o canal corretamente como observador.

