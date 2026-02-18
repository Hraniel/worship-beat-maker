
# Dois pedidos em um plano

---

## Pedido 1: Reestruturação do fluxo de Eventos no Repertório

### Problema atual

No `SetlistManager`, a lista de "setlists" do banco é mapeada em `songs` assim (linhas 610–616 de `Index.tsx`):

```text
cada setlist → uma entrada na lista de músicas da UI
```

O `CreateEventForm` pega `setlists` (que são coleções) e lista-as como se fossem músicas individuais para associar ao evento. Resultado: ao criar um evento, só é possível associar **uma coleção inteira** por vez — não músicas avulsas.

### Solução: Inverter o fluxo

**Fluxo novo:**
1. Usuário cria o evento (nome + data) → evento salvo imediatamente
2. Evento aparece expandido com um painel "+ Adicionar música"
3. Usuário seleciona músicas da sua lista de setlists para adicionar ao evento, uma a uma
4. O evento armazena um array de `song_ids` (ou os dados inline) no campo `setlist_id` → precisamos estender o modelo do evento

### Mudança de modelo de dados

O campo `setlist_id` (UUID) atual só permite associar **uma** setlist. Precisamos mudar para um campo `song_ids` (array de texto/JSONB) que armazena múltiplos IDs de músicas.

**Migration SQL necessária:**
```sql
-- Adicionar coluna songs_data JSONB ao evento (armazena snapshot das músicas selecionadas)
ALTER TABLE public.setlist_events 
ADD COLUMN IF NOT EXISTS songs_data JSONB DEFAULT '[]'::jsonb;
```

O campo `setlist_id` continua existindo (retrocompatibilidade), mas o novo campo `songs_data` guarda o snapshot das músicas selecionadas para o evento.

### Mudanças nos componentes

**`src/hooks/useSetlistEvents.ts`**
- Adicionar `songs_data` à interface `SetlistEvent`
- Adicionar função `addSongToEvent(eventId, song)` que faz `UPDATE setlist_events SET songs_data = songs_data || [song]`
- Adicionar função `removeSongFromEvent(eventId, songId)` que remove a música do array JSONB
- Atualizar `createEvent` para receber apenas `name` e `event_date` (sem `setlist_id` obrigatório)

**`src/components/SetlistManager.tsx`**

Refatorar completamente o `EventCard` e o `CreateEventForm`:

1. **`CreateEventForm` simplificado**: apenas campo `Nome do evento` + campo `Data` + botão Criar. Remove o `<select>` de setlists.

2. **`EventCard` com gerenciamento de músicas interno:**
   - Quando expandido, mostra lista das músicas salvas no evento (de `songs_data`)
   - Botão "+ Adicionar música" abre um `<select>` inline com todas as músicas disponíveis no `songs` do usuário
   - Cada música adicionada aparece listada com botão de remover
   - Drag-and-drop para reordenar as músicas do evento (usando `@dnd-kit`)

3. **Fluxo UX:**
```text
[Seção Eventos]
  → botão "Novo" → form simples (nome + data) → Criar

[Evento criado]
  ┌─ Culto Domingo | 23/02 ─────────────────────┐
  │  [editar] [deletar]                          │
  │  Compartilhar: [Privado ▼]                   │
  │  ▼ expandir                                  │
  │    1. Amazing Grace (90 BPM · Ré)  [×]       │
  │    2. Oceans (75 BPM · Lá)         [×]       │
  │    [+ Adicionar música ▼]                    │
  └──────────────────────────────────────────────┘
```

---

## Pedido 2: Atualizar catálogo de Gates e conteúdo do painel/landing

### Novos recursos desenvolvidos que precisam aparecer nos Gates

As funcionalidades implementadas recentemente que ainda não têm entrada no catálogo de `APP_FEATURES_CATALOG` do `AdminPricingManager.tsx`:

| Feature | Gate Key sugerido | Tier | Onde adicionar |
|---|---|---|---|
| Eventos de Setlist | `setlist_events` | pro | categoria "Setlists" |
| Compartilhamento de Eventos | `share_event` | pro | categoria "Setlists" |
| Continuous Pads ao lado do grid | já coberto por `ambient_pads` | — | — |

**`src/components/AdminPricingManager.tsx`** — adicionar ao `APP_FEATURES_CATALOG` na categoria `Setlists`:
```ts
{ key: 'setlist_events', label: 'Eventos de Setlist', description: 'Criar e organizar eventos com data e músicas', tier: 'pro' },
{ key: 'share_event', label: 'Compartilhar evento', description: 'Gerar link público de evento com repertório', tier: 'pro' },
```

### Atualizar textos do `SECTION_LABELS` no `AdminLandingEditor.tsx`

Adicionar os novos textos de seção para o editor de landing:
- `how_it_works_title`: título da seção "Como Funciona"  
- `how_it_works_subtitle`: subtítulo

### Atualizar `LandingPreviewDrawer` se necessário

Verificar se a prévia da landing renderiza os novos recursos de eventos/pads.

---

## Arquivos a modificar

### Schema (migration)
- Adicionar `songs_data JSONB DEFAULT '[]'` em `setlist_events`

### Código
1. **`src/hooks/useSetlistEvents.ts`** — interface + `addSongToEvent` + `removeSongFromEvent` + simplificar `createEvent`
2. **`src/components/SetlistManager.tsx`** — `CreateEventForm` simplificado + `EventCard` com gerenciamento inline de músicas (add/remove/reorder)
3. **`src/components/AdminPricingManager.tsx`** — adicionar `setlist_events` e `share_event` ao catálogo
4. **`src/components/AdminLandingEditor.tsx`** — adicionar chaves de seção novas ao `SECTION_LABELS`

---

## Resultado esperado

**Fluxo de eventos:**
```text
ANTES: Criar evento → escolher UMA setlist → evento criado com 1 setlist

DEPOIS: 
  1. Criar evento (nome + data) → evento criado vazio
  2. Abrir evento → botão "+ Adicionar música"
  3. Selecionar músicas da lista → adicionadas uma a uma
  4. Reordenar ou remover músicas dentro do evento
```

**Painel admin:**
- Dois novos gates disponíveis para ativar/desativar: `setlist_events` e `share_event`
- Editor da landing com chaves novas disponíveis

**Sem breaking changes**: campo `setlist_id` mantido para retrocompatibilidade; `songs_data` é adicionado como nova coluna JSONB.
