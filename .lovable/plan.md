
# 5 Melhorias: Admin Analytics + Assinaturas + Visual + Cargos + Remover Banner

## Resumo das mudanças

Cinco melhorias independentes, organizadas do mais simples ao mais complexo:

1. **Filtro de data no analytics de packs** — chips de período (Semana / Mês / Ano / Tudo) + gráfico de linha de receita ao longo do tempo
2. **Analytics de assinaturas** — nova aba "Assinaturas" no painel admin mostrando KPIs de planos Pro/Master
3. **Cor do painel admin** — trocar o fundo escuro (#0f0f14) por um tom mais agradável, como slate/indigo escuro
4. **Cargos de administração** — expandir o `AdminUserManager` para suportar "moderator" além de "admin", usando a enum `app_role` já existente
5. **Remover banner** — adicionar botão "Remover banner" com confirmação no painel admin, que seta `banner_url = null` no banco

---

## Detalhes técnicos por feature

### 1. Filtro de data + gráfico de linha no Analytics

**Arquivo:** `src/components/AdminAnalytics.tsx`

O campo `purchased_at` (timestamp with time zone) já existe na tabela `user_purchases`. A mudança é:

- Adicionar estado `period: 'week' | 'month' | 'year' | 'all'` com chips de seleção no topo
- Filtrar as compras client-side por `purchased_at >= startDate` conforme o período selecionado
- Adicionar gráfico de **linha** (LineChart do Recharts) mostrando receita acumulada por dia/semana abaixo dos KPIs existentes
- O gráfico de barras de "Compras por Pack" existente permanece, mas passa a respeitar o filtro de período
- A query ao banco busca `purchased_at` além de `pack_id, user_id`:
  ```typescript
  supabase.from('user_purchases').select('pack_id, user_id, purchased_at')
  ```
- Lógica de agrupamento por dia para o gráfico de linha (format: `dd/MM`)
- Nenhuma migração necessária

### 2. Analytics de Assinaturas

**Arquivo:** `src/components/AdminAnalytics.tsx` (nova seção) ou uma aba separada

Como o Stripe não é consultável diretamente do frontend sem a Service Role Key, a solução é criar uma nova edge function leve `subscription-stats` que:
- Usa a Stripe API para buscar contagem de assinaturas ativas por produto
- Retorna: `{ pro_count, master_count, total_mrr }`

**Arquivo novo:** `supabase/functions/subscription-stats/index.ts`
- Checa se o chamador é admin via `user_roles`
- Chama `stripe.subscriptions.list({ status: 'active', limit: 100 })`
- Agrupa por `product_id` (comparando com `TIERS.pro.product_id` e `TIERS.master.product_id`)
- Retorna contagens e MRR estimado

**No frontend:** nova seção "Assinaturas" dentro de `AdminAnalytics.tsx` com:
- Card "Pro Ativos", Card "Master Ativos", Card "MRR Estimado"
- Mini gráfico de pizza (PieChart do Recharts) mostrando distribuição Free/Pro/Master estimada

### 3. Cor do painel admin

O painel admin é renderizado dentro de `src/pages/Dashboard.tsx`. O fundo atual vem do CSS global `--background: 240 10% 6%` (quase preto).

A mudança é adicionar uma classe de override para a seção admin, usando um tom de **slate-900/indigo-950** mais suave e com sutil gradiente:

**Arquivo:** `src/pages/Dashboard.tsx`
- Adicionar `className` com `bg-gradient-to-b from-slate-900 to-indigo-950/30` no container do painel admin
- Também adicionar uma borda sutil colorida no topo: `border-t-2 border-indigo-500/30`
- O cabeçalho "Painel Admin" ganha um leve ícone com gradiente de texto

**Arquivo:** `src/components/AdminPackManager.tsx`
- O header do painel recebe `bg-gradient-to-r from-indigo-950/50 to-violet-950/30 rounded-xl p-3`

### 4. Cargos de administração no painel

O banco já tem `app_role AS ENUM ('admin', 'moderator', 'user')` e a tabela `user_roles`.

**Arquivo:** `src/components/AdminUserManager.tsx`
- Expandir a interface `UserRow` para incluir `is_moderator: boolean`
- Exibir badge "MOD" além de "ADMIN" para usuários com role moderator
- Adicionar botão de cargo com dropdown (ao invés de toggle simples): "Promover a Admin" / "Promover a Moderador" / "Remover cargo"
- Implementar a lógica de forma que um usuário possa ter ambos admin+moderator simultaneamente

**Arquivo:** `supabase/functions/admin-get-users/index.ts`
- A query de roles já busca `role = 'admin'` — expandir para `select('user_id, role')` sem filtro, retornando todas as roles
- No resultado: `is_admin: roles.includes('admin'), is_moderator: roles.includes('moderator')`
- Tratar actions `promote-moderator` e `demote-moderator`

### 5. Remover banner do pack

**Arquivo:** `src/components/AdminPackManager.tsx`
- No banner preview (linhas 607-623), ao lado de "Trocar banner", adicionar botão "Remover banner" com ícone `Trash2`
- Ao clicar: `confirm()` → chama nova action `remove-banner`
- Após remover: `onRefresh()` e toast de sucesso

**Arquivo:** `supabase/functions/admin-upload-sound/index.ts`
- Nova action `remove-banner`:
  ```typescript
  } else if (action === 'remove-banner') {
    const packId = formData.get('packId') as string;
    // Get current banner path to delete from storage
    const { data: pack } = await supabase.from('store_packs').select('banner_url').eq('id', packId).single();
    if (pack?.banner_url && !pack.banner_url.startsWith('http')) {
      await supabase.storage.from('sound-previews').remove([pack.banner_url]);
    }
    await supabase.from('store_packs').update({ banner_url: null }).eq('id', packId);
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  }
  ```

---

## Arquivos que serão modificados

| Arquivo | Mudança |
|---|---|
| `src/components/AdminAnalytics.tsx` | Filtro de período + gráfico de linha + seção de assinaturas |
| `src/components/AdminUserManager.tsx` | Suporte a cargo "moderador" + dropdown de cargos |
| `src/components/AdminPackManager.tsx` | Botão remover banner + visual do painel |
| `src/pages/Dashboard.tsx` | Cor de fundo do painel admin |
| `supabase/functions/admin-upload-sound/index.ts` | Nova action `remove-banner` |
| `supabase/functions/admin-get-users/index.ts` | Roles completas + promote/demote moderator |
| `supabase/functions/subscription-stats/index.ts` | **NOVO** — stats de assinatura via Stripe |
| `supabase/config.toml` | Registrar nova edge function |

**Nenhuma migração de banco necessária** — todos os dados necessários já existem (enum `app_role` tem `moderator`, coluna `purchased_at` existe, coluna `banner_url` existe).
