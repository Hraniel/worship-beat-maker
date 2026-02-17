
# Correções de Responsividade e Posicionamento

## Problemas Identificados

1. **Botão "Sair" do modo foco** está posicionado no canto superior direito (`top-2 right-2`) e pode sobrepor o pad "Ride" ou outros elementos
2. **Dialog de Configurações** está cortado nas laterais em telas pequenas -- as abas e conteúdo transbordam porque o `max-w-sm` (384px) é muito largo para telas de 390px sem margem suficiente
3. **Pads podem ficar cortados** em telas menores

## Mudanças Planejadas

### 1. Botão "Sair do foco" -- reposicionar para não sobrepor pads

Mover o botão para **abaixo do header** (quando o header está oculto no modo foco), posicionando-o no **centro superior** da tela com margem segura, fora da área dos pads.

- Posição: `top-1 left-1/2 -translate-x-1/2` (centralizado no topo, fora do grid)
- Alternativa: mantê-lo no canto mas com `top-0` e estilização mais discreta

### 2. Dialog de Configurações -- responsivo e centralizado

- Alterar `max-w-sm` para `max-w-[calc(100vw-2rem)]` em mobile para garantir margens laterais
- Adicionar `mx-4` ou padding adequado
- Nas abas (TabsList), usar `overflow-x-auto` ou reduzir o tamanho do texto para caber sem corte

### 3. Pads -- garantir que não fiquem cortados

- Verificar e ajustar o `PadGrid` para usar o espaço disponível sem overflow

## Detalhes Técnicos

### Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Index.tsx` | Reposicionar o botão "Sair" para centro-topo com z-index adequado, sem sobrepor pads |
| `src/components/SettingsDialog.tsx` | Ajustar `DialogContent` com classe responsiva; ajustar TabsList para caber em telas pequenas |
| `src/components/PadGrid.tsx` | Garantir pads responsivos sem corte usando `aspect-square` e limites baseados na viewport |

### Botão "Sair" -- nova posição

O botão ficará centralizado no topo da tela (abaixo da safe area), com `z-30` para ficar acima do conteúdo mas sem tocar nos pads. A posição centralizada evita conflito com qualquer pad nos cantos.

### Dialog Configurações -- responsivo

```text
Antes:  max-w-sm (384px fixo) -- corta em telas de 390px
Depois: max-w-sm com mx-4 e overflow protegido
```

As abas terão texto menor em mobile e `flex-wrap` ou scroll horizontal se necessário para evitar corte.
