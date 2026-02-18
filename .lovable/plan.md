
## Sincronização automática dos Feature Gates

### Problema atual

O hook `useFeatureGates` usa um cache estático em memória (variáveis `cachedGates` e `cachePromise` fora do componente). Os dados são buscados **uma única vez** no carregamento do app e nunca mais atualizados automaticamente. A função `invalidateGatesCache` existe mas nunca é chamada.

Resultado: alterações feitas no admin só aparecem para o usuário após um reload manual da página.

### Solução: Realtime via banco de dados

Adicionar um listener de **Realtime** do Lovable Cloud na tabela `feature_gates`. Sempre que um admin inserir, atualizar ou deletar um gate, todos os clientes conectados (usuários com o app aberto) recebem a atualização instantaneamente — **sem precisar recarregar a página ou fazer deploy**.

### Fluxo técnico

```text
Admin salva gate no painel
        ↓
UPDATE na tabela feature_gates (banco)
        ↓
Banco emite evento Realtime (INSERT/UPDATE/DELETE)
        ↓
useFeatureGates recebe evento via canal Supabase
        ↓
Invalida cache + refetch dos gates
        ↓
Todos os canAccess() em todos os componentes reagem imediatamente
```

### Arquivos a modificar

**1. `src/hooks/useFeatureGates.ts`**

- Remover o cache estático em memória (que impede atualização)
- Adicionar `useEffect` com `supabase.channel('feature_gates')` para ouvir eventos `postgres_changes` na tabela `feature_gates`
- Quando qualquer evento chegar (`INSERT`, `UPDATE`, `DELETE`), fazer refetch dos gates
- Garantir cleanup do canal ao desmontar

**2. `src/components/AdminPricingManager.tsx`**

- Chamar `invalidateGatesCache()` após salvar, editar ou deletar qualquer gate
- Isso garante que se o próprio admin (que tem o app aberto) alterar um gate, o cache local seja limpo imediatamente antes do Realtime chegar

### O que o admin ganha

- Salva um gate → em segundos todos os usuários com o app aberto veem o bloqueio ativo (ou removido) sem nenhuma ação adicional
- Sem necessidade de deploy ou reload
- Totalmente transparente para o usuário final

### Detalhes técnicos

- A tabela `feature_gates` já tem RLS com `SELECT` público, então o canal Realtime funciona sem autenticação especial
- Será necessário habilitar a tabela `feature_gates` para publicação Realtime via migration SQL (`ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_gates`)
- O refetch após evento Realtime limpa e reconstrói o cache, mantendo consistência entre todas as instâncias do hook no mesmo app
