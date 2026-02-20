

# Forcar Atualizacao Imediata (Realtime) -- Plano

## Problema Atual

O sistema de cache (global e por usuario) **so verifica na montagem do componente** (`useEffect` com `[]`). Isso significa:

- Se o admin clica "Forcar Atualizacao" enquanto o usuario esta com o app aberto, **nada acontece**
- O usuario so recebe a atualizacao quando **fecha e reabre** o app
- A tabela `landing_config` **nao tem Realtime habilitado**, entao nao ha como "empurrar" a mudanca para clientes conectados

## Solucao

Habilitar Supabase Realtime na tabela `landing_config` e adicionar listeners nos guards do `App.tsx` para reagir instantaneamente a mudancas de cache.

O admin tera duas opcoes no painel:
1. **Na proxima visita** (comportamento atual, mantido)
2. **Imediato** (novo) -- forca o reload enquanto o usuario esta com o app aberto

## Detalhes Tecnicos

### 1. Migration SQL -- Habilitar Realtime na `landing_config`

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.landing_config;
```

### 2. Arquivo: `src/App.tsx` -- Adicionar Realtime nos Guards

**CacheVersionGuard**: Alem da checagem inicial (mantida), assinar um canal Realtime que escuta `UPDATE` na `landing_config` filtrado por `config_key = 'app_cache_version'`. Quando receber uma mudanca, comparar com o valor local e executar `window.location.reload()` se diferente.

**UserCacheVersionGuard**: Mesmo principio, mas filtrado por `config_key = 'user_cache_version_{userId}'`. Ao receber mudanca via Realtime, recarregar imediatamente.

Ambos os canais serao limpos no cleanup do `useEffect`.

### 3. Arquivo: `src/components/AdminCacheManager.tsx` -- Botao "Imediato"

Adicionar na UI do admin a opcao de "Forcar Agora" com indicacao visual de que o reload sera instantaneo (vs. "na proxima visita"). Na pratica, o mecanismo e o mesmo (atualizar a `config_value` no banco), pois com Realtime habilitado a mudanca ja chega imediatamente. A diferenca e apenas de UX -- o admin vera uma mensagem confirmando que usuarios conectados serao recarregados **agora**.

Atualizar as mensagens de feedback:
- Botao global: "Todos os usuarios conectados serao recarregados agora"
- Botao por usuario: "O app de {email} sera recarregado agora"

### Resumo das Mudancas

| Arquivo | O que muda |
|---|---|
| Migration SQL | Adiciona `landing_config` ao Realtime |
| `src/App.tsx` | Guards assinam canal Realtime para reagir em tempo real |
| `src/components/AdminCacheManager.tsx` | Atualiza textos/UX para refletir que a atualizacao e imediata |

