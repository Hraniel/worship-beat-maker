
## Objetivo

Fazer com que a Gloria Store atualize automaticamente para todos os usuários quando o admin criar, editar ou excluir um pack — sem necessidade de republicar o app ou recarregar a página manualmente.

## Como funciona atualmente

O `useStorePacks` busca os dados do banco uma única vez quando o componente monta (`useEffect` com `fetchPacks`). Após isso, os dados só se atualizam quando:
- O admin realiza uma ação e `onRefresh()` é chamado (apenas na sessão do admin)
- O usuário navega para outra página e volta
- O usuário recarrega o app

A tabela `store_packs` não tem Realtime habilitado no banco, então mudanças feitas pelo admin não chegam automaticamente para outros usuários.

## Solução

### 1. Habilitar Realtime nas tabelas `store_packs` e `pack_sounds` (migração SQL)

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_packs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pack_sounds;
```

### 2. Adicionar listener Realtime no `useStorePacks`

Adicionar um canal Realtime que escuta qualquer `INSERT`, `UPDATE` ou `DELETE` nas tabelas `store_packs` e `pack_sounds`. Quando um evento chegar, chama `fetchPacks()` automaticamente para todos os clientes conectados.

```typescript
// Dentro do useStorePacks, após o useEffect de fetch inicial:
useEffect(() => {
  const channel = supabase
    .channel('store-packs-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'store_packs' }, () => {
      fetchPacks();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pack_sounds' }, () => {
      fetchPacks();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [fetchPacks]);
```

## Resultado

- Quando o admin **cria um pack novo** → aparece instantaneamente na loja para todos
- Quando o admin **edita nome, preço, disponibilidade** → reflete imediatamente
- Quando o admin **adiciona ou remove um som** → pack atualiza em tempo real
- Quando o admin **exclui um pack** → desaparece da loja imediatamente
- **Não requer republicar o app nem recarregar a página**

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/` | Nova migração habilitando Realtime em `store_packs` e `pack_sounds` |
| `src/hooks/useStorePacks.ts` | Adicionar listener Realtime que chama `fetchPacks()` em qualquer mudança |

## Observação

O comportamento do admin que já funciona (`onRefresh()` após cada ação) é mantido — ele garante atualização imediata mesmo que o Realtime demore alguns milissegundos para disparar.
