# 🥁 Drum Pads Worship

App de drum pads voltado para louvor em igrejas, com sons pré-gravados, loops, metrônomo e setlists — precisa de Back end para colocar nas plataformas de download

---

## 1. Tela Principal — Grade de Pads

- Grade responsiva de pads coloridos (4x4 ou configurável) que tocam sons ao toque/clique
- Feedback visual ao tocar (animação de pulso/brilho)
- Cada pad mostra o nome do som e um ícone
- Controle de volume individual por pad e volume master
- Suporte a toque simultâneo em dispositivos mobile (multi-touch)

## 2. Biblioteca de Sons

- **Bateria acústica**: Kick, snare, hi-hat (aberto/fechado), crash, ride, toms
- **Percussão**: Shaker, pandeiro, cajón, tamborim, claps
- **Efeitos/Transições**: Risers, swells, drum fills, reverse cymbal
- **Loops prontos**: Padrões rítmicos completos em diferentes estilos (balada, pop worship, gospel)
- Sons gerados via Web Audio API (sintetizados) para funcionar sem arquivos externos

## 3. Metrônomo Integrado

- Controle de BPM com slider e botões +/-
- Indicador visual de batida (pisca no tempo)
- Opção de som do metrônomo (clique sutil ou acentuado)
- Compasso configurável (4/4, 3/4, 6/8)
- Sincronização dos loops com o BPM do metrônomo

## 4. Modo Loop

- Pads de loop que, ao serem ativados, repetem continuamente em sincronia com o BPM
- Indicador visual de que o loop está ativo (borda animada)
- Possibilidade de ativar/desativar loops sem cortar o tempo

## 5. Setlists e Configurações Salvas

- Criar e salvar configurações de pads por música (quais sons em quais pads, volumes)
- Organizar músicas em setlists para o culto
- Navegar entre músicas rapidamente durante o culto
- Dados salvos localmente no navegador (localStorage)

## 6. Design e Experiência

- Visual escuro (modo dark) ideal para uso em palcos com pouca luz
- Design limpo e minimalista, focado na usabilidade durante o culto
- Layout responsivo que funciona bem em tablets (ideal) e celulares
- Transições suaves entre telas