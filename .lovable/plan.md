
# Plano de Implementação — Múltiplas Melhorias (Landing, Setlist, Admin, App)

Este plano agrupa todas as solicitações em blocos temáticos ordenados por dependência. São 12 itens distintos.

---

## Bloco 1 — Painel Admin: Landing Page (Glory Store)

**O que foi pedido:**
- Imagem de fundo na seção Glory Store com controle de transparência
- Imagem e link de pack individual por categoria (6 cards)
- Edição de textos e cores da seção Glory Store via admin

**Estado atual:**
- `Landing.tsx` (SoundSection) usa um array estático `categories` hardcoded com nome, emoji e cor
- O admin (`AdminLandingStyleEditor`) já tem uma seção "Glory Store" com `store_bg`, `store_title_color`, `store_subtitle_color` — mas sem campo de imagem de fundo nem edição de cards individuais
- Não há configuração por categoria no banco (`landing_config`)

**O que faremos:**

### 1a. Fundo com imagem + transparência na seção Glory Store

**`Landing.tsx` — SoundSection:**
- Ler `store_bg_image` (URL da imagem), `store_bg_image_opacity` (0–1) do config
- Renderizar `<img>` absolutamente posicionada no fundo da seção com `opacity: Number(store_bg_image_opacity)`
- Tamanho sugerido exibido no admin: **1920×600px (JPEG, <500KB)**

**`AdminLandingEditor.tsx` — nova aba "Loja":**
- Criar nova aba `'loja'` no array `TABS`
- Seção **Fundo da Seção**: upload de imagem para bucket `landing-assets`, campo de transparência (slider 0–100%), cor de fundo fallback
- Seção **Categorias**: 6 cards editáveis (Kick & Bumbo, Snare, Hi-Hat & Pratos, Loops, Continuous Pads, Efeitos) com:
  - Campo de imagem (upload ou URL) — tamanho sugerido: **400×400px**
  - Campo de link/rota do pack (ex: `/pack/uuid` ou `/auth?mode=signup`)
  - Emoji e nome editáveis
- Todos os campos salvam via `landing_config` com keys como `store_cat_0_image`, `store_cat_0_link`, `store_cat_0_name`, `store_cat_0_emoji`, etc.

**`Landing.tsx` — SoundSection:** ler essas keys e renderizar as categorias dinamicamente, tornando o card clicável com `onClick={() => navigate(cat.link || '/auth?mode=signup')}`

---

## Bloco 2 — Painel Admin: Estatísticas com imagem

**O que foi pedido:**
- Adicionar imagem em cada estatística (4 stats)
- Tamanho sugerido exibido no admin

**Estado atual:**
- Stats são 4 cards simples (value + label) lidos de `landing_config`
- `AdminLandingEditor.tsx` expõe stat_1_value/label, stat_2_value/label, etc.

**O que faremos:**
- Adicionar campos `stat_1_image`, `stat_2_image`, `stat_3_image`, `stat_4_image` ao grupo "Estatísticas" em `AdminLandingEditor.tsx`
- Upload de imagem para bucket `landing-assets`
- Exibir hint: **"Tamanho sugerido: 120×120px (PNG transparente)"**
- `Landing.tsx` — Stats: se `stat_X_image` existir, renderizar `<img>` acima do value com tamanho fixo 40×40px

---

## Bloco 3 — Painel Admin: "Como Funciona" (HowItWorks) — textos editáveis

**O que foi pedido:**
- Editar textos, cores entre outros da seção "Como Funciona"

**Estado atual:**
- `AdminLandingStyleEditor.tsx` já tem accordion "Como Funciona" com cores editáveis
- Os **textos** dos 3 passos (step, title, desc) estão **hardcoded** em `Landing.tsx`

**O que faremos:**
- Adicionar grupo "Como Funciona" ao `AdminLandingEditor.tsx` (aba "Geral") com campos:
  - `how_step_1_title`, `how_step_1_desc`
  - `how_step_2_title`, `how_step_2_desc`
  - `how_step_3_title`, `how_step_3_desc`
  - `how_main_title` (o "Do ensaio ao culto em 3 passos")
- `Landing.tsx` — HowItWorks: ler essas keys do config com fallback nos valores hardcoded atuais

---

## Bloco 4 — Painel Admin: Rodapé (Footer) — textos, links, imagem

**O que foi pedido:**
- Editar textos, imagens, cores, entre outros do rodapé

**Estado atual:**
- `AdminLandingStyleEditor.tsx` tem seção "Footer" com `footer_bg`, `footer_text_color`, paddings
- Os textos do rodapé estão hardcoded em `Landing.tsx`

**O que faremos:**
- Adicionar grupo "Rodapé" em `AdminLandingEditor.tsx` com:
  - `footer_tagline` (texto descritivo)
  - `footer_copyright` (ex: "Glory Pads")
  - `footer_links` — 3 links editáveis: label + href para Recursos, Planos, Glory Store
  - `footer_logo_url` — upload de imagem logo alternativo (sugerido: **40×40px SVG/PNG**)
