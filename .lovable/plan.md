

## Editor Completo da Glory Store no Painel Administrativo

### Resumo

Criar a tabela `store_config`, um hook para consumir os dados, um componente editor completo e integrar tudo no painel admin e no Dashboard.

### Passo 1 -- Tabela `store_config`

Criar via migracao SQL:

```text
store_config
  - id (uuid, PK, default gen_random_uuid())
  - config_key (text, UNIQUE, NOT NULL)
  - config_value (text, NOT NULL)
  - updated_at (timestamptz, default now())
```

RLS:
- Admins: ALL (usando `has_role(auth.uid(), 'admin')`)
- Qualquer um: SELECT (true)

Trigger `update_updated_at_column` para auto-atualizar `updated_at`.

Seed inicial com valores padrao: `store_title`, `store_subtitle`, `library_title`, `library_active_label`, `library_removed_label`, `search_placeholder`, `filter_labels` (JSON), `categories` (JSON array com os 6 grupos atuais do CATEGORY_GROUPS).

### Passo 2 -- Hook `useStoreConfig.ts`

Mesmo padrao do `useLandingConfig.ts`:
- Busca todas as rows de `store_config`
- Retorna um mapa `Record<string, string>` com fallback para valores hardcoded
- Helper `getJSON(key)` para parsear valores JSON (categorias, filtros)
- Funcao `refetch` para recarregar apos salvar

### Passo 3 -- Componente `AdminStoreEditor.tsx`

Editor com secoes usando Accordion (mesmo padrao visual do AdminLandingEditor):

**Secao "Textos da Loja":**
- Campo: Titulo da loja (store_title)
- Campo: Subtitulo (store_subtitle)
- Campo: Titulo "Minha Biblioteca" (library_title)
- Campo: Label "Ativos" (library_active_label)
- Campo: Label "Removidos" (library_removed_label)
- Campo: Placeholder de busca (search_placeholder)
- Botao "Salvar Textos"

**Secao "Filtros":**
- 4 campos para os labels dos filtros (Todos, Adquiridos, Disponiveis, Removidos)
- Botao "Salvar Filtros"

**Secao "Categorias":**
- Lista de grupos de categorias com drag-and-drop para reordenar
- Cada grupo: nome, icone (select com icones Lucide), subcategorias (chips editaveis)
- Botoes para adicionar novo grupo, remover grupo, adicionar/remover subcategoria
- Botao "Salvar Categorias"

Estilo visual: gradientes slate/indigo consistentes com o restante do admin.

### Passo 4 -- Nova aba no AdminPackManager

Adicionar `'store'` ao tipo de `activeTab` e uma nova entrada na lista de tabs:
```text
{ key: 'store', label: '🏪 Loja' }
```
Renderizar `<AdminStoreEditor />` quando `activeTab === 'store'`.

### Passo 5 -- Atualizar Dashboard.tsx

Importar `useStoreConfig` e substituir:
- `"Glory Store"` -> `storeConfig.store_title`
- `"Descubra novos sons..."` -> `storeConfig.store_subtitle`
- `"Minha Biblioteca"` -> `storeConfig.library_title`
- Labels "Ativos"/"Removidos" -> valores dinamicos
- Placeholder de busca -> valor dinamico
- Labels dos filtros (Todos, Adquiridos, Disponiveis, Removidos) -> valores dinamicos
- `CATEGORY_GROUPS` e `MOBILE_CATEGORIES` -> construidos a partir do JSON `categories` do banco, com fallback para os arrays hardcoded atuais

### Detalhes Tecnicos

**Arquivos criados:**
- `src/hooks/useStoreConfig.ts`
- `src/components/AdminStoreEditor.tsx`

**Arquivos modificados:**
- `src/components/AdminPackManager.tsx` (nova aba + import)
- `src/pages/Dashboard.tsx` (textos dinamicos)

**Migracao SQL:** 1 migracao para tabela + RLS + trigger + seed

