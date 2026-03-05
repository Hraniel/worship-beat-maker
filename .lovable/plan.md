

# Bloquear controles Stereo/Mono e Pan para usuários Free

## Contexto
Os controles globais de roteamento de áudio (Stereo/Mono + direcionamento L/R) no menu Configurações → Áudio estão acessíveis a todos os planos. O pan individual dos pads já é bloqueado para Free. A mesma regra deve ser aplicada aos controles globais.

## Alteração

**Arquivo:** `src/components/SettingsDialog.tsx`

Na aba `audio` (linhas ~893-912), envolver os 3 componentes `<StereoOption>` com a mesma lógica de bloqueio usada no MIDI:
- Verificar `canAccess('pan_control')` (mesmo gate usado no pad individual)
- Se bloqueado: renderizar os `<StereoOption>` com `opacity-40 pointer-events-none` e um overlay com cadeado + texto "Plano Pro" clicável que abre o `UpgradeGateModal`
- Se permitido: renderizar normalmente como está hoje

A estrutura será idêntica ao padrão já usado no mixer e nos efeitos dos pads:
```text
<div className="relative">
  {!allowed && <overlay com Lock + "Plano Pro" />}
  <div className={!allowed ? "opacity-40 pointer-events-none" : ""}>
    <StereoOption ... />
    <StereoOption ... />
    <StereoOption ... />
  </div>
</div>
```

O `AudioOutputSelector` permanece livre para todos (seleção de dispositivo é funcionalidade básica).

## Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/components/SettingsDialog.tsx` | Envolver StereoOptions com overlay de bloqueio Pro |

