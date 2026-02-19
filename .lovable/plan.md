
## Sistema de Remoção/Restauração de Packs — da Loja e do App

### Problema atual identificado

Existem dois problemas críticos na implementação atual:

**1. RLS bloqueia o UPDATE direto pelo cliente**
A tabela `user_purchases` tem RLS com política apenas para `SELECT` e `INSERT`. O `UPDATE` (usado em `handleToggleRemove` e `handleRestoreFree` nos componentes) é bloqueado pelo banco de dados. As atualizações no campo `removed` falham silenciosamente.

**2. StoreImportPicker não filtra packs removidos**
O seletor de importação de sons dentro do app (menu de contexto dos pads) busca todos os packs comprados **sem filtrar** `removed = true`. Isso significa que mesmo após remover um pack da biblioteca, os sons dele ainda aparecem disponíveis para importação no app.

---

### Solução

#### Parte 1 — Corrigir o UPDATE via Edge Function

Em vez de chamar `supabase.from('user_purchases').update(...)` diretamente no cliente (bloqueado pelo RLS), criar uma Edge Function `toggle-pack-library` que usa a **service role** para fazer o update com segurança, validando que o usuário é dono da compra.

**Nova Edge Function: `toggle-pack-library`**
- Recebe: `{ packId, removed: boolean }`
- Valida o JWT do usuário
- Verifica que o usuário possui o pack em `user_purchases`
- Atualiza o campo `removed` usando a service role key
- Retorna `{ success: true }`

#### Parte 2 — Filtrar packs removidos no StoreImportPicker

Alterar `src/components/StoreImportPicker.tsx` para buscar compras com `removed = eq(false)`:

```typescript
// Antes:
const { data: purchases } = await supabase
  .from('user_purchases')
  .select('pack_id')
  .eq('user_id', user.id);

// Depois:
const { data: purchases } = await supabase
  .from('user_purchases')
  .select('pack_id')
  .eq('user_id', user.id)
  .eq('removed', false);  // <- filtro adicionado
```

#### Parte 3 — Atualizar PackDetail e PackCard para usar a Edge Function

Substituir as chamadas diretas de `supabase.update` pelo `invokeWithToken('toggle-pack-library', ...)` em:
- `src/pages/PackDetail.tsx` (funções `handleToggleRemove` e `handleRestoreFree`)
- `src/components/PackCard.tsx` (botão "Incluir Grátis")

---

### Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/toggle-pack-library/index.ts` | Nova Edge Function (criação) |
| `src/pages/PackDetail.tsx` | `handleToggleRemove` e `handleRestoreFree` passam a usar a Edge Function |
| `src/components/PackCard.tsx` | Restauração também usa Edge Function |
| `src/components/StoreImportPicker.tsx` | Filtra `.eq('removed', false)` na busca de compras |

---

### Fluxo completo após a implementação

```text
Usuário clica "Remover da biblioteca"
  → invokeWithToken('toggle-pack-library', { packId, removed: true })
    → Edge Function valida JWT + posse do pack
    → UPDATE user_purchases SET removed = true (service role)
  → refetch() atualiza o estado local
  → Pack some da loja como "adquirido"
  → Pack desaparece do StoreImportPicker no app

Usuário clica "Incluir Grátis"  
  → invokeWithToken('toggle-pack-library', { packId, removed: false })
  → Pack volta como "adquirido" na loja
  → Sons voltam a aparecer no StoreImportPicker
```

---

### Fluxo de segurança

A Edge Function usa `SUPABASE_SERVICE_ROLE_KEY` para fazer o UPDATE, mas valida:
1. Token JWT presente e válido
2. Registro `user_purchases` com `user_id = auth_user_id` existe para o `packId`

Isso garante que nenhum usuário pode alterar compras de outro usuário.
