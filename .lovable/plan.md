
## Causa do Problema

O frontend em `AdminPackManager.tsx` tem uma validação rígida de UUID antes de chamar a Edge Function de exclusão:

```typescript
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(pack.id)) {
  toast.error(`Este pack tem um ID legado... Delete-o manualmente.`);
  return; // bloqueia a exclusão
}
```

Os packs "legados" no banco de dados têm IDs no formato `a1000001-0000-0000-0000-000000000001`. Esses IDs são **UUIDs válidos para o PostgreSQL** (todos os caracteres são hexadecimais, no formato correto), mas a regex estrita do frontend os **rejeita** — impedindo desnecessariamente a exclusão pelo painel.

A validação foi adicionada para evitar o erro anterior onde slugs de texto como `worship-drums-dry` chegavam ao banco e causavam erros de sintaxe SQL. Porém, ela é excessivamente restritiva e bloqueia UUIDs que o PostgreSQL aceita perfeitamente.

## Solução

### 1. Remover a validação rígida de UUID do frontend (`AdminPackManager.tsx`)

Retirar o bloco que bloqueia packs com IDs "legados". A Edge Function já tem validação suficiente e usa a service role — ela simplesmente faz `DELETE WHERE id = packId` pelo valor exato do banco.

### 2. Ajustar a validação da Edge Function (`admin-upload-sound/index.ts`)

As ações `delete-pack`, `update-pack`, `remove-banner`, `remove-icon` e `duplicate-pack` usam a regex `/^[0-9a-f-]{36}$/` que verifica apenas comprimento. Essa regex é suficiente para todos os IDs presentes no banco.

Para as ações de exclusão, substituir a regex estrita por uma verificação de comprimento e caracteres hexadecimais mais permissiva que aceita os IDs reais no banco:

```typescript
// Antes (muito restritivo):
!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(packId)

// Depois (aceita todos UUIDs válidos do PostgreSQL):
!/^[0-9a-f-]{36}$/i.test(packId)  // <- já é o que a EF usa, mas o frontend precisa ser alinhado
```

### 3. Melhorar a UX do modal de confirmação

Ao invés do `window.confirm()` nativo, exibir diretamente o toast de confirmação com o nome do pack e a contagem de sons — mantendo o comportamento atual mas sem bloquear os packs legados.

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/components/AdminPackManager.tsx` | Remover o bloco de validação de UUID que exibe a mensagem de "ID legado" e bloqueia a exclusão |
| `supabase/functions/admin-upload-sound/index.ts` | Nenhuma mudança necessária (a Edge Function já aceita os IDs corretamente via `/^[0-9a-f-]{36}$/`) |

## O que acontece após a correção

- Packs com IDs `a1000001-0000-0000-0000-000000000001` poderão ser excluídos normalmente pelo painel
- A Edge Function recebe o ID, faz `DELETE` no banco pelo valor exato, apaga os arquivos de storage e retorna sucesso
- Nenhuma lógica de negócio é alterada — apenas a validação excessivamente rígida do frontend é removida
