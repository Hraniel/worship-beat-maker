

## Criar Tutorial de Configuração do Holyrics na Central de Ajuda

O sistema de configuração do Holyrics já está **100% implementado** no app — toggle, campos de IP/Token, botão de teste e proxy. O que falta é um **tutorial detalhado na Central de Ajuda** explicando passo a passo como configurar dos dois lados (Holyrics + GloryPads).

### O que será feito

1. **Inserir artigo "Integração com Holyrics"** na tabela `help_articles` (na categoria "Modos Especiais" ou criar subcategoria se necessário)

2. **Inserir 8-10 passos detalhados** na tabela `help_steps`, cobrindo:
   - **Passo 1**: Abrir o Holyrics no computador
   - **Passo 2**: Ativar o API Server (Arquivo > Configurações > API Server)
   - **Passo 3**: Criar um Token de acesso com permissão "SetAlert"
   - **Passo 4**: Anotar o IP e PORTA exibidos no Holyrics
   - **Passo 5**: No GloryPads, abrir Configurações > Performance
   - **Passo 6**: Rolar até "Integração Holyrics" e ativar o toggle
   - **Passo 7**: Inserir IP:PORTA e Token
   - **Passo 8**: Clicar em "Testar Conexão" e verificar o alerta na projeção
   - **Passo 9**: Usar o Modo Performance — cada sinal enviado aparecerá sobreposto na projeção
   - **Passo 10**: Dicas de solução de problemas (mesma rede Wi-Fi, firewall, etc.)

3. **Adicionar traduções** (pt-BR, en, es) para os textos do tutorial

### Arquitetura
- Usa o sistema existente de `help_articles` + `help_steps` no banco de dados
- Nenhuma mudança de código no frontend — o hook `useHelpContent` já carrega tudo automaticamente
- Apenas inserções no banco via migration