- `Landing.tsx` — Footer: ler keys do config

---

## Bloco 5 — Verificar "Mais Popular" / highlight do plano

**O que foi pedido:**
- Verificar se o recurso de "mais popular" da landing page e app está funcionando ao salvar pelo admin

**Diagnóstico:**
- `AdminPricingManager` tem Switch para `highlight` que salva imediatamente via `supabase.from('plan_pricing').update({ highlight: v })`
- `Landing.tsx` — Pricing: usa `plan.highlight` para aplicar `scale(1.02)`, borda branca e sombra extra
- `Pricing.tsx` (página separada): precisa verificar se também lê `highlight` do banco

**O que faremos:**
- Verificar `src/pages/Pricing.tsx` — se lê `highlight` da tabela `plan_pricing`
- Verificar se o `badge_text` (ex: "Mais Popular") também é lido
- Corrigir se necessário para que tanto `Landing.tsx` quanto `Pricing.tsx` exibam o destaque corretamente

---

## Bloco 6 — Admin: Forçar limpeza de cache de todos os usuários

**O que foi pedido:**
- Botão no admin para forçar atualização de cache em todos os usuários

**Abordagem:**
- Criar um botão "Limpar Cache Geral" no `AdminPackManager.tsx` (aba packs ou nova aba Admin)
- Ao clicar: escrever um registro de versão de app na tabela `landing_config` com key `app_cache_version` e um timestamp como value
- No `App.tsx` ou `Index.tsx`: ao iniciar, comparar `app_cache_version` do banco com o valor salvo em `localStorage`; se diferente → chamar `location.reload()` após salvar o novo valor
- Isso garante que todos os usuários com a versão antiga do cache receberão uma atualização forçada na próxima visita

---

## Bloco 7 — Auth page: nome em maiúsculas

**O que foi pedido:**
- Alterar o nome do app na página inicial do cadastro e login para tudo maiúsculo

**Estado atual:**
- `src/pages/Auth.tsx` linha 110: `<h1>Glory Pads</h1>`

**O que faremos:**
- Mudar para `GLORY PADS` (texto em maiúsculas diretamente)

---

## Bloco 8 — Layout: verificar tablet (lado direito até o final da tela)

**O que foi pedido:**
- Verificar se o lado direito do app para tablets está indo até o final da tela e embaixo

**Diagnóstico via código:**
- `Index.tsx` linhas 1153: `footer` tem classe `lg:w-[320px] xl:w-[360px] lg:border-l lg:border-t-0 border-t`
- No tablet (`md:block lg:hidden`), o footer tem `max-h-[32vh] md:max-h-none` — mas pode não estar ocupando 100% de altura
- A div interna do tablet (linhas 1237) usa `hidden md:block lg:hidden p-1.5 space-y-1.5` — sem `h-full`

**O que faremos:**
- Garantir que o footer/sidebar do tablet use `h-full` e `overflow-y-auto` para preencher verticalmente
- Adicionar `min-h-0 flex-1` onde necessário no container do tablet

---

## Bloco 9 — Verificar Continuous Pads no desktop/tablet

**O que foi pedido:**
- Não identificou o Continuous Pad na tela do desktop e tablet — verificar

**Diagnóstico via código:**
- Desktop (linhas 1222–1232): `<AmbientPads>` está presente após o metrônomo ✓
- Tablet (linhas 1291–1294): `<AmbientPads>` também presente ✓
- Landscape: `ambientPads` prop é passado e renderizado na aba Mix ✓
- **Possível causa**: o componente `AmbientPads` pode estar sendo renderizado mas com altura zero ou oculto por overflow

**O que faremos:**
- Inspecionar `AmbientPads.tsx` para verificar se tem altura mínima garantida
- Garantir que o container pai do desktop e tablet tenha `overflow-y-auto` para permitir scroll até os Continuous Pads quando a altura for insuficiente
- Verificar se `focusMode` esconde indevidamente o componente

---

## Bloco 10 — Setlist: compartilhamento do repertório completo (dinâmico)

**O que foi pedido:**
- O setlist compartilhado deve ser o repertório completo (todas as músicas), não só a música selecionada
- Se o usuário mudar o repertório, o link compartilhado se atualiza automaticamente

**Diagnóstico:**
- Atualmente, o botão de compartilhar em `SetlistManager.tsx` (linhas 119–131) busca `share_token` e `is_public` com `.eq('id', currentSongId)` — ou seja, está compartilhando a **setlist/repertório ativo**, não uma música individual
- `SetlistManager` recebe `songs: SetlistSong[]` que são as músicas de uma setlist
- A confusão semântica é: `currentSongId` refere-se ao ID da **setlist ativa** (não da música selecionada), e `songs` são as músicas dentro dela
- `SharedSetlist.tsx` já exibe todas as `songs` do setlist — isso parece correto
- **O problema real**: em `Index.tsx`, `currentSongId` é o ID da música carregada, não o ID da setlist. Verificar como `SetlistManager` recebe esse valor

