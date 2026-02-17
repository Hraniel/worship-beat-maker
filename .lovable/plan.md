

# Efeito Visual Branco nos Faders

## Resumo
Alterar o efeito visual (flash) dos faders de verde para branco, mantendo o comportamento de reagir ao som tocado em cada canal.

## Mudancas

### MixerStrip.tsx

1. **VuTicks** -- Mudar as cores das linhas iluminadas de verde/amarelo/vermelho para branco com diferentes opacidades. Quando `isLit`, usar `rgba(255,255,255,1)` em vez das cores HSL atuais. O `boxShadow` tambem sera branco.

2. **Fader fill** -- Mudar a cor de preenchimento do fader de `hsl(140 60% 45%)` (verde) para branco (`hsl(0 0% 100%)`). A opacidade ja e controlada pelo flash.

3. **Fader thumb glow** -- Mudar o brilho do thumb de verde para branco quando ativo (`hsl(0 0% 100%)` com opacidade variavel).

4. **boxShadow** -- Todos os efeitos de glow passam a usar `hsl(0 0% 100% / opacity)` em vez de verde.

## Detalhes Tecnicos

Linhas afetadas no `MixerStrip.tsx`:

- `VuTicks`: linhas ~78-90 -- substituir as 3 cores condicionais (vermelho, amarelo, verde) por branco com opacidades decrescentes (1.0, 0.8, 0.6). Shadow tambem branco.
- `Fader fill`: linha ~136 -- `backgroundColor: 'hsl(0 0% 100%)'`
- `Fader fill shadow`: linha ~138 -- shadow branco
- `Fader thumb`: linhas ~142-147 -- cor e glow brancos quando flash ativo

