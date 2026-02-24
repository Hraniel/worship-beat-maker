import React, { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface PadColor {
  hue: number;
  saturation: number;
  lightness: number;
  opacity: number;
}

export const DEFAULT_PAD_COLOR: PadColor = {
  hue: 0,
  saturation: 75,
  lightness: 55,
  opacity: 1,
};

export function parsePadColorVar(hslString: string): PadColor {
  const parts = hslString.trim().split(/\s+/);
  return {
    hue: parseFloat(parts[0]) || 0,
    saturation: parseFloat(parts[1]) || 75,
    lightness: parseFloat(parts[2]) || 55,
    opacity: 1,
  };
}

export function padColorToHsl(c: PadColor): string {
  return `${c.hue} ${c.saturation}% ${c.lightness}%`;
}

const PRESET_HUES = [0, 15, 30, 50, 140, 200, 262, 300, 340];

interface PadColorPickerProps {
  color: PadColor;
  onChange: (color: PadColor) => void;
}

const PadColorPicker: React.FC<PadColorPickerProps> = ({ color, onChange }) => {
  const { t } = useTranslation();
  const update = (partial: Partial<PadColor>) => onChange({ ...color, ...partial });

  return (
    <div className="space-y-3 px-1">
      <div className="flex items-center gap-2 mb-1">
        <Palette className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">{t('padColor.title')}</span>
      </div>

      {/* Preset colors */}
      <div className="flex gap-1.5 flex-wrap">
        {PRESET_HUES.map((hue) => (
          <button
            key={hue}
            className={`w-6 h-6 rounded-full border-2 transition-transform ${
              Math.abs(color.hue - hue) < 5 ? 'scale-125 border-foreground' : 'border-transparent hover:scale-110'
            }`}
            style={{ backgroundColor: `hsl(${hue} ${color.saturation}% ${color.lightness}%)` }}
            onClick={() => update({ hue })}
          />
        ))}
      </div>

      {/* Hue slider */}
      <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground">{t('padColor.hue')}</span>
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full h-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              background: `linear-gradient(to right, 
                hsl(0 ${color.saturation}% ${color.lightness}%), 
                hsl(60 ${color.saturation}% ${color.lightness}%), 
                hsl(120 ${color.saturation}% ${color.lightness}%), 
                hsl(180 ${color.saturation}% ${color.lightness}%), 
                hsl(240 ${color.saturation}% ${color.lightness}%), 
                hsl(300 ${color.saturation}% ${color.lightness}%), 
                hsl(360 ${color.saturation}% ${color.lightness}%))`,
            }}
          />
          <Slider
            value={[color.hue]}
            onValueChange={([v]) => update({ hue: v })}
            min={0}
            max={360}
            step={1}
            className="relative"
          />
        </div>
      </div>

      {/* Saturation */}
      <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground">{t('padColor.saturation')}</span>
        <Slider
          value={[color.saturation]}
          onValueChange={([v]) => update({ saturation: v })}
          min={0}
          max={100}
          step={1}
        />
      </div>

      {/* Lightness */}
      <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground">{t('padColor.lightness')}</span>
        <Slider
          value={[color.lightness]}
          onValueChange={([v]) => update({ lightness: v })}
          min={10}
          max={80}
          step={1}
        />
      </div>

      {/* Opacity */}
      <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground">{t('padColor.opacity')}</span>
        <div className="flex items-center gap-2">
          <Slider
            value={[color.opacity * 100]}
            onValueChange={([v]) => update({ opacity: v / 100 })}
            min={20}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
            {Math.round(color.opacity * 100)}%
          </span>
        </div>
      </div>

      {/* Preview */}
      <div
        className="h-8 rounded-md border border-border"
        style={{
          backgroundColor: `hsl(${color.hue} ${color.saturation}% ${color.lightness}% / ${color.opacity})`,
        }}
      />
    </div>
  );
};

export default PadColorPicker;
