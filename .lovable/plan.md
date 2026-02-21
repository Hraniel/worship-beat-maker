
# MIDI completo com configuracao no menu Configuracoes

## Resumo

Criar todo o sistema MIDI (engine, hook, indicador) e adicionar uma aba "MIDI" nas Configuracoes com controle completo: dispositivo, canal (1-16 ou Todos), mapeamento dos pads, modo Learn e reset.

## Arquivos a criar

### 1. `src/lib/midi-engine.ts`

Motor central MIDI:
- `initMidi()` -- chama `navigator.requestMIDIAccess()`, escuta `statechange`
- Filtra mensagens pelo canal selecionado (bits 0-3 do status byte)
- Mapa padrao General MIDI (36=kick, 38=snare, 42=hihat-closed, etc.)
- `setChannel(ch: number | 'all')` / `getChannel()` -- persistido no localStorage (`midi-channel`)
- `setMapping(note, padId)` / `getMappings()` / `resetMappings()` -- persistido no localStorage (`midi-mappings`)
- `startLearn(padId, callback)` / `stopLearn()` -- escuta proxima nota e mapeia
- `getConnectedDevices()` -- retorna array de `{ id, name, manufacturer }`
- Callbacks: `onNoteOn(padId, velocity)`, `onDeviceChange(devices[])`

Logica de canal:
```text
status byte = data[0]
channel = (status & 0x0F) + 1   // 1-16
type    = status & 0xF0         // 0x90 = Note On, 0x80 = Note Off

if (selectedChannel === 'all' || channel === selectedChannel) {
  processar nota
}
```

### 2. `src/hooks/useMidi.ts`

Hook React:
- Inicializa `initMidi()` no mount (so se `navigator.requestMIDIAccess` existir)
- State: `isMidiSupported`, `connectedDevices`, `channel`, `mappings`, `isLearning`, `learnPadId`
- Ao receber Note On, chama `playSound(padId, velocity/127)` + `emitPadHit(padId)`
- Expoe `setChannel`, `startLearn`, `stopLearn`, `resetMappings`

### 3. `src/components/MidiIndicator.tsx`

Icone pequeno no cabecalho (visivel apenas quando `isMidiSupported`):
- Icone MIDI com badge verde se ha dispositivo conectado
- Tooltip com nome do dispositivo
- Clique abre popup rapido com nome do dispositivo e canal ativo

## Arquivos a alterar

### 4. `src/components/SettingsDialog.tsx`

Adicionar aba "MIDI" ao `TAB_ITEMS` (com icone `Piano` ou `Usb` do lucide).

Conteudo da aba MIDI:

**Secao 1 -- Status do dispositivo**
- Card mostrando se ha dispositivo conectado, com nome e fabricante
- Se nenhum dispositivo: mensagem informativa
- Se navegador nao suporta: aviso de incompatibilidade (Safari/iOS)

**Secao 2 -- Seletor de canal**
- Dropdown/select com opcoes: "Todos os canais", Canal 1, Canal 2, ... Canal 16
- Valor persistido via `setChannel()`

**Secao 3 -- Mapeamento dos pads**
- Lista dos 9 pads do grid (mesma estrutura visual da PadConfigList)
- Cada item mostra: nome do pad, nota MIDI mapeada (ex: "C2 (36)")
- Botao "Aprender" em cada pad para ativar modo Learn
- Quando em Learn, o item pisca e mostra "Toque uma tecla..."
- Ao receber nota, salva e encerra

**Secao 4 -- Acoes**
- Botao "Resetar mapeamento padrao" que restaura o mapa General MIDI

**Secao 5 -- Info**
- Card explicativo: "Conecte um controlador MIDI via USB ou Bluetooth. O app detecta automaticamente."

O componente `MidiSettings` recebera as props do hook `useMidi` via `SettingsDialog` (que recebe de `Index.tsx`).

### 5. `src/pages/Index.tsx`

- Importar e usar `useMidi()` passando os triggers dos pads
- Passar props MIDI para `SettingsDialog` (channel, mappings, devices, setChannel, startLearn, stopLearn, resetMappings)
- Renderizar `MidiIndicator` no cabecalho quando `isMidiSupported` e `connectedDevices.length > 0`

### 6. `src/components/DrumPad.tsx`

- Adicionar opcao "MIDI Learn" no menu de contexto (long press) -- so aparece se `isMidiSupported`
- Pad mostra indicador visual (borda pulsante) quando esta em modo Learn

## Sensibilidade de velocity

```text
velocity (0-127) -> volume (0.0-1.0)
velocity 0 = Note Off (ignorado)
velocity 1-127 = volume linear: velocity / 127
```

## Persistencia (localStorage)

- `midi-channel`: `"all"` ou `1-16`
- `midi-mappings`: `{ "36": "kick", "38": "snare", ... }`
