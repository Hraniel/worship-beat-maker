

# Plano: Funcionalidades Diferenciais para Worship (4 features)

Removendo a feature "Pad Sugerido por IA" conforme solicitado. As 4 funcionalidades a implementar são:

## 1. Mapa de Dinâmicas por Seção (Song Dynamics Map)
- Novo campo `sections` no tipo `SetlistSong` (array de `{name, startMeasure, endMeasure, intensity}`)
- Nova tabela ou coluna JSON no banco para persistir seções por música
- Novo componente `SongDynamicsBar` exibido no `PerformanceMode` — barra horizontal colorida (azul→vermelho por intensidade) que avança com o metrônomo
- Editor de seções no formulário de música do setlist

## 2. Sinalização ao Vivo entre Músicos (Live Cues)
- Nova tabela `live_cues` com Realtime habilitado
- Componente `LiveCuePanel` no rodapé do `PerformanceMode` com botões de cue rápido ("Refrão", "Desce", "Sobe", "Corta", "Ministração")
- Flash colorido fullscreen de 2s em todos os dispositivos conectados ao mesmo setlist/evento
- Canal Realtime por evento/setlist

## 3. Modo Ensaio com Contador de Compassos
- Novo componente `RehearsalCounter` — contador grande de compassos (ex: "12/32")
- Campo `markers` no `SetlistSong` para marcadores de passagem configuráveis
- Alertas visuais 2 compassos antes de cada marcador ("Virada em 2!")
- Integração com o metrônomo existente para sincronização

## 4. Transposição Rápida para Tecladistas
- Botões +/- semitons ao lado da tonalidade no `PerformanceMode`
- Estado local `transpose` (não altera o setlist salvo)
- Exibe tom original e tom transposto
- Lógica de cálculo de transposição (C + 2 = D, etc.)

## Ordem de implementação sugerida
1. Transposição Rápida (menor esforço, impacto imediato)
2. Modo Ensaio com Contador
3. Mapa de Dinâmicas
4. Sinalização ao Vivo (maior esforço, requer Realtime + migração)

