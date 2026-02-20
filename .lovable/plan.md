

# Correção: Cache por Usuário não funciona em tempo real

## Problema

Quando o admin clica "Forçar" para um usuário específico, duas coisas podem acontecer:

1. Se a chave `user_cache_version_{userId}` **nunca foi criada** no banco, o admin faz um `INSERT`. Porém, o listener Realtime no App.tsx escuta apenas eventos de `UPDATE`, ignorando o `INSERT`.
2. Mesmo no cenário de `UPDATE`, o guard do usuário tem uma verificação `local !== null` que pode bloquear o reload se o localStorage ainda não foi inicializado.

## Solução

### 1. `src/App.tsx` -- Escutar INSERT e UPDATE

Alterar ambos os guards (global e per-user) para escutar `event: '*'` em vez de `event: 'UPDATE'`, capturando tanto INSERT quanto UPDATE.

Remover a verificação `local !== null` do listener Realtime para que o reload aconteça mesmo se o localStorage ainda não tem valor.

### 2. `src/components/AdminCacheManager.tsx` -- Usar upsert

Substituir a lógica de "check if exists then insert/update" por um único `upsert` tanto no cache global quanto no per-user. Isso simplifica o código e garante que sempre gera um evento consistente.

Para que o `upsert` funcione na `landing_config` usando `config_key`, precisa existir uma constraint unique nessa coluna.

### 3. Migration SQL -- Unique constraint em config_key

```sql
ALTER TABLE public.landing_config 
ADD CONSTRAINT landing_config_config_key_unique UNIQUE (config_key);
```

## Resumo das mudancas

| Arquivo | Mudanca |
|---|---|
| Migration SQL | Adiciona unique constraint em `config_key` |
| `src/App.tsx` | Guards escutam `event: '*'` e removem check `local !== null` no Realtime |
| `src/components/AdminCacheManager.tsx` | Substituir insert/update por `upsert` com `onConflict: 'config_key'` |

