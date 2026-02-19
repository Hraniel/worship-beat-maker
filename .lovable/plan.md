
## Diagnóstico: App abre em Modo Foco

### Causa Raiz Identificada

O estado `focusMode` é lido diretamente do `localStorage` na inicialização:

```ts
const [focusMode, setFocusMode] = useState(() => localStorage.getItem(FOCUS_MODE_KEY) === 'true');
```

Se o usuário saiu do app enquanto o Modo Foco estava **ativo**, a chave `drum-pads-focus-mode = 'true'` persiste no localStorage. Na próxima vez que o app abre, ele carrega com Modo Foco ativado automaticamente.

### Problema Secundário: Não Há Escape Fácil

O botão para sair do Modo Foco está **condicionado a várias restrições**:

- **Mobile portrait**: apenas visível se `currentSongId` existir, `!editMode`, `!isTablet`, `!isDesktop`, `!isLandscape`
- **Desktop (>lg)**: o botão "Sair" no rodapé aparece normalmente
- **Se nenhuma música estiver selecionada ao abrir em Modo Foco**: o botão de saída do header de foco mostra mas sem song name; o botão "Foco" nos ambient pads (mobile) está oculto porque `currentSongId === null`

### Solução: Reset do Modo Foco no Mount

A correção mais simples e robusta é: **ao entrar no `/app`, sempre iniciar com Modo Foco desativado** (não persistir entre sessões). O Modo Foco é uma preferência de sessão de uso ao vivo — não faz sentido preservar entre acessos ao app.

Alternativamente, podemos **resetar o focusMode automaticamente quando o usuário volta ao app sem uma música ativa**, que é o cenário que causa confusão.

### Plano de Implementação

**Arquivo:** `src/pages/Index.tsx`

**Mudança 1 — Não persistir focusMode entre sessões (abordagem mais limpa):**

Trocar o estado inicial de:
```ts
const [focusMode, setFocusMode] = useState(() => localStorage.getItem(FOCUS_MODE_KEY) === 'true');
```
para:
```ts
const [focusMode, setFocusMode] = useState(false);
```
E remover o `localStorage.setItem(FOCUS_MODE_KEY, ...)` do `toggleFocusMode`.

**Mudança 2 — Auto-reset ao abrir app sem música:**

Adicionar um `useEffect` que, quando o app carrega e `currentSongId` é `null`, garante que `focusMode` seja `false`:

```ts
useEffect(() => {
  if (!currentSongId && focusMode) {
    setFocusMode(false);
    localStorage.setItem(FOCUS_MODE_KEY, 'false');
  }
}, []);
```

**Abordagem recomendada:** A **Mudança 1** (não persistir entre sessões) é a mais correta. O Modo Foco é um estado de uso ao vivo — o usuário ativa para uma performance e desativa depois. Não faz sentido preservar entre sessões, e a implementação fica mais simples e sem bugs.

### Resumo das Alterações

| Arquivo | Mudança |
|---|---|
| `src/pages/Index.tsx` | Iniciar `focusMode` sempre como `false` (sem ler localStorage) |
| `src/pages/Index.tsx` | Remover a leitura de `FOCUS_MODE_KEY` do estado inicial |
| `src/pages/Index.tsx` | (Opcional) Manter a escrita no localStorage para referência futura ou remover completamente |

Essa mudança é mínima, cirúrgica e não afeta nenhuma outra funcionalidade do app.
