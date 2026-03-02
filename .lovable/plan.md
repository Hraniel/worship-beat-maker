

## Redirecionar usuarios com app instalado direto para o login

Quando o usuario ja instalou o app (PWA ou Android nativo via Capacitor), ele nao precisa ver a landing page de marketing. O comportamento desejado:

- App instalado + nao logado + pre-lancamento inativo --> redireciona para `/auth`
- App instalado + logado --> comportamento atual (redireciona para `/app`)
- App nao instalado (navegador normal) --> mostra a landing page normalmente

### Deteccao de app instalado

O app ja utiliza `window.matchMedia('(display-mode: standalone)')` em varios pontos do codigo. Essa media query retorna `true` tanto para PWA instalado quanto para o app Android via Capacitor (WebView), cobrindo ambos os cenarios.

### Alteracao

**Arquivo: `src/pages/Landing.tsx`**

Adicionar um `useEffect` no componente `Landing` que verifica:
1. Se o app esta rodando em modo standalone (PWA/Capacitor)
2. Se o pre-lancamento e a manutencao estao inativos
3. Se o usuario nao esta logado (via `useAuth`)

Se todas as condicoes forem verdadeiras, redireciona automaticamente para `/auth`.

### Detalhes tecnicos

```text
Landing.tsx (componente raiz)
  |
  +-- useAuth() --> pega user e loading
  +-- usePrelaunchMode() --> ja existe
  +-- useMaintenanceMode() --> ja existe
  |
  +-- useEffect:
        isStandalone = window.matchMedia('(display-mode: standalone)').matches
        if (isStandalone && !user && !loading && !prelaunch.enabled && !maintenance.enabled)
          navigate('/auth', { replace: true })
```

- O `useAuth` ja esta disponivel pois `Landing` e renderizado dentro do `AuthProvider`
- O redirecionamento usa `replace: true` para nao empilhar a landing no historico
- Enquanto `loading` do auth ou do prelaunch estiver `true`, nenhum redirecionamento acontece (evita flash)

