
## Causa Raiz Definitiva

O problema está no arquivo `src/pages/Dashboard.tsx`, linha 159:

```typescript
const displayPacks = dbPacks.length > 0
  ? [...dbPacks, ...STATIC_PACKS.filter(sp => !dbPacks.some(dp => dp.name === sp.name))]
  : STATIC_PACKS;
```

Esta linha **combina os packs reais do banco com packs estáticos hardcoded** (`STATIC_PACKS`) que possuem IDs do tipo slug (`'worship-drums-dry'`, `'worship-strings'`, etc.) — não UUIDs. O filtro usa apenas o `name` para deduplicar, então qualquer pack estático cujo nome não coincida exatamente com um pack do banco é adicionado à lista.

O `AdminPackManager` recebe esse `displayPacks` e quando o admin clica em "Adicionar Sons" em um desses packs estáticos mesclados, o `pack.id` enviado para a Edge Function é o slug — causando o erro `invalid input syntax for type uuid: "worship-drums-dry"`.

## O que está acontecendo passo a passo

```text
1. dbPacks = [Worship Strings (a1000001...), Worship Drums Dry (a1000001...), ...]
2. STATIC_PACKS = [worship-strings (slug), worship-drums-dry (slug), worship-snare-dry (slug), ...]
3. Filtro por nome: "Worship Strings" != "Worship Strings" ← case match OK, removido
                    "Worship Drums Dry" != "Worship Kick Dry" ← NOMES DIFERENTES, slug incluído!
4. displayPacks = [...dbPacks, { id: 'worship-drums-dry', name: 'Worship Kick Dry', ... }]
5. Admin clica em "Adicionar Sons" no pack 'Worship Kick Dry'
6. packId = 'worship-drums-dry' → Edge Function → PostgreSQL → ERRO 500
```

O pack estático `'worship-drums-dry'` tem nome `'Worship Kick Dry'` (linha 104) mas o pack no banco tem nome `'Worship Drums Dry'` — nomes diferentes, então o filtro não o remove.

## Solução

### 1. Remover a mistura de STATIC_PACKS no displayPacks do admin

O painel admin (`AdminPackManager`) nunca deve exibir packs estáticos. Ele deve mostrar **apenas** os packs reais do banco.

Criar um `adminPacks` separado que usa somente `dbPacks`:

```typescript
// Para o painel admin: APENAS packs reais do banco
const adminPacks = dbPacks;

// Para a loja (usuários normais): mantém o fallback estático
const displayPacks = dbPacks.length > 0
  ? [...dbPacks, ...STATIC_PACKS.filter(sp => !dbPacks.some(dp => dp.name === sp.name))]
  : STATIC_PACKS;
```

E passar `adminPacks` para o `AdminPackManager` em vez de `displayPacks`.

### 2. Remover os STATIC_PACKS da exibição da loja também (opcional mas recomendado)

Como o banco agora tem todos os packs reais, a lista estática de fallback não serve mais propósito. Packs com `is_available: false` já aparecem na loja para o admin. Simplificar para:

```typescript
const displayPacks = dbPacks;
```

Isso elimina a confusão de vez.

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `src/pages/Dashboard.tsx` | Separar `adminPacks = dbPacks` de `displayPacks`, passar `adminPacks` para `<AdminPackManager>` |

## O que muda após a correção

- O painel admin só mostrará packs reais do banco com UUIDs válidos
- Nunca mais um slug chega na Edge Function via painel admin
- A loja para usuários normais pode manter ou remover o fallback estático — neste plano removemos pois o banco já está completo
- Os packs legados (`a1000001-...`) continuarão funcionando normalmente pois seus IDs passam na validação da Edge Function
