import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Upload, Trash2, Plus, Loader2, Music, ChevronDown, ChevronUp,
  Eye, EyeOff, Package, Pencil, Check, X, Settings
} from 'lucide-react';
import { StorePackData } from '@/hooks/useStorePacks';

const PACK_CATEGORIES = [
  'Snare',
  'Kick',
  'Toms',
  'Hi-Hat & Pratos',
  'Percussão',
  'Loops 4/4',
  'Loops 3/4',
  'Loops 6/8',
  'Continuous Pads',
  'Efeitos Super Low',
  'Efeitos Crescente Seco',
  'Efeitos Crescente Fade',
  'Outros',
];

const PACK_COLORS = [
  'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
  'bg-lime-500', 'bg-green-500', 'bg-teal-500', 'bg-cyan-500',
  'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500',
  'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-red-500',
];

const PACK_ICONS = [
  { key: 'drum', label: 'Drum' },
  { key: 'waves', label: 'Waves' },
  { key: 'music', label: 'Music' },
  { key: 'sparkles', label: 'Sparkles' },
  { key: 'headphones', label: 'Headphones' },
  { key: 'volume-2', label: 'Volume' },
  { key: 'layers', label: 'Layers' },
  { key: 'audio-waveform', label: 'Waveform' },
];

interface AdminPackManagerProps {
  packs: StorePackData[];
  onRefresh: () => void;
}

interface UploadingState {
  packId: string;
  soundId?: string;
  type: 'full' | 'preview';
}

