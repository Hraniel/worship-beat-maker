import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Plus, Trash2, Save, Loader2, Image, X, GripVertical,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface LandingFeature {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  image_url: string | null;
  sort_order: number;
  enabled: boolean;
}

const ICON_OPTIONS = [
  'Drum', 'ListMusic', 'SlidersHorizontal', 'Cpu', 'Waves', 'AudioWaveform',
  'Headphones', 'Smartphone', 'Sparkles', 'Music', 'Volume2', 'Layers',
  'Zap', 'Star', 'Radio', 'Mic2', 'Search', 'BarChart3',
];

const inputCls = "w-full h-8 px-2.5 text-xs rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-1 focus:ring-violet-500/60 placeholder:text-white/30";
const labelCls = "text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1 block";

// ── Sortable Feature Card ────────────────────────────────────────────────────
interface SortableFeatureCardProps {
  feat: LandingFeature;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  uploadingId: string | null;
  saving: string | null;
  onToggleEnabled: (id: string, v: boolean) => void;
  onDelete: (id: string) => void;
  onUpdateLocal: (id: string, field: keyof LandingFeature, value: any) => void;
  onSaveField: (id: string, field: keyof LandingFeature, value: any) => void;
  onTriggerUpload: (id: string) => void;
  onRemoveImage: (id: string) => void;
}

