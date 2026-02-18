import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Upload, Trash2, Plus, Loader2, Music, ChevronDown, ChevronUp,
  Eye, Package, Pencil, Check, X, Settings, Play, Pause, GripVertical, Save, Image
} from 'lucide-react';
import { StorePackData } from '@/hooks/useStorePacks';

const PACK_CATEGORIES = [
  'Snare', 'Kick', 'Toms', 'Hi-Hat & Pratos', 'Percussão',
  'Loops 4/4', 'Loops 3/4', 'Loops 6/8',
  'Continuous Pads', 'Efeitos Super Low', 'Efeitos Crescente Seco',
  'Efeitos Crescente Fade', 'Outros',
];

const SOUND_CATEGORIES = PACK_CATEGORIES;

const PACK_COLORS = [
  'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
  'bg-lime-500', 'bg-green-500', 'bg-teal-500', 'bg-cyan-500',
  'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500',
  'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-red-500',
];

const PACK_ICONS = [
  { key: 'drum', label: 'Drum' }, { key: 'waves', label: 'Waves' },
  { key: 'music', label: 'Music' }, { key: 'sparkles', label: 'Sparkles' },
  { key: 'headphones', label: 'Headphones' }, { key: 'volume-2', label: 'Volume' },
  { key: 'layers', label: 'Layers' }, { key: 'audio-waveform', label: 'Waveform' },
];

interface AdminPackManagerProps {
  packs: StorePackData[];
  onRefresh: () => void;
}

interface UploadingState {
  packId: string;
  soundId?: string;
  type: 'full' | 'preview' | 'icon';
}

interface SoundEdit {
  shortName: string;
  category: string;
}

interface SortableSound {
  id: string;
  name: string;
  short_name: string;
  preview_path: string | null;
  duration_ms: number;
  category?: string;
  file_path?: string;
}

interface BatchProgress {
  total: number;
  done: number;
  current: string;
}

