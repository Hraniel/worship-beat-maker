
## Gerador de Chaves VAPID no Navegador

### Problema
O usuário precisa das chaves VAPID (pública + privada) para ativar as notificações push, mas não tem Node.js instalado e o site web-push-codelab.glitch.me está fora do ar.

### Solução
Criar uma página temporária `/vapid-generator` dentro do próprio app que usa a **Web Crypto API** nativa do navegador para gerar as chaves VAPID. Essa API é a mesma usada pela Edge Function e produz chaves 100% compatíveis.

Após o usuário copiar as chaves, a página pode ser removida (ou mantida oculta para uso futuro).

### Como funciona tecnicamente

VAPID usa par de chaves **ECDSA com curva P-256**:
- Chave pública → formato base64url → vai no código-fonte (`VAPID_PUBLIC_KEY`)
- Chave privada → formato PKCS8 base64url → vai no secret `VAPID_PRIVATE_KEY`

A geração usa exatamente `crypto.subtle.generateKey` com `{ name: 'ECDSA', namedCurve: 'P-256' }`.

### Arquivos a modificar

**1. Criar `src/pages/VapidGenerator.tsx`**
- Página simples com um botão "Gerar Chaves VAPID"
- Ao clicar: gera o par de chaves via Web Crypto API no navegador
- Exibe as duas chaves em campos de texto com botão "Copiar"
- Instruções claras de onde cada chave deve ser colocada
- Aviso de segurança: "Não compartilhe a chave privada"

**2. Registrar rota em `src/App.tsx`**
- Adicionar rota pública `/vapid-generator` → `<VapidGenerator />`
- Rota pública (não precisa de autenticação)

### Fluxo para o usuário

```text
1. Acessar /vapid-generator no app
2. Clicar em "Gerar Chaves VAPID"
3. Copiar a Chave Pública → atualizar VAPID_PUBLIC_KEY no código
4. Copiar a Chave Privada → inserir no secret VAPID_PRIVATE_KEY
5. Notificações push funcionando!
```

### Segurança
- A geração ocorre 100% no navegador — as chaves nunca saem do dispositivo
- A chave privada nunca é enviada para nenhum servidor
- A página pode ser removida após o uso se desejado
