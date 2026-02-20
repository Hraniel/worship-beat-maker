

# Correção: Plano gratuito concedido pelo admin não é reconhecido

## Problema

A Edge Function `check-subscription` verifica **apenas o Stripe** para determinar o plano do usuário. A tabela `granted_tiers` (onde o admin salva os planos concedidos gratuitamente) nunca é consultada. Resultado: o usuário continua aparecendo como "Free" mesmo após receber o plano Pro/Master.

## Solução

Modificar a Edge Function `check-subscription` para consultar a tabela `granted_tiers` **antes** de consultar o Stripe. Se o usuário tiver um plano concedido (e ele não estiver expirado), retornar esse plano diretamente sem precisar ir ao Stripe.

## Detalhes Tecnicos

### Arquivo: `supabase/functions/check-subscription/index.ts`

Apos autenticar o usuario (linha ~61), adicionar uma consulta a `granted_tiers`:

```
1. Buscar na tabela granted_tiers WHERE user_id = userId
2. Se encontrar um registro:
   a. Verificar se expires_at e null (permanente) ou > now()
   b. Se valido, mapear tier ("pro"/"master") para o product_id correspondente usando TIERS
   c. Retornar { subscribed: true, product_id, subscription_end: expires_at }
3. Se nao encontrar ou estiver expirado, continuar com a logica do Stripe normalmente
```

Isso garante que:
- Planos concedidos pelo admin tem **prioridade** sobre o Stripe
- Planos com data de expiracao sao respeitados
- Se nao houver concessao, o fluxo Stripe continua normalmente

### Mapeamento tier -> product_id

Usar os mesmos IDs definidos em `src/lib/tiers.ts`:
- `pro` -> `prod_Tz7nOBkWdUxb9Q`
- `master` -> `prod_Tz7oenwSZLQFdS`

### Resumo

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/check-subscription/index.ts` | Consultar `granted_tiers` antes do Stripe; retornar plano concedido se valido |

Nenhuma migration SQL necessaria -- a tabela `granted_tiers` ja existe com as politicas RLS corretas.

