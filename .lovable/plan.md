
# Notificacao de Atualizacao do App (PWA)

## Situacao Atual

O app ja detecta novas versoes via Service Worker (`useRegisterSW`) e mostra um botao "Nova versao disponivel!" dentro do menu hamburger. Porem, o usuario so ve isso se abrir o menu -- facil de passar despercebido.

Alem disso, o `skipWaiting: true` faz o SW atualizar automaticamente, o que pode causar problemas (recarregar no meio do uso). O ideal e dar controle ao usuario.

## Sugestoes de Abordagem

| Abordagem | Descricao | Recomendacao |
|-----------|-----------|--------------|
| **Toast/Banner fixo (recomendado)** | Um banner ou toast persistente aparece no topo/rodape da tela quando ha atualizacao, com botao "Atualizar agora" | Melhor UX -- visivel sem ser intrusivo |
| Dialog modal | Um dialog centralizado interrompe o uso para avisar | Muito intrusivo para atualizacoes frequentes |
| Badge no icone | Indicador visual sutil em algum icone | Facil de ignorar |

**Recomendacao: Toast/Banner fixo no topo da tela** -- aparece automaticamente, nao bloqueia o uso, e o usuario atualiza quando quiser.

## Plano de Implementacao

### 1. Remover `skipWaiting` automatico (`vite.config.ts`)
- Remover `skipWaiting: true` e `clientsClaim: true` do workbox config
- Mudar `registerType` para `"prompt"` (o usuario decide quando atualizar)
- Isso faz o `needRefresh` funcionar corretamente como gatilho

### 2. Criar componente `UpdateBanner` (`src/components/UpdateBanner.tsx`)
- Banner fixo no topo da tela com animacao de entrada (slide down)
- Texto: "Nova versao disponivel!" com botao "Atualizar"
- Botao de fechar (X) para dispensar temporariamente
- Estilo: fundo escuro com destaque na cor primary, visivel mas nao intrusivo

### 3. Integrar no Index.tsx
- Passar `needRefresh` e `updateServiceWorker` para o `UpdateBanner`
- Remover o botao de "Nova versao" do menu hamburger (ja que o banner e mais visivel)
- Manter a logica de checagem a cada 60 segundos

### Resumo de arquivos alterados

| Arquivo | Mudanca |
|---------|---------|
| `vite.config.ts` | `registerType: "prompt"`, remover `skipWaiting`/`clientsClaim` |
| `src/components/UpdateBanner.tsx` | Novo componente -- banner fixo com botao "Atualizar" |
| `src/pages/Index.tsx` | Adicionar `<UpdateBanner>`, remover botao do menu |
