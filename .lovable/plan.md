

## Corrigir Push Notifications (status 403)

### Problema Diagnosticado

Os logs mostram que **todas** as 7 tentativas de push falharam com **status 403** (Forbidden), tanto para endpoints do Apple (web.push.apple.com) quanto FCM (fcm.googleapis.com). Isso significa que a autenticacao VAPID esta sendo rejeitada pelos servidores de push.

A causa raiz esta na implementacao manual de criptografia e assinatura VAPID na edge function `send-push-notification`. O codigo atual mistura formatos incompativeis:

- Usa `Content-Encoding: aesgcm` (formato legado)
- Mas usa `Authorization: vapid t=...` (formato moderno, so funciona com `aes128gcm`)
- A criptografia de payload tambem pode ter inconsistencias no padding

### Solucao

Substituir toda a implementacao manual de criptografia por uma biblioteca testada e confiavel: **web-push** via `npm:web-push`. Essa biblioteca cuida automaticamente de:

- Assinatura JWT VAPID correta
- Criptografia de payload (aes128gcm, RFC 8291)
- Headers corretos para cada push service (Apple, Google, Mozilla)
- Limpeza de subscriptions expiradas

### Arquivo Alterado

**`supabase/functions/send-push-notification/index.ts`**

- Remover toda a implementacao manual (~150 linhas): `buildVapidJwt`, `sendWebPush`, criptografia ECDH/AES-GCM
- Importar `npm:web-push` e configurar com as chaves VAPID existentes
- Usar `webpush.sendNotification()` para cada subscription
- Manter toda a logica de negocio intacta (subscribe, unsubscribe, broadcast, admin check, cleanup de expirados)

### Detalhes Tecnicos

```text
ANTES (manual, ~150 linhas de crypto):
  buildVapidJwt() -> crypto.subtle.sign()
  sendWebPush()   -> ECDH + AES-GCM manual + fetch()
  Content-Encoding: aesgcm  (ERRADO com vapid t=...)
  Authorization: vapid t=...,k=...

DEPOIS (web-push library):
  webpush.setVapidDetails('mailto:admin@glorypads.app', publicKey, privateKey)
  webpush.sendNotification(subscription, payload)
  Criptografia e headers corretos automaticamente
```

A logica de subscribe/unsubscribe/broadcast permanece identica. Apenas o metodo de envio muda.

### Nenhuma mudanca no frontend

O codigo do cliente (`push-notifications.ts`, `sw-push.js`, `NotificationPromptBanner.tsx`) permanece exatamente como esta. O service worker continuara recebendo e exibindo as notificacoes normalmente - o problema era exclusivamente no envio do servidor.

