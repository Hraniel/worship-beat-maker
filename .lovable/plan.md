
# Redesign Visual dos Pads: Aparência de Pad Real

## O que muda

Os pads atualmente têm o fundo colorido como identidade visual base (fundo com 10% de opacidade da cor do pad). A proposta é inverter essa lógica:

- **Fundo nativo:** preto sólido com textura de pad real (gradiente escuro, bordas sutis, sombra interna)
- **Borda nativa:** cinza escuro neutro, sem cor
- **Efeito de batida:** flash branco (sem cor personalizada)
- **Quando cor customizada está definida:** só o efeito da batida usa a cor — o fundo permanece preto
- **Loop ativo:** borda pulsante usa a cor do pad (para diferenciar loops ativos)
- **Indicador de atividade (ponto):** permanece com cor primary

---

## Detalhes técnicos — `src/components/DrumPad.tsx`

### Estado de repouso (idle)
```
backgroundColor: 'hsl(0 0% 7%)'            ← quase preto, mais escuro que o fundo
borderColor: 'hsl(0 0% 20%)'              ← cinza escuro neutro
boxShadow: 'inset 0 1px 0 hsl(0 0% 100% / 0.04),
            inset 0 -2px 4px hsl(0 0% 0% / 0.4)'   ← sombra interna dá profundidade de pad
```

### Estado ativo (hit) — efeito branco nativo, ou cor se customizada
```
backgroundColor: customColor
  ? `hsl(${colorHsl} / 0.25)`     ← usa cor customizada com opacidade baixa
  : 'hsl(0 0% 22%)'               ← branco/cinza claro sem cor

borderColor: customColor
  ? `hsl(${colorHsl} / 0.9)`
  : 'hsl(0 0% 80%)'               ← borda quase branca no hit

boxShadow: customColor
  ? `0 0 24px hsl(${colorHsl} / 0.45), inset 0 0 12px hsl(${colorHsl} / 0.15)`
  : '0 0 20px hsl(0 0% 100% / 0.25), inset 0 0 10px hsl(0 0% 100% / 0.08)'   ← glow branco
```

### Estado looping — mantém cor para diferenciar
```
backgroundColor: customColor
  ? `hsl(${colorHsl} / 0.12)`
  : colorRef(0.08)                ← leve cor de fundo para indicar loop ativo

borderColor usa a cor (animate-loop-border já existe no CSS)
```

### Texto do pad
- Permanece `text-foreground` (branco/cinza claro)
- Quando ativo: adicionar `text-white` para contrastar com o flash branco

### Textura de pad real
Adicionar no `style` do botão:
```
background: `linear-gradient(145deg, hsl(0 0% 9%) 0%, hsl(0 0% 5%) 100%)`
```
Sobrescrito quando ativo ou em loop.

---

## Resultado visual esperado

| Estado | Fundo | Borda | Glow |
|--------|-------|-------|------|
| Idle (sem cor) | Preto gradiente | Cinza escuro | Sombra interna sutil |
| Idle (com cor) | Preto gradiente | Cinza escuro | Sombra interna sutil |
| Ativo (sem cor) | Cinza claro | Branco | Glow branco |
| Ativo (com cor) | Cor com 25% opacidade | Cor intensa | Glow colorido |
| Loop ativo | Cor com 8% opacidade | Cor pulsante | Animação loop-border |

---

## Arquivo modificado

| Arquivo | Mudança |
|---|---|
| `src/components/DrumPad.tsx` | Linhas 191–203: reescrever `style` do botão com novo esquema de cores |

Nenhuma migração, nenhum novo arquivo, nenhuma mudança de CSS global necessária. A `animate-pad-pulse` e `animate-loop-border` já existem no `index.css` e continuam funcionando.
