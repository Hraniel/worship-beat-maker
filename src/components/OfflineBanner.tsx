import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OfflineBannerProps {
  isOffline: boolean;
}

const OfflineBanner = ({ isOffline }: OfflineBannerProps) => {
  const { t } = useTranslation();
  if (!isOffline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] animate-in slide-in-from-top duration-300"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex items-center gap-2 px-4 py-2 bg-muted border-b border-border/60 shadow-sm">
        <WifiOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground">
          {t('banners.offline')}
        </span>
      </div>
    </div>
  );
};

export default OfflineBanner;
