
# Plano: Footer com altura dinamica por dispositivo

## Conceito

Em vez de usar um valor fixo como `h-[27vh]`, vamos criar um hook que le a altura real da tela do celular e calcula a altura ideal do footer em pixels. Funciona igual a jogos mobile: cada aparelho recebe um valor sob medida.

## Logica de calculo

```
Altura do footer = altura da tela * fator
- Minimo: 170px (garante que o conteudo basico caiba)
- Maximo: 280px (nao rouba espaco dos pads)
- Fator: 0.27 (27% da tela)
```

Exemplos reais:
- iPhone SE (568px): 568 * 0.27 = 153 → sobe para 170px (minimo)
- iPhone 8 (667px): 667 * 0.27 = 180px
- iPhone 14 (844px): 844 * 0.27 = 228px
- iPhone 15 Pro Max (932px): 932 * 0.27 = 252px
- Galaxy A (720px): 720 * 0.27 = 194px

Resultado: cada celular recebe a altura perfeita, sem scroll desnecessario e sem desperdicar espaco.

## Detalhes tecnicos

### 1. Criar hook `useFooterHeight` em `src/hooks/useFooterHeight.ts`

- Le `window.innerHeight` no mount e em resize
- Calcula: `Math.min(280, Math.max(170, Math.floor(height * 0.27)))`
- Retorna o valor em pixels

### 2. Alterar `src/pages/Index.tsx`

- Importar o hook
- Substituir a classe `h-[27vh]` por `style={{ height: footerHeight }}` (apenas mobile, fora do focus mode)
- Desktop (`lg:`) continua com `h-auto` e `flex-1` sem mudanca

### Nenhum outro arquivo sera alterado
