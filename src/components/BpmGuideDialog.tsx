import React from 'react';
import { Info, Music, Clock, Zap } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface BpmGuideDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const BpmGuideDialog: React.FC<BpmGuideDialogProps> = ({ open, onClose, onConfirm }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Info className="h-5 w-5 text-primary" />
            {t('bpmGuide.title')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('bpmGuide.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex gap-3 items-start">
            <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{t('bpmGuide.syncBpm')}</p>
              <p className="text-xs text-muted-foreground">{t('bpmGuide.syncBpmDesc')}</p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
              <Music className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{t('bpmGuide.formats')}</p>
              <p className="text-xs text-muted-foreground">{t('bpmGuide.formatsDesc')}</p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{t('bpmGuide.shortSamples')}</p>
              <p className="text-xs text-muted-foreground">{t('bpmGuide.shortSamplesDesc')}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={onConfirm}>
            {t('bpmGuide.chooseFile')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BpmGuideDialog;
