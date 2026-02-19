import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Scissors, ZoomIn, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

type AspectRatio = '1:1' | '16:9' | 'free';

interface ImageCropperModalProps {
  open: boolean;
  file: File | null;
  aspectRatio?: AspectRatio;
  title?: string;
  onSave: (croppedFile: File) => void;
  onCancel: () => void;
}

const OUTPUT_SIZES: Record<AspectRatio, { w: number; h: number }> = {
  '1:1':  { w: 512,  h: 512  },
  '16:9': { w: 1280, h: 720  },
  'free': { w: 0,    h: 0    }, // dynamic
};

const ASPECT_VALUES: Record<AspectRatio, number | null> = {
  '1:1':  1,
  '16:9': 16 / 9,
  'free': null,
};

const CANVAS_DISPLAY_W = 480;

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  open,
  file,
  aspectRatio: initialAspect = '1:1',
  title,
  onSave,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const animFrameRef = useRef<number>(0);

  const [aspect, setAspect] = useState<AspectRatio>(initialAspect);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // pointer drag state
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  // Reset when a new file is provided
  useEffect(() => {
    if (!open || !file) return;

    setAspect(initialAspect);
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setImgLoaded(false);

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [open, file, initialAspect]);

  // Sync aspect toggle from parent when initialAspect changes
  useEffect(() => {
    setAspect(initialAspect);
  }, [initialAspect]);

  // ── Canvas dimensions ────────────────────────────────────────────────────────
  const getCanvasDims = useCallback((): { w: number; h: number } => {
    const ratio = ASPECT_VALUES[aspect];
    if (!ratio) {
      // free: derive from image natural size capped to display width
      if (imgRef.current) {
        const imgAspect = imgRef.current.naturalWidth / imgRef.current.naturalHeight;
        const w = CANVAS_DISPLAY_W;
        const h = Math.round(w / imgAspect);
        return { w, h: Math.min(h, 360) };
      }
      return { w: CANVAS_DISPLAY_W, h: CANVAS_DISPLAY_W };
    }
    return { w: CANVAS_DISPLAY_W, h: Math.round(CANVAS_DISPLAY_W / ratio) };
  }, [aspect]);

  // ── Draw loop ────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = getCanvasDims();
    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);

    // checkerboard background (shows transparency)
    const sq = 12;
    for (let row = 0; row < Math.ceil(h / sq); row++) {
      for (let col = 0; col < Math.ceil(w / sq); col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? '#2a2a2a' : '#1a1a1a';
        ctx.fillRect(col * sq, row * sq, sq, sq);
      }
    }

    const scaledW = img.naturalWidth * scale;
    const scaledH = img.naturalHeight * scale;
    const dx = offset.x + (w - scaledW) / 2;
    const dy = offset.y + (h - scaledH) / 2;

    ctx.drawImage(img, dx, dy, scaledW, scaledH);

    // crop overlay (semi-transparent dark outside)
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    // top
    ctx.fillRect(0, 0, w, 0);
    // no border for "full canvas is the crop" approach
    // dashed border around the canvas edge
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.setLineDash([]);
  }, [getCanvasDims, scale, offset]);

  useEffect(() => {
    if (!imgLoaded) return;
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw, imgLoaded, aspect]);

  // ── Pointer events ────────────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const onPointerUp = () => { isDragging.current = false; };

  // ── Fit to canvas on first load / aspect change ────────────────────────────
  useEffect(() => {
    if (!imgLoaded || !imgRef.current) return;
    const { w, h } = getCanvasDims();
    const img = imgRef.current;
    const fitScale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    setScale(fitScale);
    setOffset({ x: 0, y: 0 });
  }, [imgLoaded, aspect, getCanvasDims]);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = () => {
    const img = imgRef.current;
    if (!img || !file) return;
    setSaving(true);

    const { w: displayW, h: displayH } = getCanvasDims();

    let outW: number, outH: number;
    if (aspect === 'free') {
      outW = img.naturalWidth;
      outH = img.naturalHeight;
    } else {
      outW = OUTPUT_SIZES[aspect].w;
      outH = OUTPUT_SIZES[aspect].h;
    }

    const offscreen = document.createElement('canvas');
    offscreen.width = outW;
    offscreen.height = outH;
    const ctx = offscreen.getContext('2d');
    if (!ctx) { setSaving(false); return; }

    // scale from display canvas to output canvas
    const scaleRatio = outW / displayW;

    const scaledW = img.naturalWidth * scale * scaleRatio;
    const scaledH = img.naturalHeight * scale * scaleRatio;
    const dx = offset.x * scaleRatio + (outW - scaledW) / 2;
    const dy = offset.y * scaleRatio + (outH - scaledH) / 2;

    ctx.drawImage(img, dx, dy, scaledW, scaledH);

    offscreen.toBlob(
      (blob) => {
        setSaving(false);
        if (!blob) return;
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const mime = blob.type || 'image/jpeg';
        const outName = file.name.replace(/\.[^.]+$/, `-cropped.${mime === 'image/png' ? 'png' : 'jpg'}`);
        const croppedFile = new File([blob], outName, { type: mime });
        onSave(croppedFile);
      },
      'image/jpeg',
      0.92
    );
  };

  const { w: cW, h: cH } = getCanvasDims();

  const ASPECT_OPTS: { value: AspectRatio; label: string }[] = [
    { value: '1:1',  label: '1:1'   },
    { value: '16:9', label: '16:9'  },
    { value: 'free', label: 'Livre' },
  ];

  const minScale = imgRef.current
    ? Math.max(cW / imgRef.current.naturalWidth, cH / imgRef.current.naturalHeight) * 0.5
    : 0.1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-[520px] p-0 overflow-hidden gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Scissors className="h-4 w-4 text-primary" />
            Ajustar Imagem{title ? ` — ${title}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Canvas preview */}
          <div
            className="relative mx-auto overflow-hidden rounded-xl border border-border"
            style={{ width: cW, maxWidth: '100%', height: cH }}
          >
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              width={cW}
              height={cH}
              className="block w-full h-full cursor-grab active:cursor-grabbing select-none"
              style={{ imageRendering: 'pixelated' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />
          </div>

          {/* Zoom */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <ZoomIn className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] text-muted-foreground font-medium">Zoom</span>
              <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                {Math.round(scale * 100)}%
              </span>
            </div>
            <Slider
              min={Math.round(minScale * 50)}
              max={400}
              step={1}
              value={[Math.round(scale * 100)]}
              onValueChange={([v]) => setScale(v / 100)}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>50%</span>
              <span>400%</span>
            </div>
          </div>

          {/* Aspect ratio toggle */}
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground font-medium">Proporção</p>
            <div className="flex gap-2">
              {ASPECT_OPTS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAspect(opt.value)}
                  className={`flex-1 h-8 rounded-lg text-xs font-medium transition-colors border ${
                    aspect === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Output size hint */}
          <p className="text-[10px] text-muted-foreground/60 text-center">
            {aspect === 'free'
              ? 'Modo livre — exporta no tamanho original da imagem'
              : `Saída: ${OUTPUT_SIZES[aspect].w}×${OUTPUT_SIZES[aspect].h}px`}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 pb-5">
          <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">
            <X className="h-3.5 w-3.5" />
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!imgLoaded || saving} className="flex-1">
            {saving
              ? <div className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              : <Check className="h-3.5 w-3.5" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropperModal;
