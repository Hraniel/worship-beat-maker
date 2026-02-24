import React from "react";
import { VolumeX, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

interface SilentModeBannerProps {
  visible: boolean;
  onDismiss: () => void;
}

const SilentModeBanner: React.FC<SilentModeBannerProps> = ({ visible, onDismiss }) => {
  const { t } = useTranslation();
  if (!visible) return null;

  return createPortal(
    <div className="fixed top-0 left-0 right-0 z-[210] flex justify-center pointer-events-none"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)" }}
    >
      <div className="pointer-events-auto flex items-center gap-3 bg-destructive text-destructive-foreground rounded-xl shadow-2xl px-4 py-3 mx-4 max-w-sm animate-in slide-in-from-top-4 fade-in duration-300">
        <VolumeX className="h-5 w-5 shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{t('banners.silentTitle')}</p>
          <p className="text-xs opacity-90 mt-0.5">{t('banners.silentDesc')}</p>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-md p-1 opacity-80 hover:opacity-100 transition-opacity"
          aria-label={t('banners.closeWarning')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body
  );
};

export default SilentModeBanner;
