

## Continuacao da Implementacao - E-mails Automaticos

A migracao do banco ja foi executada. Agora vamos completar o sistema:

### Passo 1: Configurar RESEND_API_KEY

Voce sera solicitado a inserir sua chave de API do Resend como secret seguro do backend.

### Passo 2: Edge Function `send-ticket-email`

Criar a funcao que:
- Valida o admin via JWT (getClaims)
- Busca o template correspondente ao status no banco
- Substitui variaveis (nome, status, pergunta, app_url) no HTML
- Envia via Resend API
- Retorna sucesso/erro

### Passo 3: Componente `AdminEmailTemplateManager.tsx`

Painel admin com:
- Lista dos 3 templates editaveis
- Editor de assunto e corpo HTML
- Toggle ativar/desativar por status
- Preview em tempo real
- Lista de variaveis disponiveis

### Passo 4: Integracoes

- **AdminPackManager.tsx**: Nova aba "E-mails" no grupo Gestao
- **AdminTicketManager.tsx**: Chamar edge function apos atualizar status do ticket
- **config.toml**: Registrar `send-ticket-email` com `verify_jwt = false`

### Detalhes Tecnicos

- Edge function usa `npm:resend@4.0.0`
- Autenticacao via `getClaims()` seguindo padrao do projeto
- CORS headers padrao do projeto
- Envio assincrono (nao bloqueia UI)
- Fallback silencioso se template desativado
- Remetente: configuravel via dominio verificado no Resend

