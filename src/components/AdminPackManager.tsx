import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ImageCropperModal from './ImageCropperModal';
import { Button } from '@/components/ui/button';
import {
  Upload, Trash2, Plus, Loader2, Music, ChevronDown, ChevronUp,
  Eye, Package, Pencil, Check, X, Settings, Play, Pause, GripVertical, Save, Image,
  Copy, Bell, BarChart2, Users, Calendar,
} from 'lucide-react';
import { StorePackData } from '@/hooks/useStorePacks';
import AdminAnalytics from '@/components/AdminAnalytics';
import AdminUserManager from '@/components/AdminUserManager';
import AdminSuggestionsManager from '@/components/AdminSuggestionsManager';
import AdminPricingManager from '@/components/AdminPricingManager';
import AdminNotificationManager from '@/components/AdminNotificationManager';
import AdminLandingEditor from '@/components/AdminLandingEditor';
import AdminCacheManager from '@/components/AdminCacheManager';
import AdminStoreEditor from '@/components/AdminStoreEditor';
import AdminAppConfigEditor from '@/components/AdminAppConfigEditor';
import AdminBanManager from '@/components/AdminBanManager';
import AdminCancellationViewer from '@/components/AdminCancellationViewer';
import AdminDashboardSummary from '@/components/AdminDashboardSummary';
import AdminAIPromptManager from '@/components/AdminAIPromptManager';
import AdminTicketManager from '@/components/AdminTicketManager';
import { broadcastPushNotification } from '@/lib/push-notifications';


const PACK_CATEGORIES = [
  'Snare', 'Kick', 'Toms', 'Hi-Hat & Pratos', 'Percussão',
  'Loops 4/4', 'Loops 3/4', 'Loops 6/8',
  'Continuous Pads', 'Efeitos Super Low', 'Efeitos Crescente Seco',
  'Efeitos Crescente Fade', 'Outros',
];



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
  type: 'full' | 'preview' | 'icon' | 'banner';
}

interface SoundEdit {
  shortName: string;
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
  const [activeTab, setActiveTab] = useState<'packs' | 'analytics' | 'users' | 'notifications' | 'suggestions' | 'pricing' | 'landing' | 'cache' | 'store' | 'app-config' | 'bans' | 'cancellations' | 'ai-prompt' | 'tickets'>('packs');
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
  const [cloningPack, setCloningPack] = useState<string | null>(null);
  const [notifyingPack, setNotifyingPack] = useState<string | null>(null);
  const dragSoundRef = useRef<{ packId: string; index: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperFile, setCropperFile] = useState<File | null>(null);
  const [cropperType, setCropperType] = useState<'icon' | 'banner'>('icon');

  // New pack form
  const [newPack, setNewPack] = useState({
    name: '', description: '', category: PACK_CATEGORIES[0],
    iconName: 'drum', color: 'bg-violet-500', priceBrl: '',
  });

