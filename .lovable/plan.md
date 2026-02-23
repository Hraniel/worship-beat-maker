
## Sistema de E-mails Automaticos para Tickets + Painel Admin de Templates

### Resumo

Quando o admin atualizar o status de um ticket (Recebido, Em Andamento, Finalizado), o usuario recebera automaticamente um e-mail notificando a mudanca. Alem disso, um novo painel admin permitira personalizar os templates de cada e-mail.

---

### Pre-requisito: Resend API Key

Para enviar e-mails transacionais, sera necessario configurar o servico **Resend**:

1. Criar conta gratuita em [resend.com](https://resend.com)
2. Verificar um dominio em [resend.com/domains](https://resend.com/domains) (ou usar o dominio de teste para desenvolvimento)
3. Criar uma API key em [resend.com/api-keys](https://resend.com/api-keys)
4. Voce sera solicitado a inserir a chave `RESEND_API_KEY` antes da implementacao

---

### Arquitetura

```text
Admin atualiza status do ticket
        |
        v
Frontend chama Edge Function "send-ticket-email"
        |
        v
Edge Function:
  1. Busca template do banco (email_templates)
  2. Substitui variaveis: {{nome}}, {{status}}, {{pergunta}}
  3. Envia e-mail via Resend API
        |
        v
Usuario recebe e-mail personalizado
```

---

### Mudancas

#### 1. Tabela `email_templates` (migracao)

Nova tabela para armazenar templates editaveis:

- `id` (uuid, PK)
- `template_key` (text, unique) - ex: `ticket_received`, `ticket_in_progress`, `ticket_done`
- `subject` (text) - assunto do e-mail
- `body_html` (text) - corpo HTML com variaveis: `{{nome}}`, `{{status}}`, `{{pergunta}}`, `{{app_url}}`
- `enabled` (boolean, default true) - ativar/desativar envio
- `created_at`, `updated_at`

RLS: Apenas admins podem ler/escrever. Seeds iniciais com templates padrao em portugues.

#### 2. Edge Function `send-ticket-email`

Nova funcao que:
- Recebe: `ticket_id`, `new_status`, `ticket_email`, `ticket_name`, `ticket_question`
- Busca o template correspondente ao status no banco
- Substitui variaveis no HTML
- Envia via Resend
- Validacao de admin via JWT

#### 3. Componente `AdminEmailTemplateManager.tsx`

Novo componente no painel admin com:
- Lista dos 3 templates (Recebido, Em Andamento, Finalizado)
- Editor de assunto e corpo HTML para cada um
- Toggle para ativar/desativar envio por status
- Preview em tempo real do e-mail
- Variaveis disponiveis listadas: `{{nome}}`, `{{status}}`, `{{pergunta}}`, `{{app_url}}`

#### 4. Integracao no `AdminPackManager.tsx`

- Nova aba **"📧 E-mails"** no grupo "Gestao" do painel admin
- Renderiza `AdminEmailTemplateManager`

#### 5. Integracao no `AdminTicketManager.tsx`

- Apos `updateStatus()` com sucesso, chama a Edge Function `send-ticket-email`
- Exibe toast de confirmacao do envio

#### 6. Configuracao

- Adicionar `RESEND_API_KEY` como secret
- Registrar `send-ticket-email` no `config.toml` com `verify_jwt = false`

---

### Templates Padrao (seeds)

**ticket_received** (quando ticket e criado):
- Assunto: "Recebemos sua solicitacao - Glory Pads"
- Corpo: Confirmacao de recebimento com nome e resumo da pergunta

**ticket_in_progress** (Em Andamento):
- Assunto: "Seu ticket esta sendo analisado - Glory Pads"
- Corpo: Informando que a equipe esta trabalhando na solucao

**ticket_done** (Finalizado):
- Assunto: "Seu ticket foi resolvido - Glory Pads"
- Corpo: Informando resolucao com link para acessar o app

---

### Detalhes Tecnicos

- Edge function usa `npm:resend@4.0.0` para envio
- Templates suportam HTML basico com variaveis via `replace()`
- RLS restritiva: apenas admins gerenciam templates
- O envio e feito de forma assincrona (nao bloqueia a UI do admin)
- Fallback: se template nao existir ou estiver desativado, nao envia (silencioso)
