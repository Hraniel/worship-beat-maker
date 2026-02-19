
## Duas correções: Date Picker no Repertório + Cores dos Rótulos na Navbar Admin

### 1. Date Picker no SetlistManager (Repertório)

**Problema**: O `<input type="date">` nativo fica oculto e é muito pequeno dentro do card de edição de evento. Ele tem aparência inconsistente entre plataformas (especialmente mobile).

**Solução**: Substituir o `input[type="date"]` por um Shadcn `Popover` + `Calendar`, seguindo o padrão já existente no projeto (`shadcn-datepicker`). O trigger será um botão de largura completa com ícone de calendário e a data formatada.

**Arquivo**: `src/components/SetlistManager.tsx`

Mudanças:
- Adicionar imports: `Popover`, `PopoverContent`, `PopoverTrigger` de `@/components/ui/popover`; `Calendar` de `@/components/ui/calendar`; `format`, `parseISO` de `date-fns`
- No `EventCard`, o estado `editDate` continuará como string `'YYYY-MM-DD'`, mas a interação será via calendário
- Substituir o `input[type="date"]` por:

```tsx
<Popover>
  <PopoverTrigger asChild>
    <button className="flex-1 h-7 px-2 flex items-center gap-1.5 text-xs rounded bg-background border border-input text-foreground">
      <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
      {editDate ? format(parseISO(editDate), 'dd/MM/yyyy') : 'Selecionar data'}
    </button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0 z-[200]" align="start">
    <CalendarUI
      mode="single"
      selected={editDate ? parseISO(editDate) : undefined}
      onSelect={d => d && setEditDate(format(d, 'yyyy-MM-dd'))}
      className="p-3 pointer-events-auto"
      initialFocus
    />
  </PopoverContent>
</Popover>
```

Nota: O ícone `Calendar` já está importado no SetlistManager.

---

### 2. Cores dos Rótulos na Seção "Botões da Navbar" (Admin)

**Problema**: Os color pickers para o texto dos botões (`nav_btn_login_color`, `nav_btn_signup_color`) já existem, mas estão numa seção separada chamada "Cores dos Botões da Navbar", longe dos campos de rótulo. O usuário não consegue associar facilmente.

**Solução**: Expandir a seção "Botões da Navbar" (linhas 489-494) para incluir um color picker de texto diretamente ao lado/abaixo de cada campo de label, tornando a configuração de cada botão autocontida.

**Arquivo**: `src/components/AdminLandingEditor.tsx`

A seção "Botões da Navbar" atual:
```tsx
<div className="rounded-xl p-4 space-y-3" style={groupStyle}>
  <p ...>Botões da Navbar</p>
  {renderTextField('nav_btn_login_label', 'Rótulo — Botão Entrar', ...)}
  {renderTextField('nav_btn_signup_label', 'Rótulo — Botão Criar Conta', ...)}
</div>
```

Será expandida para:
```tsx
<div className="rounded-xl p-4 space-y-4" style={groupStyle}>
  <p ...>Botões da Navbar</p>
  
  {/* Botão Entrar */}
  <div className="space-y-2">
    <p className="text-[9px] font-semibold uppercase ..." ...>Botão "Entrar"</p>
    {renderTextField('nav_btn_login_label', 'Rótulo', false, 'Entrar')}
    <div>
      <label ...>Cor do Rótulo</label>
      <ColorFieldInline key="nav_btn_login_color" ... />
    </div>
  </div>
  
  {/* Botão Criar Conta */}
  <div className="space-y-2">
    <p ...>Botão "Começar grátis"</p>
    {renderTextField('nav_btn_signup_label', 'Rótulo', false, 'Começar grátis')}
    <div>
      <label ...>Cor do Rótulo</label>
      <ColorFieldInline key="nav_btn_signup_color" ... />
    </div>
  </div>
</div>
```

A seção "Cores dos Botões da Navbar" existente (linhas 523-549) manterá os campos de cor de fundo (`nav_btn_login_bg`, `nav_btn_signup_bg`) e poderá remover as duplicatas de cor de texto que já estarão acima.

---

### Resumo das Alterações

| Arquivo | Mudança |
|---|---|
| `src/components/SetlistManager.tsx` | Substituir `input[type="date"]` por Popover + Calendar do Shadcn |
| `src/components/AdminLandingEditor.tsx` | Adicionar color pickers de texto dos botões dentro da seção "Botões da Navbar" |