**O que faremos:**
- Verificar em `Index.tsx` como `currentSongId` é passado para `SetlistManager`
- A correção será passar o **ID da setlist ativa** (não da música selecionada) para o componente de compartilhamento
- `useSetlists` já tem um `setlists` array com IDs — usar o setlist atual como contexto de compartilhamento
- O link gerado aponta para `/s/:token` que carrega todas as músicas do setlist — já funciona dinamicamente pois é consultado em tempo real no banco

---

## Bloco 11 — Setlist: Dias de Evento com Repertório

**O que foi pedido:**
- Criar dias no repertório com nome do evento e data
- As músicas ficam dentro de cada dia
- O setlist compartilhado será o repertório do dia programado

**Esta é a mudança mais estrutural do plano. Requer:**

### Banco de dados

Nova tabela `setlist_events`:
```sql
CREATE TABLE public.setlist_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,              -- nome do evento ex: "Culto Domingo"
  event_date date NOT NULL,
  setlist_id uuid REFERENCES public.setlists(id) ON DELETE CASCADE,
  share_token uuid DEFAULT gen_random_uuid(),
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

Com RLS (só o dono pode ver/editar, eventos públicos visíveis por todos).

### Novo hook `useSetlistEvents`

- CRUD para eventos: criar, editar nome/data, deletar
- Um evento aponta para uma `setlist_id` existente (o usuário escolhe qual repertório de músicas pertence ao evento)

### UI — `SetlistManager.tsx` refatorado

Novo layout em 3 camadas:
1. **Eventos** (top level): lista de datas/eventos com nome e data, ordenados por data
2. **Músicas** (dentro de cada evento): as músicas da setlist vinculada ao evento
3. **Botão "Criar Evento"**: formulário com nome + data + seleção de setlist existente ou nova

### Compartilhamento por evento

- Botão de compartilhamento agora fica no nível do **evento** (não da setlist genérica)
- O token de compartilhamento é o `share_token` do `setlist_event`
- Edge function `get-shared-setlist` é atualizada para aceitar também token de evento
- A página `SharedSetlist.tsx` exibe o nome do evento + data no cabeçalho

### Compatibilidade retroativa

- As setlists existentes continuam funcionando como repertórios de músicas
- Eventos são uma camada nova sobre as setlists

---

## Resumo dos arquivos a alterar/criar

| Arquivo | Mudança |
|---|---|
| `src/pages/Landing.tsx` | SoundSection: imagem de fundo, cats dinâmicas clicáveis. Stats: imagens. HowItWorks: textos dinâmicos. Footer: textos dinâmicos |
| `src/components/AdminLandingEditor.tsx` | Nova aba "Loja" com imagem de fundo + categorias + links. Grupo "Como Funciona" textos. Grupo "Rodapé" textos+logo. Grupo "Estatísticas" com imagem |
| `src/pages/Auth.tsx` | Nome "GLORY PADS" em maiúsculas |
| `src/pages/Pricing.tsx` | Verificar/corrigir highlight e badge_text |
| `src/components/AdminPackManager.tsx` | Botão "Forçar atualização de cache" |
| `src/App.tsx` ou `src/pages/Index.tsx` | Verificar versão de cache no início |
| `src/components/AmbientPads.tsx` | Verificar altura mínima no desktop/tablet |
| `src/pages/Index.tsx` | Corrigir passagem de ID para compartilhamento de setlist; tablet overflow |
| `src/components/SetlistManager.tsx` | Refatorar para suporte a eventos com data/nome |
| `src/hooks/useSetlistEvents.ts` | Novo hook CRUD de eventos |
| `src/pages/SharedSetlist.tsx` | Suporte a exibição por evento (nome + data) |
| `supabase/functions/get-shared-setlist/index.ts` | Suportar token de evento além de setlist |
| `supabase/migrations/` | Nova tabela `setlist_events` com RLS |

---

## Ordem de implementação sugerida

1. Auth: rename "GLORY PADS" (1 min)
2. Verificar Pricing.tsx highlight/badge (5 min)
3. Admin: textos HowItWorks + Footer + Estatísticas (15 min)
4. Admin: aba Loja com imagem de fundo + categorias dinâmicas (20 min)
5. Landing.tsx: consumir todos os novos config keys (15 min)
6. Admin: forçar cache (10 min)
7. Tablet overflow fix + AmbientPads height (10 min)
8. Setlist: corrigir compartilhamento de repertório completo (10 min)
9. Setlist events: migration + hook + UI (45 min)
