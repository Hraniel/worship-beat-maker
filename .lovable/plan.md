

# Plano: Mixer preview, Efeitos preview e Exclusão do CEO no Analytics

## 1. Mixer visível mas bloqueado para Free

**Arquivo:** `src/pages/Index.tsx` (3 ocorrências em linhas ~2033, ~2227, ~2363)

Atualmente, quando `showMixerLocked` é true, exibe apenas um botão com cadeado. Mudar para:
- Sempre renderizar o `<MixerStrip>` mas com **interação desabilitada** (pointer-events-none + opacity reduzida)
- Sobrepor um overlay com cadeado + texto clicável que abre o gate

```text
┌─────────────────────────────┐
│  MixerStrip (opacity-50,    │
│  pointer-events-none)       │
│  ┌───────────────────────┐  │
│  │  🔒 Plano Pro         │  │  ← overlay clicável
│  └───────────────────────┘  │
└─────────────────────────────┘
```

## 2. Efeitos dos pads visíveis mas bloqueados para não-Master

**Arquivo:** `src/components/DrumPad.tsx` (linhas ~508-534)

Atualmente, usuários não-Master veem apenas `<LockedMasterRow>`. Mudar para:
- Mostrar o botão "Efeitos" clicável que abre/fecha o `<PadEffectsPanel>`
- O painel fica visível mas com overlay de bloqueio (pointer-events-none + opacity + cadeado)
- Clique no overlay abre o gate de upgrade

## 3. Excluir CEO do Analytics (compras e planos)

**Arquivo:** `src/components/AdminAnalytics.tsx`

- Buscar da tabela `user_roles` os user_ids com role `ceo`
- Filtrar esses IDs das listas de `purchases` e `cancellations` antes de calcular KPIs
- Não altera o edge function `subscription-stats` (o CEO provavelmente não tem assinatura Stripe real, mas caso tenha, filtrar no frontend pelo email)

**Arquivo:** `supabase/functions/subscription-stats/index.ts`

- Buscar o email do CEO da tabela `user_roles` + `auth.users`
- Excluir assinaturas cujo customer email seja do CEO

## Resumo de arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Index.tsx` | Mixer preview com overlay de bloqueio (3 ocorrências) |
| `src/components/DrumPad.tsx` | Efeitos visíveis mas bloqueados para não-Master |
| `src/components/AdminAnalytics.tsx` | Filtrar compras/receita do CEO |
| `supabase/functions/subscription-stats/index.ts` | Filtrar assinaturas do CEO |

