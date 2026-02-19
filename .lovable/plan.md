

## Configuracoes com lista direta no mobile

### Problema atual
No mobile, o usuario precisa clicar no icone de menu (hamburger) para ver as opcoes das abas. Isso cria um "menu dentro do menu" que e confuso.

### Solucao
Transformar o fluxo mobile em **duas telas dentro do dialog**:

1. **Tela 1 (lista)**: Ao abrir as configuracoes, o usuario ve imediatamente a lista de todas as opcoes (Audio, Notificacoes, Loja, Planos, Guia, Sobre) como itens clicaveis em lista vertical
2. **Tela 2 (conteudo)**: Ao clicar em uma opcao, o conteudo dessa aba aparece com um botao de voltar no topo para retornar a lista

Desktop/landscape continua com o sidebar lateral como esta hoje.

### Detalhes Tecnicos

#### Arquivo: `src/components/SettingsDialog.tsx`

**Remover**:
- O drawer lateral (mobileDrawer) com backdrop e painel deslizante
- O botao de hamburger (Menu icon) no header
- Os imports de `Menu`, `X` que so eram usados no drawer

**Adicionar**:
- Um estado `activeTab` que começa como `null` no mobile (mostra a lista) ou com valor quando vem de `initialTab`
- Quando `activeTab === null` e mobile: renderiza a lista de opcoes (TAB_ITEMS) como botoes verticais com icone + label + chevron
- Quando `activeTab !== null`: renderiza o conteudo da aba com um header contendo botao de voltar (seta para esquerda) + titulo da aba
- No desktop/landscape: comportamento atual com sidebar permanece inalterado

**Fluxo mobile**:
```text
+----------------------------------+
| Configuracoes                  X |
|----------------------------------|
| [icon] Audio              >     |
| [icon] Notificacoes       >     |
| [icon] Loja               >     |
| [icon] Planos             >     |
| [icon] Guia               >     |
| [icon] Sobre              >     |
+----------------------------------+

  (usuario clica em "Audio")

+----------------------------------+
| <- Audio                       X |
|----------------------------------|
|                                  |
|  Conteudo da aba Audio           |
|  (com scroll vertical)           |
|                                  |
+----------------------------------+
```

**Logica principal**:
- Mobile portrait: `activeTab === null` mostra lista, `activeTab !== null` mostra conteudo com botao voltar
- Desktop/landscape: `activeTab` sempre tem valor, sidebar + conteudo lado a lado (sem mudanca)
- `initialTab` prop: se fornecido, abre direto no conteudo dessa aba (pula a lista)
