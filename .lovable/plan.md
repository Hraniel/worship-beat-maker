
# Melhoria no Painel Admin: Edição de Preço de Packs

## Problema

O painel de administração tem uma inconsistência no campo de preço dos packs:

- **Formulário de criação** (Novo Pack): aceita o valor em reais (ex: `9,99`) com indicador visual de sincronização com Stripe
- **Formulário de edição** (lápis no pack existente): aceita o valor em centavos (ex: `999`) sem nenhuma explicação, sem indicador de sincronização, e sem formatação amigável

Além disso, o campo usa `type="number"` genérico, sem formatação nem feedback visual.

## Solução

Padronizar o campo de preço na edição de packs para ser idêntico ao formulário de criação: aceitar valores em reais (R$), mostrar um prefixo "R$", e exibir a mensagem de confirmação de sincronização com Stripe quando o valor for maior que zero.

## Mudanças Técnicas

### `src/components/AdminPackManager.tsx`

**Estado inicial do pack edit (`startEditPack`):**
- Converter `price_cents` para reais ao popular o estado de edição (dividir por 100), armazenando como string formatada ao invés de número inteiro em centavos

**Campo de preço no formulário de edição (linhas ~886-893):**
- Substituir o `input type="number"` com placeholder "Preço (centavos)" por um campo com prefixo "R$", aceitando decimais com vírgula ou ponto — igual ao formulário de criação
- Exibir a mensagem "✓ Será sincronizado com Stripe automaticamente" quando o valor for > 0
- Exibir "🔓 Stripe sincronizado" ou indicador visual quando o pack já tiver `stripe_price_id`

**`handleUpdatePack`:**
- Converter o valor em reais para centavos ao enviar (multiplicar por 100 com `Math.round`) — igual ao fluxo de criação

**Interface `packEdit`:**
- Trocar o campo `priceCents: number` por `priceBrl: string` para armazenar o valor formatado em reais

## Comportamento Esperado

1. Admin clica no lápis ✏️ de um pack pago (ex: R$ 9,99)
2. O campo mostra `R$ 9,99` (não `999`)
3. Ao alterar para R$ 14,99 e salvar, o sistema converte para 1499 centavos, sincroniza com Stripe e exibe confirmação
4. Pack gratuito (0) não aciona sincronização com Stripe
