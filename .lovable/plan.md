

## Editor Completo da Loja no Painel Administrativo

### Objetivo

Criar uma nova aba "Loja" no painel administrativo que permita editar dinamicamente todos os elementos visuais e textuais da Glory Store, alem dos packs que ja sao gerenciados.

### O que sera editavel

1. **Cabecalho da Loja**
   - Titulo principal (atualmente "Glory Store" hardcoded)
   - Subtitulo/descricao (atualmente "Descubra novos sons, packs e texturas...")
   - Icone do titulo

2. **Secao "Minha Biblioteca"**
   - Titulo da secao
   - Labels ("Ativos", "Removidos")
   - Botao "Restaurar" texto

3. **Filtros de Biblioteca**
   - Labels dos filtros (Todos, Adquiridos, Disponiveis, Removidos)

4. **Categorias da Sidebar**
   - Adicionar, editar, remover e reordenar categorias
   - Nome, icone e subcategorias de cada grupo
   - Controle de quais categorias aparecem nas tabs mobile

5. **Textos Gerais**
   - Placeholder da busca
   - Labels de contagem (ex: "pack", "packs")

### Implementacao Tecnica

**1. Nova tabela `store_config`**

Tabela chave-valor similar a `landing_config`, para armazenar as configuracoes da loja:

```text
store_config
  - id (uuid, PK)
  - config_key (text, unique)
  - config_value (text - JSON stringified)
  - updated_at (timestamp)
```

Chaves previstas:
- `store_title` -> "Glory Store"
- `store_subtitle` -> "Descubra novos sons..."
- `library_title` -> "Minha Biblioteca"
- `library_active_label` -> "Ativos"
- `library_removed_label` -> "Removidos"
- `search_placeholder` -> "Buscar packs por nome ou descricao..."
- `filter_labels` -> JSON com labels dos filtros
- `categories` -> JSON array com grupos de categorias (nome, icone, subcategorias, ordem)

RLS: Admins podem gerenciar, qualquer um pode ler (mesmo padrao de `landing_config`).

**2. Novo componente `AdminStoreEditor.tsx`**

Editor com secoes colapsaveis para cada grupo de configuracao:

- **Textos da Loja**: campos de texto para titulo, subtitulo, labels
- **Categorias**: lista reordenavel com drag-and-drop para gerenciar grupos e subcategorias; botoes para adicionar/remover; seletor de icone Lucide para cada grupo
- **Preview ao vivo**: visualizacao em tempo real das mudancas antes de salvar
- Botao "Salvar tudo" por secao (mesmo padrao do `AdminLandingEditor`)

**3. Nova aba no `AdminPackManager.tsx`**

Adicionar aba "Loja" na barra de tabs do painel admin, entre "Packs" e "Analytics".

**4. Hook `useStoreConfig.ts`**

Hook similar ao `useLandingConfig.ts` para buscar e cachear as configuracoes da loja. Retorna valores com fallback para os valores hardcoded atuais, garantindo compatibilidade retroativa.

**5. Atualizacao do `Dashboard.tsx`**

Substituir todos os textos hardcoded por valores do `useStoreConfig`, com fallback para os valores atuais caso a tabela esteja vazia.

### Sequencia de implementacao

1. Criar tabela `store_config` com RLS
2. Criar hook `useStoreConfig.ts`
3. Criar componente `AdminStoreEditor.tsx`
4. Integrar nova aba no `AdminPackManager.tsx`
5. Atualizar `Dashboard.tsx` para usar configuracoes dinamicas
6. Atualizar `PackDetail.tsx` para usar titulo/cores dinamicos se aplicavel

