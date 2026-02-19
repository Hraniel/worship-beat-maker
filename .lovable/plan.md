
## Três Correções Independentes

---

### Bug 1 — Link compartilhado: erro em outros dispositivos e lista vazia em eventos

**Causa:** Dois problemas separados:

**1a. Lista de músicas vazia no mesmo navegador:** O `get-shared-setlist` edge function, ao encontrar um evento, carrega as músicas do campo `songs_data` do próprio evento — correto. Mas a página `SharedSetlist.tsx` lê `data.setlist.songs`, e a edge function retorna o campo como `songs` (linha `songs,`). Isso está certo. O real problema é que a condição `songs_data` pode estar sendo enviada como objeto vazio `[]` para o evento se nenhuma música foi adicionada via `songs_data` — ou o campo `songs` da `setlists` vinculada (via `setlist_id`) é diferente de `songs_data` do evento.

**Investigando melhor:** A edge function faz:
```
songs = (setlistData?.songs as any[]) || [];
```
Ela lê `setlists.songs` (o setlist vinculado), não `songs_data` do próprio evento. Se o evento tem músicas em `songs_data` mas o `setlist_id` aponta para um setlist com songs diferentes (ou vazio), a lista retornada estará errada. O correto seria sempre retornar `songs_data` do evento.

**1b. Erro em outros dispositivos:** A edge function precisa de autenticação para ser chamada? Não — ela usa `SUPABASE_SERVICE_ROLE_KEY` internamente. O problema é o CORS: o header `Access-Control-Allow-Origin: *` existe. O provável problema é que em outros dispositivos o `VITE_SUPABASE_PROJECT_ID` não está definido (env vars de desenvolvimento não ficam disponíveis em produção sem prefixo `VITE_`). Mas como está em `.env` com prefixo `VITE_`, deveria funcionar.

**Causa real confirmada:** O edge function retorna `songs` baseando-se no `setlists.songs` vinculado (via `setlist_id`), não em `songs_data` do evento. Se o evento tem músicas em `songs_data` mas o setlist vinculado é diferente, a lista estará errada. **A correção é retornar `songs_data` do evento diretamente**, sem buscar o setlist vinculado:

```typescript
// ATUAL (errado para eventos):
if (eventData.setlist_id) {
  // busca setlists.songs — mas o usuário edita songs_data no evento
}

// CORRETO:
songs = eventData.songs_data || []; // songs_data está no próprio evento
```

**Arquivos afetados:**
- `supabase/functions/get-shared-setlist/index.ts` — retornar `songs_data` do evento em vez de buscar setlist vinculado

---

### Bug 2 — Usuário free: voltar de /pricing deve restaurar a música selecionada

**Causa:** O `UpgradeGateModal` navega para `/pricing` ao clicar "Ver planos", mas **não salva o `currentSongId` no `sessionStorage`** antes de navegar. O mecanismo de restauração já existe em `Index.tsx` (linhas 151–155):
```typescript
const restoredSongId = sessionStorage.getItem('restore-song-id');
if (restoredSongId) {
  sessionStorage.removeItem('restore-song-id');
  setCurrentSongId(restoredSongId);
}
```

Mas ninguém define `sessionStorage.setItem('restore-song-id', currentSongId)` antes de navegar.

**Solução:** No `UpgradeGateModal`, quando o botão "Ver planos" é clicado, salvar o `currentSongId` no sessionStorage. Como o modal não tem acesso direto ao `currentSongId`, há duas abordagens:

**Abordagem escolhida (mais simples):** Passar `currentSongId` como prop opcional para `UpgradeGateModal` e salvar no `sessionStorage` no `onClick` do botão "Ver planos":

```typescript
// UpgradeGateModal recebe currentSongId opcional
onClick={() => {
  if (currentSongId) {
    sessionStorage.setItem('restore-song-id', currentSongId);
  }
  onClose();
  navigate('/pricing');
}}
```

No `Index.tsx`, onde `UpgradeGateModal` é renderizado, passar `currentSongId`:
```tsx
<UpgradeGateModal
  payload={upgradeGate}
  onClose={() => setUpgradeGate(null)}
  currentSongId={currentSongId}
/>
```

**Arquivos afetados:**
- `src/components/UpgradeGateModal.tsx` — adicionar prop `currentSongId?` e salvar no sessionStorage antes de navegar
- `src/pages/Index.tsx` — passar `currentSongId` para `UpgradeGateModal`

---

### Bug 3 — Banner "Criar música" usa `prompt()` em vez de abrir o repertório

**Causa:** Na linha 988–991 de `Index.tsx`, o banner "Crie uma música para começar" usa `window.prompt()` para capturar o nome:
```tsx
onClick={() => {
  const name = prompt('Nome da música:');
  if (name?.trim()) handleSaveSong(name.trim());
}}
```

Isso é um popup nativo do browser que:
- Não funciona bem em PWA/mobile
- Não abre a aba repertório como esperado pelo usuário
- Não permite cancelar elegantemente

**Solução:** Substituir o botão "Criar" do banner por um que abre o `SetlistManager` (aba repertório). O `SetlistManager` já tem um sheet com input de nome. Para isso, precisamos de um estado controlável no `SetlistManager` para abri-lo externamente.

**Abordagem:**
1. Adicionar prop `forceOpen?: boolean` ao `SetlistManager` que controla `open` externamente
2. No banner do Index, em vez do botão "Criar" com `prompt()`, renderizar um `SetlistManager` diretamente (ou reutilizar o existente)

**Abordagem mais limpa:** Extrair o controle de `open` do `SetlistManager` para ser controlável pela prop. Adicionar um estado `setlistOpenFromBanner` no `Index.tsx`, e no banner mostrar um `SetlistManager` com `forceOpen={true}` quando clicado.

Na prática, a solução mais simples é: o banner com `songs.length === 0` já renderiza um `SetlistManager` (linha 998–1008) quando há músicas. Quando não há músicas, mostrar o botão "Criar" que simplesmente abre o `SetlistManager` passando `forceOpen`:

```tsx
// Estado no Index
const [openSetlistFromBanner, setOpenSetlistFromBanner] = useState(false);

// No banner, quando songs.length === 0:
<Button onClick={() => setOpenSetlistFromBanner(true)}>
  <Plus /> Criar
</Button>
<SetlistManager
  forceOpen={openSetlistFromBanner}
  onOpenChange={() => setOpenSetlistFromBanner(false)}
  ... 
/>

// No SetlistManager, controlar open:
// Se forceOpen === true, abrir o sheet
useEffect(() => {
  if (forceOpen) setOpen(true);
}, [forceOpen]);
```

**Arquivos afetados:**
- `src/components/SetlistManager.tsx` — adicionar props `forceOpen?` e `onOpenChange?`; usar `useEffect` para abrir quando `forceOpen` muda
- `src/pages/Index.tsx` — adicionar estado `openSetlistFromBanner`, substituir o `prompt()` por `setOpenSetlistFromBanner(true)`, renderizar um `SetlistManager` invisível (sem trigger) quando `songs.length === 0`

---

## Resumo dos Arquivos a Modificar

| Arquivo | Bugs corrigidos |
|---|---|
| `supabase/functions/get-shared-setlist/index.ts` | Bug 1: retornar `songs_data` do evento |
| `src/components/UpgradeGateModal.tsx` | Bug 2: salvar `currentSongId` no sessionStorage |
| `src/pages/Index.tsx` | Bugs 2 e 3: passar `currentSongId` ao modal; abrir SetlistManager no banner |
| `src/components/SetlistManager.tsx` | Bug 3: suporte a `forceOpen` prop |