const AdminPackManager: React.FC<AdminPackManagerProps> = ({ packs, onRefresh }) => {
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [uploading, setUploading] = useState<UploadingState | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [deletingSound, setDeletingSound] = useState<string | null>(null);
  const [showCreatePack, setShowCreatePack] = useState(false);
  const [editingPack, setEditingPack] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editingSound, setEditingSound] = useState<string | null>(null);
  const [soundEdits, setSoundEdits] = useState<Record<string, SoundEdit>>({});
  const [savingSound, setSavingSound] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<Record<string, SortableSound[]>>({});
  const [savingOrder, setSavingOrder] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{ packId: string; index: number } | null>(null);
  const dragSoundRef = useRef<{ packId: string; index: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // New pack form
  const [newPack, setNewPack] = useState({
    name: '', description: '', category: PACK_CATEGORIES[0],
    iconName: 'drum', color: 'bg-violet-500',
  });

  // Pack edit form
  const [packEdit, setPackEdit] = useState<Record<string, {
    isAvailable: boolean; priceCents: number; tag: string; name: string; description: string;
  }>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<{ packId: string; soundId?: string; type: 'full' | 'preview' | 'icon' } | null>(null);

  // ─── helpers ──────────────────────────────────────────────────────────────

  const invokeAdmin = async (formData: FormData) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Não autenticado');
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/admin-upload-sound`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || 'Erro desconhecido');
    return json;
  };

  const getAudioDurationMs = (file: File): Promise<number> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        const ms = Math.round(audio.duration * 1000);
        URL.revokeObjectURL(url);
        resolve(isFinite(ms) ? ms : 0);
      });
      audio.addEventListener('error', () => { URL.revokeObjectURL(url); resolve(0); });
    });

  const getSounds = (pack: StorePackData): SortableSound[] =>
    localOrder[pack.id] ?? (pack.sounds as SortableSound[]);

  // ─── Audio preview ────────────────────────────────────────────────────────

  const handlePlay = useCallback(async (sound: SortableSound) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (playingId === sound.id) { setPlayingId(null); return; }

    let url: string | null = null;
    if (sound.preview_path) {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      url = `https://${projectId}.supabase.co/storage/v1/object/public/sound-previews/${sound.preview_path}`;
    } else {
      const { data } = await supabase.storage.from('sound-packs').createSignedUrl(sound.file_path || '', 60);
      url = data?.signedUrl ?? null;
    }

    if (!url) { toast.error('Sem áudio disponível para preview'); return; }

    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingId(sound.id);
    audio.play().catch(() => { setPlayingId(null); toast.error('Erro ao reproduzir áudio'); });
    audio.addEventListener('ended', () => setPlayingId(null));
    audio.addEventListener('error', () => { setPlayingId(null); toast.error('Erro ao reproduzir áudio'); });
  }, [playingId]);

  // ─── Sound inline edit ────────────────────────────────────────────────────

  const startEditSound = (sound: SortableSound) => {
    setSoundEdits(prev => ({
      ...prev,
      [sound.id]: { shortName: sound.short_name, category: (sound as any).category || 'sample' },
    }));
    setEditingSound(sound.id);
  };

  const handleSaveSound = async (soundId: string) => {
    const edit = soundEdits[soundId];
    if (!edit) return;
    setSavingSound(soundId);
    try {
      const fd = new FormData();
      fd.append('action', 'update-sound');
      fd.append('soundId', soundId);
      fd.append('shortName', edit.shortName.trim());
      fd.append('category', edit.category);
      await invokeAdmin(fd);
      toast.success('Som atualizado!');
      setEditingSound(null);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSavingSound(null);
    }
  };

  // ─── Drag and drop reorder ────────────────────────────────────────────────

  const handleDragStart = (packId: string, index: number) => {
    dragSoundRef.current = { packId, index };
  };

  const handleDragOver = (e: React.DragEvent, packId: string, index: number) => {
    e.preventDefault();
    setDragOver({ packId, index });
  };

  const handleDrop = (e: React.DragEvent, pack: StorePackData, dropIndex: number) => {
    e.preventDefault();
    const drag = dragSoundRef.current;
    if (!drag || drag.packId !== pack.id || drag.index === dropIndex) {
      setDragOver(null); dragSoundRef.current = null; return;
    }
    const sounds = [...getSounds(pack)];
    const [moved] = sounds.splice(drag.index, 1);
    sounds.splice(dropIndex, 0, moved);
    setLocalOrder(prev => ({ ...prev, [pack.id]: sounds }));
    dragSoundRef.current = null;
    setDragOver(null);
  };

  const handleSaveOrder = async (pack: StorePackData) => {
    const sounds = localOrder[pack.id];
    if (!sounds) return;
    setSavingOrder(pack.id);
    try {
      const fd = new FormData();
      fd.append('action', 'reorder-sounds');
      fd.append('orderedIds', JSON.stringify(sounds.map(s => s.id)));
      await invokeAdmin(fd);
      toast.success('Ordem salva!');
      setLocalOrder(prev => { const n = { ...prev }; delete n[pack.id]; return n; });
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar ordem');
    } finally {
      setSavingOrder(null);
    }
  };

  // ─── Upload handlers ───────────────────────────────────────────────────────

  // Batch upload: multiple files
  const handleUploadSounds = async (files: File[], packId: string) => {
    setUploading({ packId, type: 'full' });
    setBatchProgress({ total: files.length, done: 0, current: files[0]?.name || '' });
    let success = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setBatchProgress({ total: files.length, done: i, current: file.name });
      try {
        const durationMs = await getAudioDurationMs(file);
        const fd = new FormData();
        fd.append('action', 'upload');
        fd.append('file', file);
        fd.append('packId', packId);
        fd.append('soundName', file.name.replace(/\.[^.]+$/, ''));
        fd.append('shortName', file.name.slice(0, 3).toUpperCase());
        fd.append('category', 'sample');
        fd.append('isPreview', 'false');
        fd.append('durationMs', String(durationMs));
        await invokeAdmin(fd);
        success++;
      } catch (e: any) {
        toast.error(`Erro em "${file.name}": ${e.message}`);
      }
    }
    setBatchProgress(null);
    setUploading(null);
    if (success > 0) {
      toast.success(files.length === 1
        ? `Som enviado! Duração: ${((await getAudioDurationMs(files[0])) / 1000).toFixed(1)}s`
        : `${success} de ${files.length} sons enviados com sucesso!`
      );
    }
    onRefresh();
  };

  const handleUploadPreview = async (file: File, packId: string, soundId: string) => {
    setUploading({ packId, soundId, type: 'preview' });
    try {
      const fd = new FormData();
      fd.append('action', 'upload');
      fd.append('file', file);
      fd.append('packId', packId);
      fd.append('soundName', `preview-${soundId}`);
      fd.append('isPreview', 'true');
      const result = await invokeAdmin(fd);
      const fd2 = new FormData();
      fd2.append('action', 'update-preview');
      fd2.append('soundId', soundId);
      fd2.append('previewPath', result.filePath);
      await invokeAdmin(fd2);
      toast.success('Preview atualizado!');
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar preview');
    } finally {
      setUploading(null);
    }
  };

  const handleUploadIcon = async (file: File, packId: string) => {
    setUploading({ packId, type: 'icon' });
    try {
      const fd = new FormData();
      fd.append('action', 'upload-icon');
      fd.append('file', file);
      fd.append('packId', packId);
      const result = await invokeAdmin(fd);
      toast.success('Ícone atualizado!');
      // Update local packEdit if editing
      if (packEdit[packId]) {
        // icon is stored in icon_name
      }
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar ícone');
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteSound = async (soundId: string) => {
    if (!confirm('Excluir este som permanentemente?')) return;
    setDeletingSound(soundId);
    try {
      const fd = new FormData();
      fd.append('action', 'delete-sound');
      fd.append('soundId', soundId);
      await invokeAdmin(fd);
      toast.success('Som excluído');
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao excluir');
    } finally {
      setDeletingSound(null);
    }
  };

  const handleCreatePack = async () => {
    if (!newPack.name.trim() || !newPack.description.trim()) {
      toast.error('Preencha nome e descrição'); return;
    }
    try {
      const fd = new FormData();
      fd.append('action', 'create-pack');
      fd.append('name', newPack.name.trim());
      fd.append('description', newPack.description.trim());
      fd.append('category', newPack.category);
      fd.append('iconName', newPack.iconName);
      fd.append('color', newPack.color);
      await invokeAdmin(fd);
      toast.success('Pack criado!');
      setShowCreatePack(false);
      setNewPack({ name: '', description: '', category: PACK_CATEGORIES[0], iconName: 'drum', color: 'bg-violet-500' });
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar pack');
    }
  };

  const handleUpdatePack = async (packId: string) => {
    const edit = packEdit[packId];
    if (!edit) return;
    try {
      const fd = new FormData();
      fd.append('action', 'update-pack');
      fd.append('packId', packId);
      fd.append('isAvailable', String(edit.isAvailable));
      fd.append('priceCents', String(edit.priceCents));
      fd.append('tag', edit.tag);
      fd.append('name', edit.name);
      fd.append('description', edit.description);
      await invokeAdmin(fd);
      toast.success('Pack atualizado!');
      setEditingPack(null);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar pack');
    }
  };

  const startEditPack = (pack: StorePackData) => {
    setPackEdit(prev => ({
      ...prev,
      [pack.id]: {
        isAvailable: pack.is_available,
        priceCents: pack.price_cents,
        tag: pack.tag || '',
        name: pack.name,
        description: pack.description,
      }
    }));
    setEditingPack(pack.id);
  };

  const dbPacks = packs.filter(p => p.id.length === 36);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          const meta = pendingUploadRef.current;
          if (files.length > 0 && meta) handleUploadSounds(files, meta.packId);
          e.target.value = '';
        }}
      />
      <input ref={previewInputRef} type="file" accept="audio/*" className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const meta = pendingUploadRef.current;
          if (file && meta?.soundId) handleUploadPreview(file, meta.packId, meta.soundId);
          e.target.value = '';
        }}
      />
      <input ref={iconInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const meta = pendingUploadRef.current;
          if (file && meta) handleUploadIcon(file, meta.packId);
          e.target.value = '';
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Painel Admin — Glory Store</h2>
        </div>
        <Button size="sm" onClick={() => setShowCreatePack(v => !v)}
          className="h-7 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="h-3 w-3 mr-1" /> Novo Pack
        </Button>
      </div>

      {/* Create Pack Form */}
      {showCreatePack && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Criar novo pack</p>
          <input className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Nome do pack" value={newPack.name}
            onChange={e => setNewPack(p => ({ ...p, name: e.target.value }))} />
          <textarea className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Descrição" rows={2} value={newPack.description}
            onChange={e => setNewPack(p => ({ ...p, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Categoria</p>
              <select className="w-full h-8 px-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none"
                value={newPack.category} onChange={e => setNewPack(p => ({ ...p, category: e.target.value }))}>
                {PACK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Ícone</p>
              <select className="w-full h-8 px-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none"
                value={newPack.iconName} onChange={e => setNewPack(p => ({ ...p, iconName: e.target.value }))}>
                {PACK_ICONS.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Cor</p>
            <div className="flex flex-wrap gap-1.5">
              {PACK_COLORS.map(c => (
                <button key={c} onClick={() => setNewPack(p => ({ ...p, color: c }))}
                  className={`h-5 w-5 rounded-full ${c} ${newPack.color === c ? 'ring-2 ring-offset-1 ring-foreground' : ''}`} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreatePack} className="flex-1 h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
              <Check className="h-3 w-3 mr-1" /> Criar Pack
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCreatePack(false)} className="h-8 text-xs">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Packs list */}
      <div className="space-y-2">
        {dbPacks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum pack no banco ainda. Crie o primeiro!</p>
        )}
        {dbPacks.map(pack => {
          const sounds = getSounds(pack);
          const hasUnsavedOrder = !!localOrder[pack.id];
          const isIconImage = pack.icon_name?.startsWith('pack-icons/') || pack.icon_name?.startsWith('http');
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          const iconUrl = isIconImage && !pack.icon_name.startsWith('http')
            ? `https://${projectId}.supabase.co/storage/v1/object/public/sound-previews/${pack.icon_name}`
            : pack.icon_name;

          return (
            <div key={pack.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Pack header */}
              <div className="flex items-center gap-3 p-3">
                {/* Icon - clickable to upload new image */}
                <div
                  className={`h-8 w-8 rounded-lg ${isIconImage ? '' : pack.color} flex items-center justify-center shrink-0 overflow-hidden relative group cursor-pointer`}
                  onClick={() => {
                    pendingUploadRef.current = { packId: pack.id, type: 'icon' };
                    iconInputRef.current?.click();
                  }}
                  title="Clique para trocar a imagem do ícone"
                >
                  {isIconImage ? (
                    <img src={iconUrl} alt={pack.name} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-4 w-4 text-white" />
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {uploading?.packId === pack.id && uploading.type === 'icon'
                      ? <Loader2 className="h-3 w-3 animate-spin text-white" />
                      : <Image className="h-3 w-3 text-white" />}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{pack.name}</p>
                  <p className="text-[10px] text-muted-foreground">{pack.category} · {pack.sounds.length} sons · {pack.is_available ? `R$ ${(pack.price_cents / 100).toFixed(2)}` : 'Oculto'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEditPack(pack)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Editar pack">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => setExpandedPack(v => v === pack.id ? null : pack.id)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    {expandedPack === pack.id
                      ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                      : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </div>
              </div>

              {/* Edit pack settings */}
              {editingPack === pack.id && packEdit[pack.id] && (
                <div className="px-3 pb-3 border-t border-border pt-3 space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Configurações do Pack</p>

                  {/* Name & Description */}
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Nome</p>
                    <input
                      className="w-full h-8 px-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={packEdit[pack.id].name}
                      onChange={e => setPackEdit(prev => ({ ...prev, [pack.id]: { ...prev[pack.id], name: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Descrição</p>
                    <textarea
                      rows={2}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                      value={packEdit[pack.id].description}
                      onChange={e => setPackEdit(prev => ({ ...prev, [pack.id]: { ...prev[pack.id], description: e.target.value } }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Preço (centavos)</p>
                      <input type="number" min={0}
                        className="w-full h-8 px-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none"
                        value={packEdit[pack.id].priceCents}
                        onChange={e => setPackEdit(prev => ({ ...prev, [pack.id]: { ...prev[pack.id], priceCents: parseInt(e.target.value) || 0 } }))} />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Tag (ex: Novo, Popular)</p>
                      <input className="w-full h-8 px-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none"
                        value={packEdit[pack.id].tag}
                        onChange={e => setPackEdit(prev => ({ ...prev, [pack.id]: { ...prev[pack.id], tag: e.target.value } }))} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={packEdit[pack.id].isAvailable}
                      onChange={e => setPackEdit(prev => ({ ...prev, [pack.id]: { ...prev[pack.id], isAvailable: e.target.checked } }))}
                      className="rounded" />
                    <span className="text-xs text-foreground">Pack disponível para compra</span>
                  </label>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdatePack(pack.id)}
                      className="flex-1 h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Check className="h-3 w-3 mr-1" /> Salvar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingPack(null)} className="h-7 text-xs">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Expanded: sounds list + upload */}
              {expandedPack === pack.id && (
                <div className="border-t border-border">
                  {/* Upload + save order */}
                  <div className="p-3 border-b border-border flex gap-2">
                    <Button size="sm" variant="outline" disabled={!!uploading}
                      className="flex-1 h-8 text-xs border-dashed"
                      onClick={() => {
                        pendingUploadRef.current = { packId: pack.id, type: 'full' };
                        fileInputRef.current?.click();
                      }}>
                      {uploading?.packId === pack.id && uploading.type === 'full'
                        ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        : <Upload className="h-3 w-3 mr-1" />}
                      {batchProgress && uploading?.packId === pack.id
                        ? `${batchProgress.done + 1}/${batchProgress.total} — ${batchProgress.current.slice(0, 20)}`
                        : 'Enviar sons (múltiplos)'}
                    </Button>
                    {hasUnsavedOrder && (
                      <Button size="sm" disabled={savingOrder === pack.id}
                        className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground px-3"
                        onClick={() => handleSaveOrder(pack)}>
                        {savingOrder === pack.id
                          ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          : <Save className="h-3 w-3 mr-1" />}
                        Salvar ordem
                      </Button>
                    )}
                  </div>

                  {/* Batch progress bar */}
                  {batchProgress && uploading?.packId === pack.id && (
                    <div className="px-3 py-2 border-b border-border">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Enviando {batchProgress.current.slice(0, 30)}...</span>
                        <span>{batchProgress.done}/{batchProgress.total}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Sounds list */}
                  <div className="divide-y divide-border max-h-80 overflow-y-auto">
                    {sounds.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">Nenhum som ainda</p>
                    )}
                    {sounds.map((sound, idx) => {
                      const isEditing = editingSound === sound.id;
                      const isDragTarget = dragOver?.packId === pack.id && dragOver?.index === idx;

                      return (
                        <div
                          key={sound.id}
                          draggable
                          onDragStart={() => handleDragStart(pack.id, idx)}
                          onDragOver={(e) => handleDragOver(e, pack.id, idx)}
                          onDrop={(e) => handleDrop(e, pack, idx)}
                          onDragEnd={() => { setDragOver(null); dragSoundRef.current = null; }}
                          className={`flex items-start gap-2 px-3 py-2 transition-colors ${isDragTarget ? 'bg-primary/10 border-t-2 border-primary' : 'hover:bg-muted/30'}`}
                        >
                          <div className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground/40 shrink-0">
                            <GripVertical className="h-3.5 w-3.5" />
                          </div>

                          <button
                            onClick={() => handlePlay(sound)}
                            className="mt-0.5 p-1 rounded-full hover:bg-primary/10 transition-colors shrink-0"
                            title={playingId === sound.id ? 'Pausar' : 'Ouvir preview'}
                          >
                            {playingId === sound.id
                              ? <Pause className="h-3 w-3 text-primary" />
                              : <Play className="h-3 w-3 text-muted-foreground" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground truncate">{sound.name}</p>
                            {isEditing ? (
                              <div className="mt-1 space-y-1">
                                <div className="flex gap-1">
                                  <div className="flex-1">
                                    <p className="text-[9px] text-muted-foreground mb-0.5">Nome curto</p>
                                    <input
                                      maxLength={6}
                                      className="w-full h-6 px-2 text-[10px] rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring uppercase"
                                      value={soundEdits[sound.id]?.shortName ?? sound.short_name}
                                      onChange={e => setSoundEdits(prev => ({ ...prev, [sound.id]: { ...prev[sound.id], shortName: e.target.value.toUpperCase() } }))}
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-[9px] text-muted-foreground mb-0.5">Categoria</p>
                                    <select
                                      className="w-full h-6 px-1 text-[10px] rounded border border-border bg-background text-foreground focus:outline-none"
                                      value={soundEdits[sound.id]?.category ?? (sound as any).category ?? 'sample'}
                                      onChange={e => setSoundEdits(prev => ({ ...prev, [sound.id]: { ...prev[sound.id], category: e.target.value } }))}
                                    >
                                      {SOUND_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    disabled={savingSound === sound.id}
                                    onClick={() => handleSaveSound(sound.id)}
                                    className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                  >
                                    {savingSound === sound.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Check className="h-2.5 w-2.5" />}
                                    Salvar
                                  </button>
                                  <button
                                    onClick={() => setEditingSound(null)}
                                    className="px-2 py-0.5 rounded text-[10px] border border-border text-foreground hover:bg-muted"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground">
                                <span className="font-mono bg-muted px-1 rounded mr-1">{sound.short_name}</span>
                                {sound.preview_path ? '✓ preview' : '✗ sem preview'}
                                {sound.duration_ms ? ` · ${(sound.duration_ms / 1000).toFixed(1)}s` : ''}
                              </p>
                            )}
                          </div>

                          {!isEditing && (
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button title="Editar nome/categoria" onClick={() => startEditSound(sound)}
                                className="p-1.5 rounded hover:bg-muted transition-colors">
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </button>
                              <button title="Enviar preview" disabled={!!uploading}
                                onClick={() => {
                                  pendingUploadRef.current = { packId: pack.id, soundId: sound.id, type: 'preview' };
                                  previewInputRef.current?.click();
                                }}
                                className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-40">
                                {uploading?.soundId === sound.id && uploading.type === 'preview'
                                  ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                  : <Eye className="h-3 w-3 text-muted-foreground" />}
                              </button>
                              <button title="Excluir som" disabled={!!deletingSound}
                                onClick={() => handleDeleteSound(sound.id)}
                                className="p-1.5 rounded hover:bg-destructive/10 transition-colors disabled:opacity-40">
                                {deletingSound === sound.id
                                  ? <Loader2 className="h-3 w-3 animate-spin text-destructive" />
                                  : <Trash2 className="h-3 w-3 text-destructive" />}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminPackManager;
