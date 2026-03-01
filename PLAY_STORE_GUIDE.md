# 📱 Guia Completo: Publicar Glory Pads na Google Play Store

## Pré-requisitos
- ✅ Conta Google Play Console (US$25 — já tem)
- ⬜ Android Studio instalado
- ⬜ Projeto exportado para o GitHub

---

## ETAPA 1 — Instalar Android Studio

1. Acesse: https://developer.android.com/studio
2. Baixe e instale o Android Studio
3. Na instalação, aceite todas as licenças do SDK
4. Abra o Android Studio e deixe ele terminar de baixar os componentes (pode demorar ~15 min)

---

## ETAPA 2 — Exportar o projeto para o GitHub

1. No Lovable, vá em **Settings → Connectors → GitHub**
2. Conecte sua conta GitHub
3. Clique em **"Export to GitHub"**
4. Escolha um nome para o repositório (ex: `glory-pads`)

---

## ETAPA 3 — Clonar e configurar o projeto

Abra o **Terminal** (ou PowerShell no Windows) e execute:

```bash
# 1. Clone o repositório
git clone https://github.com/SEU_USUARIO/glory-pads.git
cd glory-pads

# 2. Instale as dependências
npm install

# 3. Adicione a plataforma Android
npx cap add android

# 4. Faça o build do projeto web
npm run build

# 5. Sincronize com o Android
npx cap sync android
```

---

## ETAPA 4 — Configurar o plugin MIDI nativo

Após o `npx cap add android`, o projeto Android será criado na pasta `android/`.

### 4.1 — Criar a pasta do plugin

```bash
mkdir -p android/app/src/main/java/com/glorypads/app/plugins
```

### 4.2 — Copiar o plugin MIDI

```bash
cp native/android/CapacitorMidiPlugin.java android/app/src/main/java/com/glorypads/app/plugins/
```

### 4.3 — Corrigir o package no arquivo copiado

Abra o arquivo `android/app/src/main/java/com/glorypads/app/plugins/CapacitorMidiPlugin.java` e mude a **primeira linha**:

**De:**
```java
package app.lovable.glorypads.plugins;
```

**Para:**
```java
package com.glorypads.app.plugins;
```

### 4.4 — Registrar o plugin no MainActivity

Abra `android/app/src/main/java/com/glorypads/app/MainActivity.java` e edite:

```java
package com.glorypads.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.glorypads.app.plugins.CapacitorMidiPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(CapacitorMidiPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

### 4.5 — Adicionar permissão MIDI no AndroidManifest

Abra `android/app/src/main/AndroidManifest.xml` e adicione **dentro de `<manifest>`**, antes de `<application>`:

```xml
<uses-feature android:name="android.software.midi" android:required="false" />
```

---

## ETAPA 5 — Gerar ícones do app

1. No Android Studio, abra a pasta `android/` como projeto
2. Vá em **File → New → Image Asset**
3. Em **Source Asset**, selecione o arquivo `public/pwa-icon-512.png` do projeto
4. Configure o **Background Layer** com a cor `#0a0b14`
5. Clique em **Next → Finish**

---

## ETAPA 6 — Testar no emulador

1. No Android Studio, clique em **Device Manager** (ícone de celular na lateral)
2. Clique em **Create Device** → escolha **Pixel 7** → **Next**
3. Baixe uma imagem do sistema (API 34 recomendado) → **Next → Finish**
4. Clique no ▶️ (Play) para rodar o app no emulador

---

## ETAPA 7 — Gerar o AAB para a Play Store

### 7.1 — Criar chave de assinatura

No terminal, dentro da pasta `android/`:

```bash
keytool -genkey -v -keystore glory-pads-release.keystore -alias glorypads -keyalg RSA -keysize 2048 -validity 10000
```

> ⚠️ **GUARDE A SENHA!** Você vai precisar dela sempre. Se perder, não consegue mais atualizar o app.

### 7.2 — Configurar assinatura no Gradle

Edite `android/app/build.gradle` e adicione **dentro de `android {`**:

```gradle
signingConfigs {
    release {
        storeFile file("../glory-pads-release.keystore")
        storePassword "SUA_SENHA_AQUI"
        keyAlias "glorypads"
        keyPassword "SUA_SENHA_AQUI"
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### 7.3 — Gerar o AAB

No terminal:

```bash
cd android
./gradlew bundleRelease
```

O arquivo será gerado em:
```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## ETAPA 8 — Publicar na Play Store

1. Acesse https://play.google.com/console
2. Clique em **"Criar app"**
3. Preencha:
   - **Nome do app:** Glory Pads
   - **Idioma padrão:** Português (Brasil)
   - **App ou jogo:** App
   - **Gratuito ou pago:** Gratuito (ou pago)
4. Aceite as declarações e clique em **Criar app**

### 8.1 — Configurações obrigatórias

No menu lateral, complete **todas** as seções:

| Seção | O que preencher |
|---|---|
| **Detalhes do app** | Descrição curta e longa |
| **Classificação de conteúdo** | Responda o questionário (app musical, sem violência) |
| **Público-alvo** | 13+ anos |
| **Acesso ao app** | Funcionalidade completa disponível sem login especial |
| **Anúncios** | Não contém anúncios |
| **Política de privacidade** | Use a URL: `https://worship-beat-maker.lovable.app/privacy` |

### 8.2 — Imagens obrigatórias

Você vai precisar criar:

| Imagem | Tamanho |
|---|---|
| **Ícone** | 512 x 512 px |
| **Imagem de destaque** | 1024 x 500 px |
| **Screenshots celular** | Mínimo 2 prints (1080 x 1920 recomendado) |

> Dica: Use o emulador para tirar screenshots do app funcionando.

### 8.3 — Upload do AAB

1. Vá em **Produção → Criar nova versão**
2. Faça upload do arquivo `app-release.aab`
3. Adicione notas da versão (ex: "Versão inicial do Glory Pads")
4. Clique em **Revisar e publicar**

---

## ETAPA 9 — Aguardar revisão

A Google revisa o app em **1 a 7 dias**. Você receberá um email quando for aprovado.

---

## 🔄 Para atualizar o app depois

Como o Glory Pads carrega o conteúdo da web, **a maioria das atualizações é automática** — basta publicar no Lovable.

Só precisa gerar um novo AAB se mudar:
- Ícone do app
- Permissões do Android
- Plugins nativos (como o MIDI)
- Versão mínima do Android

---

## ❓ Problemas comuns

| Problema | Solução |
|---|---|
| Tela branca ao abrir | Verifique se a URL em `capacitor.config.ts` está correta |
| App não instala | Verifique se o `appId` está correto no `capacitor.config.ts` |
| MIDI não funciona | Verifique se o plugin foi registrado no `MainActivity.java` |
| Build falha | Execute `npx cap sync android` novamente |
