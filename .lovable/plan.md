

## Corrigir Conflito de Canal no Sistema de Presenca

### Problema

O sistema de usuarios online parou de funcionar por causa de um **conflito de canal Supabase**. Na pagina `/dashboard`, existem **duas assinaturas simultaneas** ao mesmo canal `glory-pads-online`:

1. `usePresenceTracker(user?.id)` -- rastreia o admin como usuario online
2. `AdminAnalytics` -- se inscreve como `admin-observer` para monitorar

O Supabase **reutiliza instancias de canal pelo nome**. Quando dois hooks tentam criar `supabase.channel('glory-pads-online')` com configs diferentes (um com `key: userId`, outro com `key: 'admin-observer'`), o segundo pode sobrescrever ou conflitar com o primeiro, quebrando o tracking de presenca.

### Solucao

Dar um **nome unico ao canal do observador admin** no `AdminAnalytics.tsx`, separando-o do canal de tracking dos usuarios.

### Arquivos a Editar

#### 1. `src/components/AdminAnalytics.tsx` (linha 144)

Mudar o nome do canal do admin de `glory-pads-online` para `glory-pads-online-observer` (ou qualquer nome diferente). Porem, isso nao funcionaria porque o canal precisa **escutar** a presenca dos outros usuarios no canal original.

**Abordagem correta**: manter o nome do canal como `glory-pads-online`, mas **remover o `usePresenceTracker` da pagina Dashboard** ja que o admin nao precisa aparecer como "online" para si mesmo.

Alternativa melhor: alterar o `usePresenceTracker` para **nao rodar quando o usuario for admin**, ou mover a chamada para fora do componente Dashboard.

### Solucao Final Escolhida

No `Dashboard.tsx`, **condicionar** a chamada do `usePresenceTracker` para nao rodar quando o admin estiver logado (ja que o admin observer ocupa o mesmo canal via `AdminAnalytics`). Isso elimina o conflito.

#### 1. Editar `src/pages/Dashboard.tsx`

- Remover `usePresenceTracker(user?.id)` do Dashboard
- O tracking de presenca do usuario ja esta coberto pelo `Index.tsx` (pagina `/app`)
- No Dashboard, o admin ja esta no canal via `AdminAnalytics` como observador

#### 2. Editar `src/hooks/usePresenceTracker.ts`

- Adicionar um sufixo unico ao nome do canal para evitar conflito caso o mesmo usuario abra multiplas paginas:
  ```text
  supabase.channel(`glory-pads-online:${userId}`, { config: { presence: { key: userId } } })
  ```
  Porem isso quebraria a presenca pois cada usuario estaria em seu proprio canal.

**Melhor solucao**: manter o canal com nome `glory-pads-online` no hook, mas remover a chamada duplicada no Dashboard. O canal do `AdminAnalytics` usa o **mesmo nome** propositalmente para ler o estado de presenca de todos os usuarios.

### Mudancas Finais

#### `src/pages/Dashboard.tsx`
- Remover a linha `usePresenceTracker(user?.id)` (linha 136)
- Remover o import de `usePresenceTracker` (linha 7)
- Usuarios comuns que visitam o Dashboard tambem ficam trackeados pelo `/app` (Index.tsx)

### Por que funciona

- Usuarios ficam online via `usePresenceTracker` no `Index.tsx` (pagina `/app`)
- Admin observa via canal separado no `AdminAnalytics` com key `admin-observer`
- Sem dois hooks competindo pelo mesmo canal na mesma pagina, o conflito desaparece

