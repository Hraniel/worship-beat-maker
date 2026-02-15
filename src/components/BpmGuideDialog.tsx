import React from 'react';
import { Info, Music, Clock, Zap } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface BpmGuideDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const BpmGuideDialog: React.FC<BpmGuideDialogProps> = ({ open, onClose, onConfirm }) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Info className="h-5 w-5 text-primary" />
            Guia de importação
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Para o melhor resultado, siga estas dicas ao importar sons:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex gap-3 items-start">
            <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Sincronize o BPM</p>
              <p className="text-xs text-muted-foreground">
                Certifique-se de que o arquivo de áudio está no mesmo BPM do metrônomo do app para manter a sincronização.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
              <Music className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Formatos aceitos</p>
              <p className="text-xs text-muted-foreground">
                MP3, WAV e OGG. Para melhor qualidade, use WAV sem compressão.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Samples curtos</p>
              <p className="text-xs text-muted-foreground">
                Sons de 1 a 4 compassos funcionam melhor. Arquivos muito longos podem causar atraso no disparo.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onConfirm}>
            Escolher arquivo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BpmGuideDialog;
