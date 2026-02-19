
## Popup Universal de Edição de Imagem com Recorte, Tamanho e Pré-visualização

### Visão Geral

Criar um componente `ImageCropperModal` que intercepta todos os uploads de imagem no painel admin, permite ao usuário ajustar recorte e tamanho antes de salvar, e depois chama a função de upload original com o arquivo processado.

---

### Todos os pontos de upload de imagem identificados

| Componente | Tipo | Proporção ideal |
|---|---|---|
| `AdminLandingEditor` — `ImageUploadField` (store_bg_image) | Fundo da loja | 16:9 (livre) |
| `AdminLandingEditor` — `ImageUploadField` (store_cat_X_image ×6) | Cards de categoria | 1:1 |
| `AdminLandingEditor` — `ImageUploadField` (footer_logo_url) | Logo do rodapé | 1:1 |
| `AdminLandingEditor` — `ImageUploadField` (stat_X_image ×4) | Imagens de estatísticas | 1:1 |
| `AdminLandingFeaturesEditor` — upload de foto do card | Banner do card de recurso | 16:9 |
| `AdminPackManager` — `handleUploadIcon` | Ícone do pack | 1:1 |
| `AdminPackManager` — `handleUploadBanner` | Banner do pack | 16:9 |

---

### Componente `ImageCropperModal`

**Arquivo a criar:** `src/components/ImageCropperModal.tsx`

**Como funciona internamente:**
- Usa a API Canvas nativa do browser — **sem dependência externa**
- Ao receber o arquivo bruto, cria um `<canvas>` virtual para renderizar a imagem
- Exibe uma pré-visualização interativa onde o usuário pode:
  - **Arrastar** para reposicionar o recorte
  - **Deslizar** um slider de zoom para aproximar/afastar
  - **Alternar** entre modos de proporção configuráveis pelo chamador (`1:1`, `16:9`, `livre`)
- Botão **Cancelar** — fecha sem fazer nada, sem nenhum upload
- Botão **Salvar** — renderiza o canvas com as configurações, exporta como `Blob`, chama o callback com o `File` final e fecha

**Interface do componente:**
```typescript
interface ImageCropperModalProps {
  open: boolean;
  file: File | null;                    // imagem bruta selecionada
  aspectRatio?: '1:1' | '16:9' | 'free'; // proporção de recorte
  title?: string;                       // ex: "Ícone do Pack"
  onSave: (croppedFile: File) => void; // chamado com o arquivo pronto
  onCancel: () => void;                 // fecha sem fazer nada
}
```

**Lógica interna do canvas:**
1. Ao abrir, carrega a imagem via `URL.createObjectURL(file)` em um elemento `Image`
2. Renderiza a imagem em um `<canvas>` visível (pré-visualização ao vivo)
3. O usuário controla `offsetX`, `offsetY` (drag) e `scale` (slider)
4. No "Salvar", renderiza em um canvas offscreen com as dimensões finais e chama `canvas.toBlob()`, convertendo para `File`

---

### Integração nos componentes existentes

A estratégia é **interceptar o momento em que o arquivo é selecionado** (antes do upload), abrir o modal, e só enviar após confirmação.

#### A. `AdminLandingEditor.tsx` — `ImageUploadField`

Atualmente: `onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}`

Mudança: adicionar estado `pendingFile` e `cropperOpen`. Quando o usuário seleciona um arquivo, abre o cropper. No `onSave` do cropper, chama `handleUpload(croppedFile)`. No `onCancel`, limpa tudo.

A prop `aspectRatio` será passada por cada chamador de `ImageUploadField`:
- `store_bg_image` → `16:9`
- `store_cat_X_image` → `1:1`
- `footer_logo_url` → `1:1`
- `stat_X_image` → `1:1`

#### B. `AdminLandingFeaturesEditor.tsx`

No `handleFileChange`, em vez de fazer upload direto, abre o `ImageCropperModal` com `aspectRatio="16:9"`. O `onSave` recebe o arquivo recortado e executa o upload real.

#### C. `AdminPackManager.tsx`

- Para ícones (`iconInputRef`): abrir cropper com `aspectRatio="1:1"`, title "Ícone do Pack"
- Para banners (`bannerInputRef`): abrir cropper com `aspectRatio="16:9"`, title "Banner do Pack"
- Adicionar estados `cropperOpen`, `cropperFile`, `cropperType` e `cropperPackId` para saber qual upload executar no `onSave`

---

### Layout visual do `ImageCropperModal`

```text
┌──────────────────────────────────────────────────┐
│  ✂️ Ajustar Imagem — [título opcional]            │
│                                            [ X ] │
├──────────────────────────────────────────────────┤
│                                                  │
│   ┌──────────────────────────────────────────┐   │
│   │                                          │   │
│   │        CANVAS DE PRÉ-VISUALIZAÇÃO        │   │
│   │     (arrastar para mover o recorte)      │   │
│   │                                          │   │
│   │   ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐  │   │
│   │     ÁREA DE RECORTE (borda tracejada)   │   │
│   │   └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘  │   │
│   └──────────────────────────────────────────┘   │
│                                                  │
│   🔍 Zoom                                        │
│   ├─────────●──────────────────────────────┤     │
│   50%                                    200%    │
│                                                  │
│   Proporção:  [1:1]  [16:9]  [Livre]             │
│                                                  │
├──────────────────────────────────────────────────┤
│       [ Cancelar ]              [ ✓ Salvar ]     │
└──────────────────────────────────────────────────┘
```

---

### Detalhes Técnicos

**Canvas nativo sem bibliotecas externas:**
- `useRef<HTMLCanvasElement>` para o canvas de pré-visualização
- `useEffect` para redesenhar sempre que `offsetX`, `offsetY`, `scale` ou `aspectRatio` mudam
- Eventos `onPointerDown`, `onPointerMove`, `onPointerUp` para arrastar
- `canvas.toBlob('image/jpeg', 0.92)` no salvar para comprimir levemente

**Dimensões de saída por proporção:**
- `1:1` → 512×512px
- `16:9` → 1280×720px
- `livre` → largura original, altura original (apenas comprime)

**Prop `aspectRatio` adicionada ao `ImageUploadField`:**
```typescript
interface ImageUploadFieldProps {
  // ... props existentes ...
  aspectRatio?: '1:1' | '16:9' | 'free';
}
```

---

### Resumo de Arquivos a Criar/Modificar

| Arquivo | Operação | O que muda |
|---|---|---|
| `src/components/ImageCropperModal.tsx` | **CRIAR** | Componente completo de recorte com canvas nativo |
| `src/components/AdminLandingEditor.tsx` | **EDITAR** | `ImageUploadField` intercepta arquivo → abre cropper → upload |
| `src/components/AdminLandingFeaturesEditor.tsx` | **EDITAR** | `handleFileChange` intercepta → abre cropper → upload |
| `src/components/AdminPackManager.tsx` | **EDITAR** | Intercepta icon e banner inputs → abre cropper → upload |

**Nenhuma nova dependência npm necessária** — tudo via Canvas API nativa.
