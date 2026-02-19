
## Alinhar botoes dos packs na loja

**Problema:** Quando dois cards de pack aparecem lado a lado, se um tem descricao mais longa que o outro, os botoes de "Comprar" / "Obter Gratis" ficam em alturas diferentes porque o conteudo empurra o botao para baixo de forma irregular.

**Solucao:** Transformar o corpo do card em um layout flexbox vertical com `flex-1` e empurrar o botao para o final do card usando `mt-auto`.

### Alteracoes em `src/components/PackCard.tsx`

1. Adicionar `flex flex-col` ao card raiz para que ele ocupe toda a altura disponivel no grid
2. Adicionar `flex flex-col flex-1` ao div do corpo do card (`p-4`) para que ele preencha o espaco restante
3. Envolver a area do botao de acao em um div com `mt-auto` para que fique sempre no final do card, independente do tamanho do texto acima

Isso garante que, em um grid de 2 colunas, todos os botoes ficam alinhados na mesma linha horizontal.