const AdminPackManager: React.FC<AdminPackManagerProps> = ({ packs, onRefresh }) => {
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [uploading, setUploading] = useState<UploadingState | null>(null);
  const [deletingSound, setDeletingSound] = useState<string | null>(null);
  const [showCreatePack, setShowCreatePack] = useState(false);
  const [editingPack, setEditingPack] = useState<string | null>(null);

  // New pack form
  const [newPack, setNewPack] = useState({
    name: '', description: '', category: PACK_CATEGORIES[0],
    iconName: 'drum', color: 'bg-violet-500',
  });

  // Pack edit form
  const [packEdit, setPackEdit] = useState<Record<string, {
    isAvailable: boolean; priceCents: number; tag: string;
  }>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<{ packId: string; soundId?: string; type: 'full' | 'preview' } | null>(null);

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

  const getAudioDurationMs = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        const ms = Math.round(audio.duration * 1000);
        URL.revokeObjectURL(url);
        resolve(isFinite(ms) ? ms : 0);
      });
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve(0);
      });
    });
  };

  const handleUploadSound = async (file: File, packId: string) => {
    setUploading({ packId, type: 'full' });
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
      toast.success(`Som enviado! Duração: ${(durationMs / 1000).toFixed(1)}s`);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar som');
    } finally {
      setUploading(null);
    }
  };

  const handleUploadPreview = async (file: File, packId: string, soundId: string) => {
    setUploading({ packId, soundId, type: 'preview' });
    try {
      // First upload the preview file
      const fd = new FormData();
      fd.append('action', 'upload');
      fd.append('file', file);
      fd.append('packId', packId);
      fd.append('soundName', `preview-${soundId}`);
      fd.append('isPreview', 'true');

      const result = await invokeAdmin(fd);

      // Then update the sound record
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
      toast.error('Preencha nome e descrição');
      return;
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
      }
    }));
    setEditingPack(pack.id);
  };

  // Filter to only DB packs (not static fallbacks)
  const dbPacks = packs.filter(p => p.id.length === 36); // UUID length = 36

  return (
    <div className="space-y-4">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const meta = pendingUploadRef.current;
          if (file && meta) {
            handleUploadSound(file, meta.packId);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={previewInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const meta = pendingUploadRef.current;
          if (file && meta?.soundId) {
            handleUploadPreview(file, meta.packId, meta.soundId);
          }
          e.target.value = '';
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Painel Admin — Glory Store</h2>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreatePack(v => !v)}
          className="h-7 px-3 text-xs bg-gray-900 hover:bg-gray-800 text-white"
        >
          <Plus className="h-3 w-3 mr-1" />
          Novo Pack
        </Button>
      </div>

      {/* Create Pack Form */}
      {showCreatePack && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Criar novo pack</p>
          <input
            className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
            placeholder="Nome do pack"
            value={newPack.name}
            onChange={e => setNewPack(p => ({ ...p, name: e.target.value }))}
          />
          <textarea
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
            placeholder="Descrição"
            rows={2}
            value={newPack.description}
            onChange={e => setNewPack(p => ({ ...p, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Categoria</p>
              <select
                className="w-full h-8 px-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none"
                value={newPack.category}
                onChange={e => setNewPack(p => ({ ...p, category: e.target.value }))}
              >
                {PACK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Ícone</p>
              <select
                className="w-full h-8 px-2 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none"
                value={newPack.iconName}
                onChange={e => setNewPack(p => ({ ...p, iconName: e.target.value }))}
              >
                {PACK_ICONS.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-1">Cor</p>
            <div className="flex flex-wrap gap-1.5">
              {PACK_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewPack(p => ({ ...p, color: c }))}
                  className={`h-5 w-5 rounded-full ${c} ${newPack.color === c ? 'ring-2 ring-offset-1 ring-gray-600' : ''}`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreatePack} className="flex-1 h-8 text-xs bg-gray-900 hover:bg-gray-800 text-white">
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
          <p className="text-xs text-gray-400 text-center py-4">Nenhum pack no banco ainda. Crie o primeiro!</p>
        )}
        {dbPacks.map(pack => (
          <div key={pack.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Pack header */}
            <div className="flex items-center gap-3 p-3">
              <div className={`h-8 w-8 rounded-lg ${pack.color} flex items-center justify-center shrink-0`}>
                <Package className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{pack.name}</p>
                <p className="text-[10px] text-gray-400">{pack.category} · {pack.sounds.length} sons · {pack.is_available ? `R$ ${(pack.price_cents / 100).toFixed(2)}` : 'Oculto'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEditPack(pack)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Editar pack"
                >
                  <Pencil className="h-3.5 w-3.5 text-gray-400" />
                </button>
                <button
                  onClick={() => setExpandedPack(v => v === pack.id ? null : pack.id)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {expandedPack === pack.id
                    ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                    : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  }
                </button>
              </div>
            </div>

            {/* Edit pack settings */}
            {editingPack === pack.id && packEdit[pack.id] && (
              <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-2">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Configurações do Pack</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-gray-400 mb-0.5">Preço (centavos)</p>
                    <input
                      type="number"
                      min={0}
                      className="w-full h-8 px-2 text-xs rounded-lg border border-gray-200 focus:outline-none"
                      value={packEdit[pack.id].priceCents}
                      onChange={e => setPackEdit(prev => ({ ...prev, [pack.id]: { ...prev[pack.id], priceCents: parseInt(e.target.value) || 0 } }))}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 mb-0.5">Tag (ex: Novo, Popular)</p>
                    <input
                      className="w-full h-8 px-2 text-xs rounded-lg border border-gray-200 focus:outline-none"
                      value={packEdit[pack.id].tag}
                      onChange={e => setPackEdit(prev => ({ ...prev, [pack.id]: { ...prev[pack.id], tag: e.target.value } }))}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={packEdit[pack.id].isAvailable}
                    onChange={e => setPackEdit(prev => ({ ...prev, [pack.id]: { ...prev[pack.id], isAvailable: e.target.checked } }))}
                    className="rounded"
                  />
                  <span className="text-xs text-gray-600">Pack disponível para compra</span>
                </label>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleUpdatePack(pack.id)} className="flex-1 h-7 text-xs bg-gray-900 hover:bg-gray-800 text-white">
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
              <div className="border-t border-gray-100">
                {/* Upload new sound */}
                <div className="p-3 border-b border-gray-100">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!uploading}
                    className="w-full h-8 text-xs border-dashed"
                    onClick={() => {
                      pendingUploadRef.current = { packId: pack.id, type: 'full' };
                      fileInputRef.current?.click();
                    }}
                  >
                    {uploading?.packId === pack.id && uploading.type === 'full'
                      ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      : <Upload className="h-3 w-3 mr-1" />
                    }
                    Enviar novo som para este pack
                  </Button>
                </div>

                {/* Sounds list */}
                <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
                  {pack.sounds.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-3">Nenhum som ainda</p>
                  )}
                  {pack.sounds.map(sound => (
                    <div key={sound.id} className="flex items-center gap-2 px-3 py-2">
                      <Music className="h-3 w-3 text-gray-300 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 truncate">{sound.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {sound.preview_path ? '✓ preview' : '✗ sem preview'}
                          {sound.duration_ms ? ` · ${(sound.duration_ms / 1000).toFixed(1)}s` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Upload preview */}
                        <button
                          title="Enviar preview"
                          disabled={!!uploading}
                          onClick={() => {
                            pendingUploadRef.current = { packId: pack.id, soundId: sound.id, type: 'preview' };
                            previewInputRef.current?.click();
                          }}
                          className="p-1.5 rounded hover:bg-gray-100 transition-colors disabled:opacity-40"
                        >
                          {uploading?.soundId === sound.id && uploading.type === 'preview'
                            ? <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                            : <Eye className="h-3 w-3 text-gray-400" />
                          }
                        </button>
                        {/* Delete sound */}
                        <button
                          title="Excluir som"
                          disabled={!!deletingSound}
                          onClick={() => handleDeleteSound(sound.id)}
                          className="p-1.5 rounded hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          {deletingSound === sound.id
                            ? <Loader2 className="h-3 w-3 animate-spin text-red-400" />
                            : <Trash2 className="h-3 w-3 text-red-400" />
                          }
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPackManager;
