
# Chat de IA na Central de Ajuda

## Resumo

Adicionar um assistente de IA integrado na pagina de Ajuda (`/help`) que responde duvidas sobre o uso do app, compras, planos e suporte geral. O chat usa o Lovable AI Gateway (ja configurado com `LOVABLE_API_KEY`) atraves de uma Edge Function dedicada.

## O que o usuario vera

- Um botao flutuante no canto inferior direito da pagina de Ajuda com icone de chat
- Ao tocar, abre um painel de chat com visual moderno (estilo drawer/modal)
- Campo de digitacao + historico de mensagens com streaming em tempo real
- Mensagens renderizadas com suporte a markdown
- Indicador de "digitando..." enquanto a IA responde
- Tratamento de erros (rate limit, creditos insuficientes) com mensagens amigaveis em portugues

## Custos

- Cada mensagem enviada pelo usuario final consome creditos do **Lovable AI Gateway** (gerenciados em Settings > Workspace > Usage)
- **Nao** consome os creditos do editor Lovable usados para programar

## Implementacao Tecnica

### 1. Nova Edge Function: `supabase/functions/help-chat/index.ts`

- Recebe array de `messages` via POST
- Injeta um system prompt detalhado com todo o conhecimento do app (pads, repertorio, MIDI, loja, planos, efeitos, continuous pads, metronomo, modos)
- Usa streaming SSE via `https://ai.gateway.lovable.dev/v1/chat/completions`
- Modelo: `google/gemini-3-flash-preview` (rapido e economico)
- Trata erros 429 (rate limit) e 402 (creditos insuficientes)
- CORS configurado

### 2. Atualizar `supabase/config.toml`

- Adicionar entrada `[functions.help-chat]` com `verify_jwt = false`

### 3. Novo componente: `src/components/HelpChatWidget.tsx`

- Botao flutuante com icone `MessageCircle`
- Painel de chat com:
  - Header com titulo e botao fechar
  - Area de mensagens com scroll automatico
  - Renderizacao markdown via `react-markdown` (ou formatacao basica inline)
  - Streaming token-a-token (SSE parsing line-by-line)
  - Mensagem inicial de boas-vindas da IA
  - Input com botao enviar e suporte a Enter
  - Estado de loading/digitando
  - Toast para erros de rate limit e creditos

### 4. Atualizar `src/pages/Help.tsx`

- Importar e renderizar `<HelpChatWidget />` na pagina

### Detalhes do System Prompt

O prompt da Edge Function incluira:
- Descricao completa de todas as funcionalidades do Glory Pads
- Informacoes sobre planos (Free, Pro, Master)
- Instrucoes sobre a Glory Store (compra, importacao)
- Como usar MIDI, metronomo, efeitos, repertorio
- Instrucao para responder sempre em portugues
- Tom amigavel e objetivo

### Estrutura de Arquivos

```text
Novos:
  supabase/functions/help-chat/index.ts
  src/components/HelpChatWidget.tsx

Editados:
  supabase/config.toml  (adicionar help-chat)
  src/pages/Help.tsx    (importar HelpChatWidget)
```
