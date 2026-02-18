

# Ajustes no Dialog de Configuracoes para Mobile

## Problema

1. **Vertical mobile**: As abas (Audio, Loja, Planos, Guia, Sobre) ficam truncadas porque estao todas numa unica linha. Os nomes nao aparecem por completo.
2. **Horizontal mobile**: O dialog de configuracoes nao ocupa a tela toda, desperdicando espaco.

## Plano de Implementacao

### 1. Abas em duas linhas no mobile vertical (`src/components/SettingsDialog.tsx`)

- Trocar o `TabsList` de uma unica linha flex para um layout com duas linhas centralizadas no mobile
- Primeira linha: Audio, Loja, Planos (3 abas)
- Segunda linha: Guia, Sobre (2 abas, centralizadas)
- Usar `flex-wrap justify-center` com largura controlada para forcar a quebra natural
- Remover `truncate` dos spans para que os nomes aparecam completos

### 2. Dialog fullscreen no landscape mobile (`src/components/SettingsDialog.tsx`)

- Adicionar classes responsivas ao `DialogContent` para expandir em landscape mobile
- Usar media query ou hook `useIsLandscape` para aplicar `w-full h-full max-w-full max-h-full rounded-none` quando em landscape mobile
- Manter o estilo atual (`max-w-sm`) para portrait e desktop

### Resumo de arquivos alterados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/SettingsDialog.tsx` | TabsList com `flex-wrap justify-center` e largura por tab para forcar 3+2; DialogContent fullscreen em landscape mobile via classes condicionais com `useIsLandscape` |

