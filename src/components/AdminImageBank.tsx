import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Trash2, Loader2, Copy, Check, Image as ImageIcon, RefreshCw } from 'lucide-react';

interface BankImage {
  name: string;
  fullPath: string;
  publicUrl: string;
  size: number;
  updatedAt: string;
}

const BUCKET = 'landing-assets';

const AdminImageBank: React.FC = () => {
  const [images, setImages] = useState<BankImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from(BUCKET).list('', {
        limit: 200,
        sortBy: { column: 'updated_at', order: 'desc' },
      });
      if (error) throw error;

      const imgs = (data ?? [])
        .filter(f => f.name && !f.name.startsWith('.') && /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(f.name))
        .map(f => ({
          name: f.name,
          fullPath: f.name,
          publicUrl: supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl,
          size: f.metadata?.size ?? 0,
          updatedAt: f.updated_at ?? '',
        }));

      // Also list landing/ subfolder
      const { data: sub } = await supabase.storage.from(BUCKET).list('landing', {
        limit: 200,
        sortBy: { column: 'updated_at', order: 'desc' },
      });
      const subImgs = (sub ?? [])
        .filter(f => f.name && !f.name.startsWith('.') && /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(f.name))
        .map(f => ({
          name: f.name,
          fullPath: `landing/${f.name}`,
          publicUrl: supabase.storage.from(BUCKET).getPublicUrl(`landing/${f.name}`).data.publicUrl,
          size: f.metadata?.size ?? 0,
          updatedAt: f.updated_at ?? '',
        }));

      setImages([...subImgs, ...imgs]);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao carregar imagens');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let successCount = 0;
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'jpg';
        const slug = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 40);
        const path = `landing/${slug}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
        if (!error) successCount++;
        else toast.error(`Erro: ${file.name} — ${error.message}`);
      }
      if (successCount > 0) {
        toast.success(`${successCount} imagem(ns) enviada(s)!`);
        await fetchImages();
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (img: BankImage) => {
    if (!confirm(`Excluir "${img.name}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(img.fullPath);
    try {
      const { error } = await supabase.storage.from(BUCKET).remove([img.fullPath]);
      if (error) throw error;
      toast.success('Imagem excluída!');
      setImages(prev => prev.filter(i => i.fullPath !== img.fullPath));
    } catch (e: any) {
      toast.error(e.message || 'Erro ao excluir');
    } finally {
      setDeleting(null);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(url);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '–';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold" style={{ color: 'hsl(0 0% 100% / 0.8)' }}>
            Banco de Imagens da Landing
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'hsl(0 0% 100% / 0.35)' }}>
            {images.length} imagem(ns) · Clique em uma URL para copiar
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchImages}
            disabled={loading}
            className="h-7 w-7 flex items-center justify-center rounded-lg transition"
            style={{ background: 'hsl(0 0% 100% / 0.06)', color: 'hsl(0 0% 100% / 0.4)' }}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-semibold transition"
            style={{ background: 'hsl(262 75% 55% / 0.2)', color: 'hsl(262 75% 65%)', border: '1px solid hsl(262 75% 55% / 0.3)' }}
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            Enviar
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => { handleUpload(e.target.files); e.target.value = ''; }}
      />

      {/* Drop zone */}
      <div
        className="relative rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 cursor-pointer transition-colors"
        style={{ borderColor: 'hsl(262 75% 55% / 0.25)', background: 'hsl(262 75% 55% / 0.03)' }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'hsl(262 75% 65% / 0.5)'; }}
        onDragLeave={e => { e.currentTarget.style.borderColor = 'hsl(262 75% 55% / 0.25)'; }}
        onDrop={e => {
          e.preventDefault();
          e.currentTarget.style.borderColor = 'hsl(262 75% 55% / 0.25)';
          handleUpload(e.dataTransfer.files);
        }}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin mb-2" style={{ color: 'hsl(262 75% 65%)' }} />
        ) : (
          <Upload className="h-6 w-6 mb-2" style={{ color: 'hsl(262 75% 55% / 0.5)' }} />
        )}
        <p className="text-[11px] font-medium" style={{ color: 'hsl(0 0% 100% / 0.5)' }}>
          {uploading ? 'Enviando...' : 'Clique ou arraste imagens aqui'}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: 'hsl(0 0% 100% / 0.25)' }}>PNG, JPG, WebP · Múltiplos arquivos</p>
      </div>

      {/* Image grid */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'hsl(262 75% 65%)' }} />
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-2">
          <ImageIcon className="h-8 w-8" style={{ color: 'hsl(0 0% 100% / 0.15)' }} />
          <p className="text-xs" style={{ color: 'hsl(0 0% 100% / 0.3)' }}>Nenhuma imagem ainda</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {images.map(img => (
            <div
              key={img.fullPath}
              className="relative rounded-xl overflow-hidden group"
              style={{ border: '1px solid hsl(0 0% 100% / 0.08)', background: 'hsl(0 0% 100% / 0.03)' }}
            >
              {/* Preview */}
              <div className="relative aspect-video bg-black/20 overflow-hidden">
                <img
                  src={img.publicUrl}
                  alt={img.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                  style={{ background: 'hsl(0 0% 0% / 0.6)' }}>
                  <button
                    onClick={() => handleCopy(img.publicUrl)}
                    className="h-7 w-7 flex items-center justify-center rounded-lg transition"
                    style={{ background: 'hsl(262 75% 55% / 0.8)', color: 'white' }}
                    title="Copiar URL"
                  >
                    {copied === img.publicUrl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(img)}
                    disabled={deleting === img.fullPath}
                    className="h-7 w-7 flex items-center justify-center rounded-lg transition"
                    style={{ background: 'hsl(0 75% 50% / 0.8)', color: 'white' }}
                    title="Excluir"
                  >
                    {deleting === img.fullPath
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="px-2 py-1.5">
                <p className="text-[10px] font-medium truncate" style={{ color: 'hsl(0 0% 100% / 0.7)' }}>{img.name}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[9px]" style={{ color: 'hsl(0 0% 100% / 0.3)' }}>{formatSize(img.size)}</span>
                  <button
                    onClick={() => handleCopy(img.publicUrl)}
                    className="text-[9px] flex items-center gap-0.5 transition hover:opacity-80"
                    style={{ color: copied === img.publicUrl ? 'hsl(142 70% 50%)' : 'hsl(262 75% 65%)' }}
                  >
                    {copied === img.publicUrl ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                    {copied === img.publicUrl ? 'Copiado!' : 'Copiar URL'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminImageBank;
