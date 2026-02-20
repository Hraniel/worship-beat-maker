

## Editar Textos e Cores da Comunidade e Rodapé no Painel Admin

### Resumo

Expandir o `AdminStoreEditor` com duas novas secoes: uma para os textos/cores da secao "Comunidade" e outra para o rodape da pagina da loja. Tambem atualizar o `CommunitySuggestions` e o `Dashboard` para consumir esses valores dinamicamente.

### Novas config keys no `store_config`

Adicionar via seed SQL as seguintes chaves:

**Comunidade:**
- `community_title` = "Comunidade — Proximas Atualizacoes"
- `community_subtitle` = "Vote nas ideias que voce quer ver no Glory Pads. Sua voz molda o app."
- `community_button_label` = "Sugerir ideia"
- `community_empty_text` = "Nenhuma sugestao ainda. Seja o primeiro!"
- `community_login_text` = "Faca login para curtir as sugestoes que voce quer ver no app."

**Rodape:**
- `footer_text` = "Glory Pads -- Feito com amor para adoradores."
- `footer_links` = JSON com links customizaveis (ex: Termos, Privacidade, Contato)

**Cores (adicionadas ao JSON `text_colors` existente):**
- `community_title_color` = "#111827"
- `community_subtitle_color` = "#6b7280"
- `community_button_color` = "#111827"
- `footer_text_color` = "#9ca3af"
- `footer_bg_color` = "#f8f8fa"

### Passo 1 -- Migracao SQL

Inserir as novas config keys com valores padrao na tabela `store_config` (INSERT com ON CONFLICT DO NOTHING para nao sobrescrever dados existentes).

### Passo 2 -- Atualizar `useStoreConfig.ts`

Adicionar os novos defaults ao mapa DEFAULTS para garantir fallback caso as keys nao existam no banco.

### Passo 3 -- Expandir `AdminStoreEditor.tsx`

Adicionar duas novas secoes ao editor:

**Secao "Comunidade":**
- Campo: Titulo da comunidade + color picker
- Campo: Subtitulo + color picker
- Campo: Label do botao "Sugerir" + color picker
- Campo: Texto estado vazio
- Campo: Texto login
- Botao "Salvar Comunidade"

**Secao "Rodape":**
- Campo: Texto do rodape + color picker
- Campo: Cor de fundo do rodape
- Campo: Links do rodape (JSON editavel com label + url, adicionar/remover)
- Botao "Salvar Rodape"

Mesmo padrao visual das secoes existentes (color pickers inline, preview de cor).

### Passo 4 -- Atualizar `CommunitySuggestions.tsx`

- Importar `useStoreConfig`
- Substituir todos os textos hardcoded pelos valores dinamicos do hook
- Aplicar cores dinamicas via `style={{ color: ... }}`

### Passo 5 -- Adicionar Rodape ao `Dashboard.tsx`

- Renderizar um rodape abaixo de `<CommunitySuggestions />` com texto e links dinamicos
- Aplicar cores de texto e fundo vindas do `store_config`

### Detalhes Tecnicos

**Arquivos modificados:**
- `src/hooks/useStoreConfig.ts` -- novos defaults
- `src/components/AdminStoreEditor.tsx` -- 2 novas secoes (Comunidade + Rodape)
- `src/components/CommunitySuggestions.tsx` -- textos e cores dinamicos
- `src/pages/Dashboard.tsx` -- rodape dinamico

**Migracao SQL:** INSERT de novas config keys com ON CONFLICT DO NOTHING

