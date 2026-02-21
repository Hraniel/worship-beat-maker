

# Corrigir deteccao MIDI no Chrome PWA

## Problema

O app instalado como PWA via Chrome mostra "MIDI nao suportado" porque a verificacao sincrona `isMidiSupported()` falha antes de tentar acessar a API. Em PWAs, o acesso ao `navigator.requestMIDIAccess` pode nao estar disponivel imediatamente ou precisa ser invocado para confirmar suporte.

## Solucao

Mudar a estrategia: em vez de verificar sincronamente se a funcao existe e desistir, o hook vai **tentar chamar `initMidi()` diretamente** e usar o resultado (sucesso/falha) para determinar o suporte. Isso garante que mesmo em contextos onde a deteccao sincrona falha (PWA, iframes), o MIDI funcione se a API estiver realmente disponivel.

## Alteracoes

### 1. `src/hooks/useMidi.ts`

- Remover a verificacao sincrona `if (!checkMidiSupported()) return`
- Sempre tentar chamar `initMidi()` no mount
- Usar o retorno booleano de `initMidi()` para definir `supported = true/false`
- Manter o `initRef` para evitar dupla inicializacao

### 2. `src/lib/midi-engine.ts`

- Simplificar `isMidiSupported()` -- manter como utilidade mas nao como gate bloqueante
- Garantir que `initMidi()` retorna `false` de forma segura quando a API nao existe (ja faz isso com try/catch)

## Detalhes tecnicos

O `initMidi()` ja tem try/catch e retorna `false` se `requestMIDIAccess` falhar. A mudanca principal e no hook: em vez de checar sincronamente e nunca tentar, ele tenta sempre e reage ao resultado.

```text
Antes:
  checkMidiSupported() === false -> nunca tenta -> mostra "nao suportado"

Depois:
  initMidi() -> tenta requestMIDIAccess
    -> sucesso: supported = true
    -> falha: supported = false, mostra "nao suportado"
```

