

# Trial de 3 dias + Banner de upgrade para usuários Free

## O que será feito

### 1. Adicionar trial de 3 dias no checkout Stripe
Modificar `supabase/functions/create-checkout/index.ts` para incluir `subscription_data.trial_period_days: 3` na criação da sessão de checkout. Isso faz com que o Stripe inicie a assinatura com 3 dias grátis automaticamente — sem cobrança imediata.

### 2. Mostrar informação de trial na página de preços
Atualizar `src/pages/Pricing.tsx` para exibir "3 dias grátis" abaixo do preço dos planos Pro e Master.

### 3. Banner popup já existe (UpgradeGateModal)
O `UpgradeGateModal` já está implementado e funciona quando o usuário clica em funcionalidades bloqueadas. Ele mostra o plano necessário e redireciona para a página de preços. Esse componente já é usado em `Index.tsx`, `AmbientPads.tsx` e `Metronome.tsx`.

Nenhuma mudança necessária no modal — ele já faz exatamente o que foi pedido.

## Arquivos a modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/create-checkout/index.ts` | Adicionar `trial_period_days: 3` no `subscription_data` |
| `src/pages/Pricing.tsx` | Exibir badge "3 dias grátis" nos planos pagos |
| `src/components/UpgradeGateModal.tsx` | Adicionar menção ao trial de 3 dias no texto do modal |

## Detalhes técnicos

No `create-checkout`, a mudança é mínima:
```typescript
const session = await stripe.checkout.sessions.create({
  // ... existing config
  subscription_data: {
    trial_period_days: 3,
  },
});
```

O Stripe cuida de todo o resto: não cobra durante o trial, envia e-mail antes de cobrar, e converte automaticamente após 3 dias.