  // Pack edit form
  const [packEdit, setPackEdit] = useState<Record<string, {
    isAvailable: boolean; priceBrl: string; tag: string; name: string; description: string; publishAt: string;
  }>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<{ packId: string; soundId?: string; type: 'full' | 'preview' | 'icon' | 'banner' } | null>(null);

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
      [sound.id]: { shortName: sound.short_name },
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
      await invokeAdmin(fd);
      toast.success('Ícone atualizado!');
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar ícone');
    } finally {
      setUploading(null);
    }
  };

  const handleUploadBanner = async (file: File, packId: string) => {
    setUploading({ packId, type: 'banner' });
    try {
      const fd = new FormData();
      fd.append('action', 'upload-banner');
      fd.append('file', file);
      fd.append('packId', packId);
      await invokeAdmin(fd);
      toast.success('Banner atualizado!');
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar banner');
    } finally {
      setUploading(null);
    }
  };

  // ── Cropper handlers ──────────────────────────────────────────────────────
  const handleCropSave = (croppedFile: File) => {
    setCropperOpen(false);
    const meta = pendingUploadRef.current;
    setCropperFile(null);
    if (!meta) return;
    if (meta.type === 'icon') handleUploadIcon(croppedFile, meta.packId);
    else if (meta.type === 'banner') handleUploadBanner(croppedFile, meta.packId);
  };

  const handleCropCancel = () => {
    setCropperOpen(false);
    setCropperFile(null);
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

  const [creatingPack, setCreatingPack] = useState(false);

  const handleCreatePack = async () => {
    if (!newPack.name.trim() || !newPack.description.trim()) {
      toast.error('Preencha nome e descrição'); return;
    }
    // Parse BRL price → cents
    const priceCents = newPack.priceBrl.trim()
      ? Math.round(parseFloat(newPack.priceBrl.replace(',', '.')) * 100)
      : 0;
    if (newPack.priceBrl.trim() && (isNaN(priceCents) || priceCents < 0)) {
      toast.error('Preço inválido'); return;
    }
    setCreatingPack(true);
    try {
      const fd = new FormData();
      fd.append('action', 'create-pack');
      fd.append('name', newPack.name.trim());
      fd.append('description', newPack.description.trim());
      fd.append('category', newPack.category);
      fd.append('iconName', newPack.iconName);
      fd.append('color', newPack.color);
      fd.append('priceCents', String(priceCents));
      const result = await invokeAdmin(fd);

      // Sync price with Stripe if paid
      if (priceCents > 0 && result?.packId) {
        try {
          const syncResp = await supabase.functions.invoke('admin-sync-stripe-price', {
            body: {
              type: 'pack',
              id: result.packId,
              price_cents: priceCents,
              name: newPack.name.trim(),
              current_stripe_price_id: null,
              current_stripe_product_id: null,
            },
          });
          if (!syncResp.error && syncResp.data) {
            const { stripe_price_id, stripe_product_id } = syncResp.data;
            await supabase.from('store_packs').update({ stripe_price_id, stripe_product_id }).eq('id', result.packId);
            toast.success('Pack criado e sincronizado com Stripe!');
          } else {
            toast.success('Pack criado! (Stripe: verifique manualmente)');
          }
        } catch {
          toast.success('Pack criado! (falha ao sincronizar Stripe)');
        }
      } else {
        toast.success('Pack criado!');
      }

      setShowCreatePack(false);
      setNewPack({ name: '', description: '', category: PACK_CATEGORIES[0], iconName: 'drum', color: 'bg-violet-500', priceBrl: '' });
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar pack');
    } finally {
      setCreatingPack(false);
    }
  };

  const handleUpdatePack = async (packId: string) => {
    const edit = packEdit[packId];
    if (!edit) return;
    const pack = packs.find(p => p.id === packId);
    if (!pack) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

      // Convert BRL string to cents
      const priceCents = edit.priceBrl.trim()
        ? Math.round(parseFloat(edit.priceBrl.replace(',', '.')) * 100)
        : 0;

      const fd = new FormData();
      fd.append('action', 'update-pack');
      fd.append('packId', packId);
      fd.append('isAvailable', String(edit.isAvailable));
      fd.append('priceCents', String(priceCents));
      fd.append('tag', edit.tag);
      fd.append('name', edit.name);
      fd.append('description', edit.description);
      fd.append('publishAt', edit.publishAt);

      const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-upload-sound`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Erro ao salvar pack');

      // ── Sync price with Stripe if price changed and pack is paid ──────────
      const priceChanged = priceCents !== pack.price_cents;
      if (priceChanged && priceCents > 0) {
        try {
          const syncResp = await supabase.functions.invoke('admin-sync-stripe-price', {
            body: {
              type: 'pack',
              id: packId,
              price_cents: priceCents,
              name: edit.name || pack.name,
              current_stripe_price_id: (pack as any).stripe_price_id ?? null,
              current_stripe_product_id: (pack as any).stripe_product_id ?? null,
            },
          });
          if (syncResp.error) throw syncResp.error;
          const { stripe_price_id, stripe_product_id } = syncResp.data;

          // Save stripe IDs back to DB
          await supabase.from('store_packs').update({ stripe_price_id, stripe_product_id }).eq('id', packId);
          toast.success('Preço sincronizado com Stripe!');
        } catch (stripeErr: any) {
          console.error('Stripe sync failed:', stripeErr);
          toast.error(`Pack salvo, mas falha ao sincronizar Stripe: ${stripeErr?.message || stripeErr}`);
        }
      }

      toast.success('Pack atualizado!');
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar pack');
    }
  };

  const handleDuplicatePack = async (packId: string) => {
    setCloningPack(packId);
    try {
      const fd = new FormData();
      fd.append('action', 'duplicate-pack');
      fd.append('packId', packId);
      await invokeAdmin(fd);
      toast.success('Pack duplicado! Veja ao final da lista.');
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao duplicar pack');
    } finally {
      setCloningPack(null);
    }
  };

  const handleDeletePack = async (pack: StorePackData) => {
    const soundCount = pack.sounds.length;
    const confirmMsg = soundCount > 0
      ? `Excluir permanentemente "${pack.name}" e seus ${soundCount} sons? Esta ação não pode ser desfeita.`
      : `Excluir permanentemente "${pack.name}"? Esta ação não pode ser desfeita.`;
    if (!confirm(confirmMsg)) return;
    try {
      const fd = new FormData();
      fd.append('action', 'delete-pack');
      fd.append('packId', pack.id);
      await invokeAdmin(fd);
      toast.success(`Pack "${pack.name}" excluído permanentemente.`);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao excluir pack');
    }
  };

  const handleNotifyUsers = async (packName: string) => {
    setNotifyingPack(packName);
    try {
      await broadcastPushNotification('🎵 Novo Pack Disponível!', `"${packName}" já está na Glory Store. Confira agora!`);
      toast.success(`Notificação enviada para todos os usuários!`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar notificação');
    } finally {
      setNotifyingPack(null);
    }
  };



  const startEditPack = (pack: StorePackData) => {
    const brl = pack.price_cents > 0
      ? (pack.price_cents / 100).toFixed(2).replace('.', ',')
      : '';
    setPackEdit(prev => ({
      ...prev,
      [pack.id]: {
        isAvailable: pack.is_available,
        priceBrl: brl,
        tag: pack.tag || '',
        name: pack.name,
        description: pack.description,
        publishAt: (pack as any).publish_at ? new Date((pack as any).publish_at).toISOString().slice(0, 16) : '',
      }
    }));
    setEditingPack(pack.id);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Dashboard summary */}
      <AdminDashboardSummary />
      {/* Image cropper modal */}
      <ImageCropperModal
        open={cropperOpen}
        file={cropperFile}
        aspectRatio={cropperType === 'icon' ? '1:1' : '16:9'}
        title={cropperType === 'icon' ? 'Ícone do Pack' : 'Banner do Pack'}
        onSave={handleCropSave}
        onCancel={handleCropCancel}
      />
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a,.aiff,.aif,.wma"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          const meta = pendingUploadRef.current;
          if (files.length > 0 && meta) handleUploadSounds(files, meta.packId);
          e.target.value = '';
        }}
      />
      <input ref={previewInputRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a,.aiff,.aif,.wma" className="hidden"
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
          e.target.value = '';
          if (file) {
            setCropperType('icon');
            setCropperFile(file);
            setCropperOpen(true);
          }
        }}
      />
      <input ref={bannerInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) {
            setCropperType('banner');
            setCropperFile(file);
            setCropperOpen(true);
          }
        }}
      />

      {/* Tab navigation — organized by groups */}
      <div className="space-y-2">
        {/* Group: Loja */}
        <div className="flex gap-1 flex-wrap items-center">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mr-1">Loja</span>
          {([
            { key: 'packs', label: '📦 Packs' },
            { key: 'store', label: '🎨 Visual' },
            { key: 'pricing', label: '💳 Planos' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}>{tab.label}</button>
          ))}
        </div>
        {/* Group: Landing Page */}
        <div className="flex gap-1 flex-wrap items-center">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mr-1">Site</span>
          {([
            { key: 'landing', label: '🌐 Landing Page' },
            { key: 'cache', label: '🗑️ Cache' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}>{tab.label}</button>
          ))}
        </div>
        {/* Group: App */}
        <div className="flex gap-1 flex-wrap items-center">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mr-1">App</span>
          {([
            { key: 'app-config', label: '⚙️ Configurações' },
            { key: 'ai-prompt', label: '🤖 IA Assistente' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}>{tab.label}</button>
          ))}
        </div>
        {/* Group: Gestão */}
        <div className="flex gap-1 flex-wrap items-center">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mr-1">Gestão</span>
          {([
            { key: 'users', label: '👥 Usuários' },
            { key: 'bans', label: '🚫 Bans' },
            { key: 'analytics', label: '📊 Analytics' },
            { key: 'notifications', label: '🔔 Notificações' },
            { key: 'suggestions', label: '💡 Sugestões' },
            { key: 'tickets', label: '🎫 Tickets' },
            { key: 'cancellations', label: '📉 Cancelamentos' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}>{tab.label}</button>
          ))}
        </div>
      </div>

      {activeTab === 'analytics' && <AdminAnalytics />}
      {activeTab === 'users' && <AdminUserManager />}
      {activeTab === 'notifications' && <AdminNotificationManager />}
      {activeTab === 'suggestions' && <AdminSuggestionsManager />}
      {activeTab === 'pricing' && <AdminPricingManager />}
      {activeTab === 'landing' && <AdminLandingEditor />}
      {activeTab === 'store' && <AdminStoreEditor />}
      {activeTab === 'cache' && <AdminCacheManager />}
      {activeTab === 'app-config' && <AdminAppConfigEditor />}
      {activeTab === 'bans' && <AdminBanManager />}
      {activeTab === 'cancellations' && <AdminCancellationViewer />}
      {activeTab === 'ai-prompt' && <AdminAIPromptManager />}
      {activeTab === 'tickets' && <AdminTicketManager />}

      {activeTab === 'packs' && (
        <>
          {/* Create pack floating modal */}
          {showCreatePack && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm space-y-3 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Novo Pack</h4>
                  <button onClick={() => setShowCreatePack(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <input
                  className="w-full h-9 px-3 text-xs rounded-lg bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Nome do pack *"
                  value={newPack.name}
                  onChange={e => setNewPack(p => ({ ...p, name: e.target.value }))}
                />
                <textarea
                  className="w-full px-3 py-2 text-xs rounded-lg bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  rows={2}
                  placeholder="Descrição *"
                  value={newPack.description}
                  onChange={e => setNewPack(p => ({ ...p, description: e.target.value }))}
                />
                <select
                  className="w-full h-9 px-3 text-xs rounded-lg bg-muted border border-border focus:outline-none"
                  value={newPack.category}
                  onChange={e => setNewPack(p => ({ ...p, category: e.target.value }))}
                >
                  {PACK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex gap-2">
                  <select
                    className="flex-1 h-9 px-3 text-xs rounded-lg bg-muted border border-border focus:outline-none"
                    value={newPack.iconName}
                    onChange={e => setNewPack(p => ({ ...p, iconName: e.target.value }))}
                  >
                    {PACK_ICONS.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
                  </select>
                  <select
                    className="flex-1 h-9 px-3 text-xs rounded-lg bg-muted border border-border focus:outline-none"
                    value={newPack.color}
                    onChange={e => setNewPack(p => ({ ...p, color: e.target.value }))}
                  >
                    {PACK_COLORS.map(c => <option key={c} value={c}>{c.replace('bg-', '').replace('-500', '')}</option>)}
                  </select>
                </div>
                {/* Price field */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">R$</span>
                  <input
                    className="w-full h-9 pl-8 pr-3 text-xs rounded-lg bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="0,00 (grátis se vazio)"
                    value={newPack.priceBrl}
                    inputMode="decimal"
                    onChange={e => {
                      // Allow only numbers, comma and dot
                      const val = e.target.value.replace(/[^0-9.,]/g, '');
                      setNewPack(p => ({ ...p, priceBrl: val }));
                    }}
                  />
                </div>
                {newPack.priceBrl.trim() && !isNaN(parseFloat(newPack.priceBrl.replace(',', '.'))) && parseFloat(newPack.priceBrl.replace(',', '.')) > 0 && (
                  <p className="text-[10px] text-muted-foreground -mt-1 px-0.5 flex items-center gap-1">
                    <span className="text-primary">✓</span>
                    Será sincronizado com Stripe automaticamente
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleCreatePack} disabled={creatingPack} className="flex-1 h-9 text-xs">
                    {creatingPack ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                    {creatingPack ? 'Criando…' : 'Criar Pack'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowCreatePack(false)} disabled={creatingPack} className="h-9 text-xs">Cancelar</Button>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Packs ({packs.length})</h3>
            <button
              onClick={() => setShowCreatePack(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo Pack
            </button>
          </div>

          {/* Pack list */}
          <div className="space-y-2">
            {packs.map(pack => {
              const sounds = getSounds(pack);
              const hasUnsavedOrder = !!localOrder[pack.id];
              const isIconImage = pack.icon_name?.startsWith('pack-icons/') || pack.icon_name?.startsWith('http');
              const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
              const iconUrl = isIconImage && !pack.icon_name.startsWith('http')
                ? `https://${projectId}.supabase.co/storage/v1/object/public/sound-previews/${pack.icon_name}`
                : pack.icon_name;
              const hasBanner = !!(pack as any).banner_url;
              const bannerDisplayUrl = hasBanner
                ? ((pack as any).banner_url.startsWith('http')
                    ? (pack as any).banner_url
                    : `https://${projectId}.supabase.co/storage/v1/object/public/sound-previews/${(pack as any).banner_url}`)
                : null;

              return (
                <div key={pack.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Banner preview */}
                  {hasBanner && (
                    <div className="relative h-14 w-full overflow-hidden bg-muted">
                      <img src={bannerDisplayUrl!} alt="banner" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          className="bg-muted/80 hover:bg-muted rounded-lg px-2 py-1 flex items-center gap-1 text-[10px] text-foreground transition-colors"
                          onClick={() => {
                            pendingUploadRef.current = { packId: pack.id, type: 'banner' };
                            bannerInputRef.current?.click();
                          }}
                        >
                          <Image className="h-3 w-3" />
                          Trocar
                        </button>
                        <button
                          className="bg-destructive/80 hover:bg-destructive rounded-lg px-2 py-1 flex items-center gap-1 text-[10px] text-destructive-foreground transition-colors"
                          onClick={async () => {
                            if (!confirm('Remover banner deste pack?')) return;
                            try {
                              const fd = new FormData();
                              fd.append('action', 'remove-banner');
                              fd.append('packId', pack.id);
                              await invokeAdmin(fd);
                              toast.success('Banner removido');
                              onRefresh();
                            } catch (e: any) {
                              toast.error(e.message || 'Erro ao remover banner');
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                          Remover
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Pack header */}
                  <div className="flex items-center gap-3 p-3">
                    {/* Icon */}
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
                        <Music className="h-4 w-4 text-white" />
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="h-3 w-3 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground truncate">{pack.name}</span>
                        {pack.is_available
                          ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 font-medium">Ativo</span>
                          : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Rascunho</span>
                        }
                        {pack.tag && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{pack.tag}</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {sounds.length} sons · {pack.price_cents === 0 ? 'Grátis' : `R$${(pack.price_cents / 100).toFixed(2)}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Banner upload button */}
                      {!hasBanner && (
                        <button
                          onClick={() => {
                            pendingUploadRef.current = { packId: pack.id, type: 'banner' };
                            bannerInputRef.current?.click();
                          }}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                          title="Adicionar banner"
                        >
                          {uploading?.packId === pack.id && uploading?.type === 'banner'
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            : <Image className="h-3.5 w-3.5 text-muted-foreground" />}
                        </button>
                      )}

                      {/* Notify users */}
                      <button
                        onClick={() => handleNotifyUsers(pack.name)}
                        disabled={notifyingPack === pack.name}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title="Notificar usuários"
                      >
                        {notifyingPack === pack.name
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          : <Bell className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>

                      {/* Duplicate pack */}
                      <button
                        onClick={() => handleDuplicatePack(pack.id)}
                        disabled={cloningPack === pack.id}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title="Duplicar pack"
                      >
                        {cloningPack === pack.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>

                      {/* Edit pack */}
                      <button
                        onClick={() => editingPack === pack.id ? setEditingPack(null) : startEditPack(pack)}
                        className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                        title="Editar pack"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>

                      {/* Delete pack */}
                      <button
                        onClick={() => handleDeletePack(pack)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                        title="Excluir pack permanentemente"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive/60 hover:text-destructive" />
                      </button>

                      {/* Expand/collapse */}
                      <button
                        onClick={() => setExpandedPack(expandedPack === pack.id ? null : pack.id)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      >
                        {expandedPack === pack.id
                          ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>

                  {/* Edit pack settings */}
                  {editingPack === pack.id && packEdit[pack.id] && (
                    <div className="px-3 pb-3 border-t border-border pt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="h-8 px-2.5 text-xs rounded-lg bg-muted border border-border focus:outline-none"
                          placeholder="Nome"
                          value={packEdit[pack.id].name}
                          onChange={e => setPackEdit(p => ({ ...p, [pack.id]: { ...p[pack.id], name: e.target.value } }))}
                        />
                        <input
                          className="h-8 px-2.5 text-xs rounded-lg bg-muted border border-border focus:outline-none"
                          placeholder="Tag (ex: NOVO)"
                          value={packEdit[pack.id].tag}
                          onChange={e => setPackEdit(p => ({ ...p, [pack.id]: { ...p[pack.id], tag: e.target.value } }))}
                        />
                      </div>
                      <div>
                        <textarea
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-muted border border-border focus:outline-none resize-none"
                          rows={2}
                          placeholder="Descrição"
                          value={packEdit[pack.id].description}
                          onChange={e => setPackEdit(p => ({ ...p, [pack.id]: { ...p[pack.id], description: e.target.value } }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="h-8 flex items-center px-2.5 text-xs rounded-l-lg bg-muted border border-r-0 border-border text-muted-foreground select-none">R$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="h-8 px-2.5 text-xs rounded-r-lg bg-muted border border-border focus:outline-none flex-1"
                            placeholder="0,00"
                            value={packEdit[pack.id].priceBrl}
                            onChange={e => setPackEdit(p => ({ ...p, [pack.id]: { ...p[pack.id], priceBrl: e.target.value } }))}
                          />
                          <input
                            type="datetime-local"
                            className="h-8 px-2.5 text-xs rounded-lg bg-muted border border-border focus:outline-none"
                            value={packEdit[pack.id].publishAt}
                            onChange={e => setPackEdit(p => ({ ...p, [pack.id]: { ...p[pack.id], publishAt: e.target.value } }))}
                          />
                        </div>
                        {(() => {
                          const brl = packEdit[pack.id].priceBrl;
                          const cents = brl.trim() ? Math.round(parseFloat(brl.replace(',', '.')) * 100) : 0;
                          const hasStripe = !!(pack as any).stripe_price_id;
                          if (cents > 0) return (
                            <p className="text-[10px] text-emerald-500">✓ Será sincronizado com Stripe automaticamente{hasStripe && ' · 🔗 Stripe já vinculado'}</p>
                          );
                          return null;
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={packEdit[pack.id].isAvailable}
                            onChange={e => setPackEdit(p => ({ ...p, [pack.id]: { ...p[pack.id], isAvailable: e.target.checked } }))}
                          />
                          <span className="text-xs text-foreground">Disponível na loja</span>
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdatePack(pack.id)} className="flex-1 h-7 text-xs">
                          <Save className="h-3 w-3 mr-1" /> Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingPack(null)} className="h-7 text-xs">Cancelar</Button>
                      </div>
                    </div>
                  )}

                  {/* Batch progress */}
                  {batchProgress && uploading?.packId === pack.id && (
                    <div className="px-3 pb-2">
                      <div className="text-[10px] text-muted-foreground mb-1">
                        {batchProgress.done}/{batchProgress.total} — {batchProgress.current}
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Sounds list */}
                  {expandedPack === pack.id && (
                    <div className="border-t border-border">
                      {/* Add sounds toolbar */}
                      <div className="px-3 py-2 flex items-center justify-between border-b border-border bg-muted/30">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                          {sounds.length} som{sounds.length !== 1 ? 's' : ''}
                        </span>
                        <button
                          onClick={() => {
                            pendingUploadRef.current = { packId: pack.id, type: 'full' };
                            fileInputRef.current?.click();
                          }}
                          disabled={uploading?.packId === pack.id && uploading?.type === 'full'}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {uploading?.packId === pack.id && uploading?.type === 'full'
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Plus className="h-3 w-3" />}
                          Adicionar Sons
                        </button>
                      </div>

                      {hasUnsavedOrder && (
                        <div className="px-3 py-2 flex items-center justify-between bg-amber-500/10">
                          <span className="text-[10px] text-amber-600">Ordem alterada — salvar?</span>
                          <button
                            onClick={() => handleSaveOrder(pack)}
                            disabled={savingOrder === pack.id}
                            className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center gap-1"
                          >
                            {savingOrder === pack.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Save className="h-2.5 w-2.5" />}
                            Salvar
                          </button>
                        </div>
                      )}

                      {sounds.length === 0 ? (
                        <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
                          <Music className="h-6 w-6 opacity-30" />
                          <p className="text-xs">Nenhum som adicionado</p>
                          <button
                            onClick={() => {
                              pendingUploadRef.current = { packId: pack.id, type: 'full' };
                              fileInputRef.current?.click();
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            Clique para adicionar sons
                          </button>
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {sounds.map((sound, idx) => (
                            <div
                              key={sound.id}
                              draggable
                              onDragStart={() => handleDragStart(pack.id, idx)}
                              onDragOver={(e) => handleDragOver(e, pack.id, idx)}
                              onDrop={(e) => handleDrop(e, pack, idx)}
                              className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                                dragOver?.packId === pack.id && dragOver?.index === idx ? 'bg-primary/10' : ''
                              }`}
                            >
                              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 cursor-grab shrink-0" />

                              {/* Play button */}
                              <button
                                onClick={() => handlePlay(sound)}
                                className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center bg-muted hover:bg-primary/10 transition-colors"
                              >
                                {playingId === sound.id
                                  ? <Pause className="h-3 w-3 text-primary" />
                                  : <Play className="h-3 w-3 text-muted-foreground" />}
                              </button>

                              {/* Sound info / edit */}
                              {editingSound === sound.id ? (
                                <div className="flex-1 flex items-center gap-1.5">
                                  <input
                                    className="w-20 h-6 px-1.5 text-[10px] rounded bg-muted border border-border focus:outline-none uppercase"
                                    value={soundEdits[sound.id]?.shortName || ''}
                                    onChange={e => setSoundEdits(p => ({ ...p, [sound.id]: { ...p[sound.id], shortName: e.target.value.toUpperCase() } }))}
                                    maxLength={6}
                                  />
                                </div>
                              ) : (
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-semibold text-foreground truncate">{sound.short_name}</div>
                                  <div className="text-[9px] text-muted-foreground truncate">{sound.name}</div>
                                </div>
                              )}

                              <div className="text-[9px] text-muted-foreground shrink-0">
                                {sound.duration_ms > 0 ? `${(sound.duration_ms / 1000).toFixed(1)}s` : '—'}
                              </div>

                              {/* Preview badge */}
                              {sound.preview_path && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600">PRV</span>
                              )}

                              {/* Action buttons */}
                              {editingSound === sound.id ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => handleSaveSound(sound.id)}
                                    disabled={savingSound === sound.id}
                                    className="h-6 w-6 rounded flex items-center justify-center bg-primary/10 hover:bg-primary/20 transition-colors"
                                  >
                                    {savingSound === sound.id ? <Loader2 className="h-3 w-3 animate-spin text-primary" /> : <Check className="h-3 w-3 text-primary" />}
                                  </button>
                                  <button
                                    onClick={() => setEditingSound(null)}
                                    className="h-6 w-6 rounded flex items-center justify-center bg-muted hover:bg-muted/80 transition-colors"
                                  >
                                    <X className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => startEditSound(sound)}
                                    className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                  >
                                    <Pencil className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      pendingUploadRef.current = { packId: pack.id, soundId: sound.id, type: 'preview' };
                                      previewInputRef.current?.click();
                                    }}
                                    className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                    title="Upload preview"
                                  >
                                    {uploading?.soundId === sound.id
                                      ? <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                      : <Eye className="h-3 w-3 text-muted-foreground" />}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSound(sound.id)}
                                    disabled={deletingSound === sound.id}
                                    className="h-6 w-6 rounded flex items-center justify-center hover:bg-destructive/10 transition-colors"
                                  >
                                    {deletingSound === sound.id
                                      ? <Loader2 className="h-3 w-3 animate-spin text-destructive" />
                                      : <Trash2 className="h-3 w-3 text-destructive" />}
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPackManager;

