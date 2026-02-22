

## Adicionar `navigator.requestMIDIAccess()` no midi-engine

O codigo sera inserido na funcao `initMidi()` do arquivo `src/lib/midi-engine.ts`, que ja e o local correto onde o acesso MIDI e solicitado.

### Mudanca

**Arquivo: `src/lib/midi-engine.ts`** - Funcao `initMidi()`

Atualmente a funcao ja chama `navigator.requestMIDIAccess({ sysex: false })`. Vamos adicionar os logs de `console.log("MIDI enabled:", midi)` e `console.error("MIDI failed:", err)` ao fluxo existente, mantendo toda a logica atual funcionando.

O `try/catch` existente sera atualizado para incluir esses logs:
- No sucesso: `console.log("MIDI enabled:", midiAccess)` apos obter o acesso
- No erro: `console.error("MIDI failed:", err)` no catch (ja existe um `console.warn`, sera complementado)

Nenhum outro arquivo precisa ser alterado.

### Detalhes tecnicos

- A chamada ja existe no codigo, apenas os logs serao adicionados
- No iOS/Safari a funcao `isMidiSupported()` retorna `false` e a funcao nem tenta chamar `requestMIDIAccess`. Para garantir que a tentativa aconteca mesmo no Safari, a verificacao `isMidiSupported()` sera mantida mas os logs serao adicionados para depuracao
- Se o usuario quiser forcar a tentativa mesmo quando `requestMIDIAccess` nao existe, podemos remover o early return — mas isso causaria erro no Safari. A abordagem segura e manter o check e logar quando nao suportado

