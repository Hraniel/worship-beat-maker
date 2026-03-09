

## Integração GloryPads ↔ Holyrics

### Visão Geral
Sim, é possível conectar o Modo Performance do GloryPads ao Holyrics **sem interferir** no que já está sendo projetado. O Holyrics oferece uma API Server robusta que permite comunicação bidirecional via HTTP/WebSocket.

---

### Opções de Integração

#### Opção 1: Alertas Sobrepostos (Recomendada)
Usar a API `SetAlert` do Holyrics para exibir cues como **alertas sobrepostos** — aparecem no canto da tela sem interromper a projeção atual.

```text
┌─────────────────────────────────────┐
│  [Slide de letra atual do Holyrics]│
│                                     │
│                    ┌───────────────┐│
│                    │ 🎵 REFRÃO!    ││  ← Alerta sobreposto
│                    └───────────────┘│
└─────────────────────────────────────┘
```

**Vantagens:**
- Não interrompe a apresentação atual
- Aparece "na frente" de qualquer conteúdo
- Pode configurar para desaparecer automaticamente

#### Opção 2: Painel de Comunicação (CP)
Usar `SetTextCommunicationPanel` para enviar mensagens ao painel do operador (comunicação interna, não aparece na projeção pública).

#### Opção 3: Custom Messages
Criar mensagens customizadas no Holyrics que podem ser acionadas remotamente pelo GloryPads.

---

### Arquitetura Técnica

```text
┌──────────────────┐         HTTP POST          ┌──────────────────┐
│   GloryPads      │  ───────────────────────>  │    Holyrics      │
│ (Performance)    │   api/SetAlert?token=xxx   │   API Server     │
│                  │                            │                  │
│  Enviar Cue:     │   { "text": "REFRÃO!",    │  Exibe overlay   │
│  - Refrão        │     "show": true,          │  na projeção     │
│  - Subir         │     "display_ahead": true, │                  │
│  - Corte         │     "close_after_seconds":5}                  │
└──────────────────┘                            └──────────────────┘
```

---

### Implementação

1. **Configuração no Holyrics**
   - Ativar API Server: `Arquivo > Configurações > API Server`
   - Criar um Token de acesso com permissão para `SetAlert`
   - Anotar IP:PORTA (ex: `192.168.1.100:8091`)

2. **Nova seção nas Configurações do GloryPads**
   - Campo para IP:PORTA do Holyrics
   - Campo para Token de acesso
   - Botão "Testar Conexão"
   - Toggle "Enviar cues também para Holyrics"

3. **Edge Function para proxy (opcional)**
   - Se quiser conexão via internet (não só rede local), criar edge function que repasse para `api.holyrics.com.br`

4. **Modificar `LiveCuePanel.tsx`**
   - Ao enviar um cue, também chamar API do Holyrics se configurado:
   ```typescript
   // Ao enviar cue
   if (holyricsConfig.enabled) {
     await fetch(`http://${holyricsConfig.host}/api/SetAlert?token=${holyricsConfig.token}`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         text: cueLabel,
         show: true,
         display_ahead: true,
         close_after_seconds: settings.cueDisplaySeconds
       })
     });
   }
   ```

---

### APIs Úteis do Holyrics

| Ação | Descrição |
|------|-----------|
| `SetAlert` | Exibe texto sobreposto na projeção |
| `SetTextCommunicationPanel` | Texto no painel de comunicação (interno) |
| `ShowQuickPresentation` | Exibe texto rápido (substitui tela atual) |
| `CommunicationPanelCallAttention` | Chamar atenção do operador |

---

### Limitações e Considerações

1. **Rede Local**: Comunicação direta só funciona se GloryPads e Holyrics estiverem na mesma rede
2. **CORS**: Chamadas do navegador podem ser bloqueadas — pode precisar de Edge Function como proxy
3. **API Key para Internet**: Para comunicação remota, precisa da API_KEY do Holyrics (versão paga)

---

### Próximos Passos

1. Adicionar seção "Holyrics" nas configurações do Performance
2. Criar Edge Function `holyrics-proxy` para contornar CORS
3. Integrar envio de cues no `LiveCuePanel`
4. Adicionar tutorial na Central de Ajuda