const SortableFeatureCard: React.FC<SortableFeatureCardProps> = ({
  feat,
  expandedId,
  setExpandedId,
  uploadingId,
  saving,
  onToggleEnabled,
  onDelete,
  onUpdateLocal,
  onSaveField,
  onTriggerUpload,
  onRemoveImage,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: feat.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const isExpanded = expandedId === feat.id;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, border: '1px solid hsl(0 0% 100% / 0.08)', background: 'hsl(0 0% 100% / 0.02)' }}
      className="rounded-xl overflow-hidden"
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 p-1 rounded cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 transition touch-none"
          title="Arrastar para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Preview thumbnail */}
        <div
          className="shrink-0 h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center"
          style={{ background: 'hsl(262 75% 55% / 0.15)', border: '1px solid hsl(262 75% 55% / 0.2)' }}
        >
          {feat.image_url
            ? <img src={feat.image_url} alt="" className="h-full w-full object-cover" />
            : <span className="text-[10px]" style={{ color: 'hsl(262 75% 65%)' }}>{feat.icon_name?.slice(0, 2)}</span>
          }
        </div>

        {/* Title */}
        <p className="flex-1 text-xs font-medium text-white truncate">{feat.title}</p>

        {/* Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Switch
            checked={feat.enabled}
            onCheckedChange={v => onToggleEnabled(feat.id, v)}
          />
          <button
            onClick={() => setExpandedId(isExpanded ? null : feat.id)}
            className="p-1.5 rounded-lg transition text-white/40 hover:text-white text-xs"
          >
            {isExpanded ? '▲' : '▼'}
          </button>
          <button
            onClick={() => onDelete(feat.id)}
            className="p-1.5 rounded-lg transition text-red-400/60 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded edit form */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: 'hsl(0 0% 100% / 0.06)' }}>
          <div className="pt-3 space-y-2">
            {/* Title */}
            <div>
              <label className={labelCls}>Título</label>
              <input
                className={`${inputCls} flex-1`}
                value={feat.title}
                onChange={e => onUpdateLocal(feat.id, 'title', e.target.value)}
                onBlur={() => onSaveField(feat.id, 'title', feat.title)}
              />
            </div>

            {/* Description */}
            <div>
              <label className={labelCls}>Descrição</label>
              <textarea
                className="w-full px-2.5 py-1.5 text-xs rounded-lg resize-none focus:outline-none"
                style={{
                  border: '1px solid hsl(0 0% 100% / 0.1)',
                  background: 'hsl(0 0% 100% / 0.05)',
                  color: 'hsl(0 0% 100%)',
                  minHeight: '56px',
                }}
                value={feat.description}
                onChange={e => onUpdateLocal(feat.id, 'description', e.target.value)}
                onBlur={() => onSaveField(feat.id, 'description', feat.description)}
              />
            </div>

            {/* Icon (when no image) */}
            {!feat.image_url && (
              <div>
                <label className={labelCls}>Ícone Lucide</label>
                <select
                  className={inputCls}
                  value={feat.icon_name}
                  onChange={e => {
                    onUpdateLocal(feat.id, 'icon_name', e.target.value);
                    onSaveField(feat.id, 'icon_name', e.target.value);
                  }}
                >
                  {ICON_OPTIONS.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Image upload */}
            <div>
              <label className={labelCls}>Foto / Banner (sobrepõe o ícone)</label>
              {feat.image_url ? (
                <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid hsl(0 0% 100% / 0.1)' }}>
                  <img src={feat.image_url} alt={feat.title} className="w-full h-28 object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => onTriggerUpload(feat.id)}
                      className="p-1.5 rounded-lg text-white"
                      style={{ background: 'hsl(0 0% 0% / 0.6)' }}
                      disabled={uploadingId === feat.id}
                      title="Trocar imagem"
                    >
                      {uploadingId === feat.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Image className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => onRemoveImage(feat.id)}
                      className="p-1.5 rounded-lg text-white"
                      style={{ background: 'hsl(0 75% 40% / 0.7)' }}
                      title="Remover imagem"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => onTriggerUpload(feat.id)}
                  disabled={uploadingId === feat.id}
                  className="w-full h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition"
                  style={{ border: '1px dashed hsl(0 0% 100% / 0.15)', color: 'hsl(0 0% 100% / 0.4)' }}
                >
                  {uploadingId === feat.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Image className="h-4 w-4" />}
                  <span className="text-[10px]">
                    {uploadingId === feat.id ? 'Enviando...' : 'Upload de imagem (JPG, PNG, WEBP · máx 5MB)'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
const AdminLandingFeaturesEditor: React.FC = () => {
  const [features, setFeatures] = useState<LandingFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newFeature, setNewFeature] = useState({ title: '', description: '', icon_name: 'Sparkles' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('landing_features')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      setFeatures((data as LandingFeature[]) ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFeatures(); }, []);

  const saveField = async (id: string, field: keyof LandingFeature, value: any) => {
    setSaving(`${id}-${field}`);
    try {
      const { error } = await supabase
        .from('landing_features')
        .update({ [field]: value })
        .eq('id', id);
      if (error) throw error;
      setFeatures(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  const updateLocal = (id: string, field: keyof LandingFeature, value: any) => {
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    await saveField(id, 'enabled', enabled);
  };

  // ── Drag end ────────────────────────────────────────────────────────────────
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sorted = [...features].sort((a, b) => a.sort_order - b.sort_order);
    const oldIdx = sorted.findIndex(f => f.id === active.id);
    const newIdx = sorted.findIndex(f => f.id === over.id);
    const reordered = arrayMove(sorted, oldIdx, newIdx);

    // Assign new sort_order values
    const updated = reordered.map((f, i) => ({ ...f, sort_order: i + 1 }));
    setFeatures(updated);

    try {
      await Promise.all(
        updated.map(f =>
          supabase.from('landing_features').update({ sort_order: f.sort_order }).eq('id', f.id)
        )
      );
    } catch (e: any) {
      toast.error(e.message);
      fetchFeatures();
    }
  };

  const deleteFeature = async (id: string) => {
    if (!confirm('Remover este card de recurso?')) return;
    try {
      const feat = features.find(f => f.id === id);
      if (feat?.image_url) {
        const path = feat.image_url.split('/landing-assets/')[1];
        if (path) await supabase.storage.from('landing-assets').remove([path]);
      }
      await supabase.from('landing_features').delete().eq('id', id);
      setFeatures(prev => prev.filter(f => f.id !== id));
      toast.success('Card removido');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const addFeature = async () => {
    if (!newFeature.title.trim()) { toast.error('Digite um título'); return; }
    setSaving('new');
    try {
      const maxOrder = features.length > 0 ? Math.max(...features.map(f => f.sort_order)) : 0;
      const { data, error } = await supabase.from('landing_features').insert({
        title: newFeature.title.trim(),
        description: newFeature.description.trim(),
        icon_name: newFeature.icon_name,
        sort_order: maxOrder + 1,
        enabled: true,
      }).select().single();
      if (error) throw error;
      setFeatures(prev => [...prev, data as LandingFeature]);
      setNewFeature({ title: '', description: '', icon_name: 'Sparkles' });
      setAddingNew(false);
      setExpandedId(data.id);
      toast.success('Card adicionado!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  const triggerUpload = (id: string) => {
    setUploadTargetId(id);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) { toast.error('Apenas imagens são permitidas'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem deve ter menos de 5MB'); return; }

    setUploadingId(uploadTargetId);
    try {
      const ext = file.name.split('.').pop();
      const path = `features/${uploadTargetId}-${Date.now()}.${ext}`;

      const feat = features.find(f => f.id === uploadTargetId);
      if (feat?.image_url) {
        const oldPath = feat.image_url.split('/landing-assets/')[1];
        if (oldPath) await supabase.storage.from('landing-assets').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('landing-assets')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('landing-assets').getPublicUrl(path);
      await saveField(uploadTargetId, 'image_url', urlData.publicUrl);
      toast.success('Imagem enviada!');
    } catch (e: any) {
      toast.error(e.message || 'Erro no upload');
    } finally {
      setUploadingId(null);
      setUploadTargetId(null);
    }
  };

  const removeImage = async (id: string) => {
    const feat = features.find(f => f.id === id);
    if (!feat?.image_url) return;
    try {
      const path = feat.image_url.split('/landing-assets/')[1];
      if (path) await supabase.storage.from('landing-assets').remove([path]);
      await saveField(id, 'image_url', null);
      toast.success('Imagem removida');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'hsl(262 75% 65%)' }} />
    </div>
  );

  const sorted = [...features].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <p className="text-[11px]" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>
        Arraste os cards para reordenar. Use ícone Lucide ou faça upload de uma foto/banner.
      </p>

      {/* Sortable list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map(f => f.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sorted.map(feat => (
              <SortableFeatureCard
                key={feat.id}
                feat={feat}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                uploadingId={uploadingId}
                saving={saving}
                onToggleEnabled={toggleEnabled}
                onDelete={deleteFeature}
                onUpdateLocal={updateLocal}
                onSaveField={saveField}
                onTriggerUpload={triggerUpload}
                onRemoveImage={removeImage}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add new card */}
      {addingNew ? (
        <div className="rounded-xl p-3 space-y-2"
          style={{ border: '1px solid hsl(262 75% 55% / 0.3)', background: 'hsl(262 75% 55% / 0.05)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(262 75% 65%)' }}>
            Novo card
          </p>
          <div>
            <label className={labelCls}>Título *</label>
            <input className={inputCls} placeholder="Ex: Modo Performance"
              value={newFeature.title}
              onChange={e => setNewFeature(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Descrição</label>
            <textarea
              className="w-full px-2.5 py-1.5 text-xs rounded-lg resize-none focus:outline-none"
              style={{ border: '1px solid hsl(0 0% 100% / 0.1)', background: 'hsl(0 0% 100% / 0.05)', color: 'hsl(0 0% 100%)', minHeight: '52px' }}
              placeholder="Descreva o recurso..."
              value={newFeature.description}
              onChange={e => setNewFeature(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Ícone Lucide</label>
            <select className={inputCls} value={newFeature.icon_name}
              onChange={e => setNewFeature(p => ({ ...p, icon_name: e.target.value }))}>
              {ICON_OPTIONS.map(icon => <option key={icon} value={icon}>{icon}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={addFeature} disabled={saving === 'new'}
              className="flex items-center gap-1 h-7 px-3 text-xs rounded-lg font-medium transition"
              style={{ background: 'hsl(262 75% 55%)', color: 'hsl(0 0% 100%)' }}>
              {saving === 'new' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Criar
            </button>
            <button
              onClick={() => { setAddingNew(false); setNewFeature({ title: '', description: '', icon_name: 'Sparkles' }); }}
              className="h-7 px-3 text-xs rounded-lg transition"
              style={{ color: 'hsl(0 0% 100% / 0.4)', border: '1px solid hsl(0 0% 100% / 0.1)' }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingNew(true)}
          className="w-full h-9 flex items-center justify-center gap-1.5 rounded-xl text-xs transition"
          style={{ border: '1px dashed hsl(0 0% 100% / 0.12)', color: 'hsl(0 0% 100% / 0.35)' }}>
          <Plus className="h-3.5 w-3.5" />
          Adicionar card
        </button>
      )}
    </div>
  );
};

export default AdminLandingFeaturesEditor;
