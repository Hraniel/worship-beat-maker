

## Enviar Cues Apenas para a Tela de Retorno (Stage Display) do Holyrics

### Contexto

A API do Holyrics permite direcionar alertas para telas específicas usando o parâmetro `receiver_id` no `SetAlert`. Cada tela configurada no Holyrics tem um ID (0 = tela principal, 1 = segunda tela/retorno, etc.). Também existe a API `SetTextCommunicationPanel` que é exclusiva do painel de comunicação interno (só aparece no retorno da banda).

### O que será feito

1. **Adicionar campo `targetScreen` ao `HolyricsConfig`**
   - Opções: `"all"` (todas as telas), `"stage"` (só retorno/segunda tela), `"front"` (só projeção principal)
   - Default: `"stage"` (retorno da banda)

2. **Atualizar a UI de configuração no SettingsDialog**
   - Adicionar um `Select` com as opções de tela destino logo abaixo dos campos de IP e Token
   - Labels: "Todas as telas", "Apenas retorno (banda)", "Apenas projeção (igreja)"

3. **Modificar o payload enviado ao Holyrics**
   - Quando `targetScreen === "stage"`: usar `SetTextCommunicationPanel` (painel de comunicação — aparece apenas no monitor de retorno)
   - Quando `targetScreen === "front"`: usar `SetAlert` normal
   - Quando `targetScreen === "all"`: enviar para ambos

4. **Atualizar persistência em `performance-settings.ts`**
   - Incluir `targetScreen` no load/save do `HolyricsConfig`

5. **Atualizar traduções** (pt-BR, en, es)

### Arquitetura

```text
Configuração: targetScreen = "stage"
       ↓
LiveCuePanel → sendToHolyrics()
       ↓
action = "SetTextCommunicationPanel"  ← só aparece no retorno
payload = { text: "REFRÃO!" }
       ↓
holyrics-proxy → Holyrics API Server
       ↓
Banda vê no monitor de retorno ✓
Igreja NÃO vê na projeção ✓
```

### Detalhes técnicos

- `SetTextCommunicationPanel` é a API correta para enviar mensagens visíveis **apenas** no painel de comunicação do Holyrics (monitor de retorno da banda)
- `SetAlert` com `display_ahead: true` aparece em **todas** as telas
- A edge function `holyrics-proxy` já é genérica (aceita qualquer `action`), não precisa de alteração

