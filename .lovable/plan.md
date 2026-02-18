
## Edição do Hero da Landing Page no Admin

### O que o usuário quer

Adicionar no painel admin uma forma de editar a seção superior da landing page (Hero) — que inclui o badge, título, subtítulo, cores, tamanho do texto e espaçamento — com salvamento automático (sem botão de publicar), igual ao `AdminPricingManager`.

### Diagnóstico do estado atual

A edição do Hero está **fragmentada em duas abas diferentes**:
- **Aba "Textos"**: edita `hero_badge`, `hero_title`, `hero_subtitle` (com save por campo via onBlur)
- **Aba "Estilos"**: edita `hero_bg`, `hero_title_color`, `hero_title_size`, `hero_subtitle_color`, `hero_badge_bg`, `hero_badge_color`, `hero_pt`, `hero_pb` (accordion "🦸 Hero")

Não há uma tela unificada para editar tudo do Hero de uma vez. A solução é criar uma **nova aba dedicada "Hero"** no `AdminLandingEditor`, reunindo todos os campos com salvamento automático (onBlur salva no banco imediatamente, sem botão de publicar).

---

### Estrutura da nova aba "Hero"

A nova aba ficará entre "Textos" e "Recursos" e terá 3 grupos visuais:

**Grupo 1 — Conteúdo**
- Badge (texto do badge)
- Título principal
- Subtítulo

**Grupo 2 — Cores & Tipografia**
- Cor de fundo da seção (`hero_bg`)
- Cor do título (`hero_title_color`)
- Tamanho do título (`hero_title_size`) — select com opções XS a 8XL
- Cor do subtítulo (`hero_subtitle_color`)
- Fundo do badge (`hero_badge_bg`)
- Cor do texto do badge (`hero_badge_color`)

**Grupo 3 — Espaçamento**
- Padding top (`hero_pt`) — select 0px–128px
- Padding bottom (`hero_pb`) — select 0px–128px

Cada campo salva **automaticamente no banco** ao perder o foco (`onBlur`) — exatamente como o `AdminPricingManager` faz com os planos. Sem botão de publicar, sem rascunho. A landing page reflete as mudanças instantaneamente para todos os visitantes.

---

### Campos de cor reutilizando o ColorField

O `AdminLandingStyleEditor` já tem um componente `ColorField` que:
- Mostra um color picker nativo + input de texto HSL + preview de swatch
- Suporta transparência (`hsl(... / 0.5)`)
- Salva ao `onBlur`

Esse componente será **extraído para um arquivo utilitário compartilhado** ou simplesmente replicado inline na nova aba com a mesma lógica de auto-save.

---

### Mudanças nos arquivos

#### `src/components/AdminLandingEditor.tsx`

1. Adicionar nova tab `'hero'` ao array `TABS` (ícone: `Layout` ou `ImageIcon`)
2. Adicionar `type ActiveTab = 'textos' | 'hero' | 'recursos' | 'estilos'`
3. Renderizar o conteúdo da nova aba com 3 grupos:
   - **Conteúdo**: inputs de texto com onBlur → saveKey (reutiliza lógica já existente)
   - **Cores**: componente ColorField inline (lógica de hsl copiada do StyleEditor)
   - **Espaçamento**: selects com as mesmas opções de padding do StyleEditor (0–128px)
4. A função `saveKey` já existe e funciona com upsert — pode ser reutilizada para todos os campos, **incluindo os de cor e espaçamento** desde que a chave exista no banco

#### `src/components/AdminLandingStyleEditor.tsx`

- Remover o accordion "🦸 Hero" (id `'hero'`) da lista `STYLE_SECTIONS`, pois esses campos agora são editados na aba dedicada
- Isso evita duplicidade de edição

#### Nenhum arquivo de banco, migration ou Landing.tsx precisa ser alterado

O `Landing.tsx` já lê todos os campos `hero_*` do config e os aplica dinamicamente. O `useLandingConfig` já busca tudo de `landing_config`. Nenhuma mudança necessária.

---

### Comportamento do salvamento

Igual ao `AdminPricingManager`:
- Input perde foco (`onBlur`) → `saveKey(key)` chama `supabase.from('landing_config').update(...)` → toast "Salvo!"
- Color picker muda → `onChange` atualiza estado local → ao fechar/perder foco → `onBlur` salva
- Select muda → `onChange` imediatamente chama `saveKey` (já que não tem campo de texto intermediário)
- A landing page reflete as mudanças em tempo real para todos os visitantes

---

### Resumo das alterações

| Arquivo | Mudança |
|---|---|
| `src/components/AdminLandingEditor.tsx` | Nova aba "Hero" com todos os campos textuais + cores + espaçamento, auto-save por onBlur |
| `src/components/AdminLandingStyleEditor.tsx` | Remove accordion "Hero" (evita duplicidade) |

Sem migrations, sem alterações no banco, sem mudanças no `Landing.tsx`.
