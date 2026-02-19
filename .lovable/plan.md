
## Três Melhorias Independentes

---

### 1. Banner de Modo Offline

**Objetivo:** Exibir um banner discreto no topo do app quando `navigator.onLine === false`, informando ao usuário que está usando dados em cache.

**Implementação:**

**Novo hook `src/hooks/useOnlineStatus.ts`:**
```typescript
import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);
  return isOnline;
}
```

**Novo componente `src/components/OfflineBanner.tsx`:**
- Aparece com `slide-in-from-top` quando offline
- Ícone de nuvem cortada + texto "Modo offline — usando dados em cache"
- Sem botão de fechar (desaparece automaticamente quando voltar online)
- Mesmo estilo do `UpdateBanner.tsx` existente (barra no topo, `fixed z-[60]`)

**Integração em `src/pages/Index.tsx`:**
- Importar `useOnlineStatus` e `OfflineBanner`
- Renderizar `<OfflineBanner isOffline={!isOnline} />` logo após o `<UpdateBanner>`

---

### 2. Pads Free: 4 → 6 pads liberados

**Onde o limite de 4 pads está definido:**
- `src/lib/tiers.ts` → `free.maxPads: 4` → mudar para `6`
- `src/components/AdminPricingManager.tsx` → catálogo em `APP_FEATURES_CATALOG`, descrição do gate `unlimited_pads`: _"Acesso a mais de 4 pads simultâneos"_ → atualizar para "mais de 6 pads"
- Banco de dados → tabela `plan_pricing` para o tier `free`: `max_pads` = `4` → atualizar para `6` via UPDATE SQL
- Banco de dados → tabela `feature_gates`: gate `unlimited_pads`, `description` = "Mais de 4 pads por setlist" → atualizar para "Mais de 6 pads por setlist" via UPDATE SQL

**Arquivos a modificar:**

| Arquivo | Mudança |
|---|---|
| `src/lib/tiers.ts` | `free.maxPads: 4` → `6` |
| `src/components/AdminPricingManager.tsx` | Descrição do catálogo: "mais de 4 pads" → "mais de 6 pads" |
| Banco de dados (`plan_pricing`) | `max_pads` = 6 para o tier `free` |
| Banco de dados (`feature_gates`) | `description` do gate `unlimited_pads`: "Mais de 4" → "Mais de 6" |

**A landing page e o app de preços** já consomem `max_pads` diretamente do banco de dados via `useLandingConfig` e `plan_pricing`, então se atualizam automaticamente sem alteração de código.

---

### 3. Gate de Faders no Painel Admin + Gate Aplicado no App

**Situação atual:** O gate `mixer_faders` existe no banco com `required_tier: 'pro'`, mas o mixer nunca verifica esse gate — ele é sempre exibido para todos.

**O que fazer:**

**A. Aplicar o gate no `src/pages/Index.tsx`:**
- Dentro do bloco que renderiza o `<MixerStrip>` (aparecem 3 vezes: mobile, tablet e desktop), verificar `canAccess('mixer_faders').allowed`
- Quando bloqueado, exibir um overlay sobre o mixer com cadeado + texto "Mixer disponível no plano Pro" e botão que abre o `UpgradeGateModal`
- Criar um componente `MixerLockedOverlay` inline (ou no próprio Index) para esse overlay

**B. Garantir que o gate `mixer_faders` exista no catálogo do painel:**
- Em `AdminPricingManager.tsx`, o `APP_FEATURES_CATALOG` já não inclui o gate `mixer_faders` nativamente — ele precisa ser adicionado ao catálogo em `APP_FEATURES_CATALOG` para que o botão "Adicionar todos os gates" o reconheça corretamente com tier padrão `pro`.
- O gate já existe no banco, então o admin já consegue editá-lo pela aba "Gates" — essa parte funciona.

**Fluxo do gate de faders:**

```text
Usuário free ou com tier insuficiente acessa o app
  └─ canAccess('mixer_faders').allowed === false
       └─ MixerStrip fica visualmente bloqueado
            └─ Overlay com Lock + "Mixer disponível no plano Pro"
                 └─ Botão "Ver planos" → setUpgradeGate({ gateKey: 'mixer_faders', ... })
                      └─ UpgradeGateModal exibido
```

**Arquivos a modificar:**

| Arquivo | Mudança |
|---|---|
| `src/pages/Index.tsx` | Verificar `canAccess('mixer_faders')` antes de renderizar os 3 blocos de MixerStrip; mostrar overlay bloqueado quando não permitido |
| `src/components/AdminPricingManager.tsx` | Adicionar `mixer_faders` ao `APP_FEATURES_CATALOG` com tier `pro` |

---

## Resumo de todos os arquivos a modificar

| Arquivo | O que muda |
|---|---|
| `src/hooks/useOnlineStatus.ts` | **NOVO** — hook de detecção de conectividade |
| `src/components/OfflineBanner.tsx` | **NOVO** — banner de modo offline |
| `src/pages/Index.tsx` | Integrar OfflineBanner; aplicar gate mixer_faders nos 3 blocos de faders |
| `src/lib/tiers.ts` | `free.maxPads: 4` → `6` |
| `src/components/AdminPricingManager.tsx` | Atualizar descrição do catálogo; adicionar mixer_faders ao catálogo |
| Banco de dados | UPDATE `plan_pricing` e `feature_gates` para free tier e unlimited_pads |
