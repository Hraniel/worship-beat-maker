

# Verificação: Persistência de dados ao fechar o app Capacitor

## Análise do estado atual

Após revisar o código, identifiquei como cada tipo de dado é persistido:

### O que já funciona corretamente

| Dado | Mecanismo | Sobrevive ao fechamento? |
|------|-----------|--------------------------|
| **Login/Sessão** | Supabase Auth (localStorage automático) + fallback offline | ✅ Sim |
| **BPM, Time Signature, Key** | localStorage (escrita imediata) | ✅ Sim |
| **Volumes dos pads** | localStorage | ✅ Sim |
| **Pan dos pads** | localStorage | ✅ Sim |
| **Nomes customizados** | localStorage | ✅ Sim |
| **Tamanho dos pads** | localStorage | ✅ Sim |
| **Setlists (lista)** | Supabase + cache localStorage | ✅ Sim |
| **Eventos agendados** | Supabase + cache localStorage | ✅ Sim |
| **Sons customizados** | IndexedDB | ✅ Sim |
| **Ambient pads customizados** | IndexedDB | ✅ Sim |
| **Música ativa (ID)** | localStorage | ✅ Sim |
| **Tier de assinatura** | localStorage cache | ✅ Sim |
| **Sync/metronome settings** | localStorage | ✅ Sim |

### Ponto crítico: Auto-save da música atual

O auto-save da música ativa (que salva BPM, Key, efeitos, MIDI mappings de volta no setlist do Supabase) depende de eventos `pagehide` e `beforeunload`:

```typescript
window.addEventListener("pagehide", handlePageHide);
window.addEventListener("beforeunload", handlePageHide);
```

**No Capacitor Android WebView**, o comportamento desses eventos é **inconsistente**:
- `pagehide` **pode não disparar** quando o app é removido das recentes (swipe-away)
- `beforeunload` **raramente dispara** em WebViews Android
- `visibilitychange` para `hidden` **dispara na maioria dos casos** ao minimizar, mas **não ao matar o app**

### Risco identificado

Se o usuário altera BPM/Key/efeitos/MIDI de uma música e fecha o app (swipe-away), essas alterações **podem não ser salvas no Supabase**. Porém, os valores individuais (BPM, volumes, pans) ficam no localStorage — o problema é que **não são re-associados à música do setlist**.

## Plano de correção

### 1. Adicionar listener do Capacitor App para `appStateChange`
Instalar `@capacitor/app` e usar o evento `appStateChange` que é **garantido** no Android/iOS quando o app vai para background ou é fechado.

### 2. Salvar com `Capacitor.App.addListener('appStateChange')`
Quando `isActive === false`, chamar `autoSaveCurrentSong()` — este é o mecanismo nativo confiável.

### 3. Adicionar save periódico como safety net
Um `setInterval` (a cada 30-60s) que salva a música ativa automaticamente, garantindo que no máximo 1 minuto de alterações seja perdido em caso de kill forçado.

## Arquivos a modificar
- `package.json` — adicionar `@capacitor/app`
- `src/pages/Index.tsx` — adicionar listener `appStateChange` + save periódico

