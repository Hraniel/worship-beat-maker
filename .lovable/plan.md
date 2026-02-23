

## Ajuste de cores no chat do assistente

Alteracao no componente `src/components/HelpChatWidget.tsx` na barra de input de mensagem:

### Mudancas

**Arquivo:** `src/components/HelpChatWidget.tsx`

1. **Cor do texto digitado**: Adicionar `text-black` ao campo de input para que o texto fique preto ao digitar.
2. **Cor do placeholder**: Adicionar `placeholder:text-violet-400` para o texto de placeholder ficar roxo.
3. **Borda/anel de foco**: Manter o `focus:ring-violet-500` que ja existe.

### Detalhe tecnico

A classe atual do input:
```
className="flex-1 rounded-full border border-input bg-muted/50 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
```

Sera alterada para:
```
className="flex-1 rounded-full border border-input bg-muted/50 px-4 py-2 text-sm text-black placeholder:text-violet-400 outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
```

Apenas uma linha sera modificada, sem impacto em outros componentes.

