import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useBodyScroll } from "@/hooks/useBodyScroll";
import LanguageSelector from "@/components/LanguageSelector";
import { useLandingConfig, type LandingFeature } from "@/hooks/useLandingConfig";
import { usePrelaunchMode } from "@/hooks/usePrelaunchMode";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { usePaymentMode } from "@/hooks/usePaymentMode";
import PrelaunchCountdownModal from "@/components/PrelaunchCountdownModal";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";
const appPadGridDefault = "/placeholder.svg";
const appSetlistDefault = "/placeholder.svg";
const appMixerDefault = "/placeholder.svg";
import {
  Music,
  Headphones,
  Zap,
  Crown,
  Check,
  X,
  ChevronDown,
  Layers,
  Sparkles,
  Volume2,
  ArrowRight,
  Drum,
  AudioWaveform,
  Waves,
  ListMusic,
  SlidersHorizontal,
  Cpu,
  Smartphone,
  Star,
  Radio,
  Mic2,
  Search,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIERS } from "@/lib/tiers";

// Reads pad colors from localStorage (same key as the app)
const PAD_COLORS_KEY = "drum-pads-pad-colors";
type StoredPadColor = { hue: number; saturation: number; lightness: number; opacity: number };

function useLivePadColors() {
  const [colors, setColors] = useState<Record<string, StoredPadColor>>(() => {
    try {
      const d = localStorage.getItem(PAD_COLORS_KEY);
      return d ? JSON.parse(d) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    // Listen for storage events from other tabs/windows
    const onStorage = (e: StorageEvent) => {
      if (e.key === PAD_COLORS_KEY) {
        try {
          setColors(e.newValue ? JSON.parse(e.newValue) : {});
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", onStorage);

    // Poll localStorage every 2s (catches same-tab changes)
    const interval = setInterval(() => {
      try {
        const d = localStorage.getItem(PAD_COLORS_KEY);
        const next = d ? JSON.parse(d) : {};
        setColors((prev) => (JSON.stringify(prev) !== JSON.stringify(next) ? next : prev));
      } catch {
        /* ignore */
      }
    }, 2000);

    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, []);

  return colors;
}

// Map icon name string → Lucide component
const ICON_MAP: Record<string, React.ElementType> = {
  Drum,
  ListMusic,
  SlidersHorizontal,
  Cpu,
  Waves,
  AudioWaveform,
  Headphones,
  Smartphone,
  Sparkles,
  Music,
  Volume2,
  Layers,
  Zap,
  Star,
  Radio,
  Mic2,
  Search,
  BarChart3,
  Crown,
  MonitorPlay: Star,
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  }),
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

/** Renders a config string that may contain inline HTML (e.g. <span style="color:red">word</span>) */
const RichText = ({ html, className, style }: { html: string; className?: string; style?: React.CSSProperties }) => (
  <span className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />
);

// Helper: map tailwind size key to class
const titleSizeClass = (size: string) => {
  const map: Record<string, string> = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl",
    "5xl": "text-5xl",
    "6xl": "text-6xl",
    "7xl": "text-5xl sm:text-7xl",
    "8xl": "text-6xl sm:text-8xl",
  };
  return map[size] ?? "text-5xl sm:text-7xl";
};

const DEFAULT_CATEGORIES = [
  { name: "Kick & Bumbo", color: "0 75% 55%", icon: "🥁" },
  { name: "Snare", color: "30 85% 55%", icon: "🪘" },
  { name: "Hi-Hat & Pratos", color: "50 80% 50%", icon: "🎵" },
  { name: "Loops", color: "262 75% 55%", icon: "🔁" },
  { name: "Continuous Pads", color: "200 80% 55%", icon: "🎹" },
  { name: "Efeitos", color: "340 70% 55%", icon: "✨" },
];

// Reusable background video for any section
const SectionVideo = ({
  url,
  opacity,
  fit,
  borderPos,
  borderWidth,
  borderRadius,
  borderColor,
}: {
  url?: string;
  opacity?: string;
  fit?: string;
  borderPos?: string;
  borderWidth?: string;
  borderRadius?: string;
  borderColor?: string;
}) => {
  if (!url || url.trim() === "") return null;
  const bPos = borderPos || "none";
  const bWidth = parseInt(borderWidth || "2");
  const bRadius = parseInt(borderRadius || "0");
  const rawColor = borderColor || "hsl(0 0% 100%)";
  // Strip any alpha from the color so the border is always fully opaque
  const bColor = rawColor.replace(/\s*\/\s*[\d.]+\s*\)/, ")");
  const hasBorder = bPos !== "none" && bWidth > 0;

  // Video element (opacity only on video, never on border)
  const videoEl = (
    <video
      src={url}
      autoPlay
      muted
      loop
      playsInline
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        objectFit: (fit as any) || "cover",
        opacity: parseFloat(opacity || "0.15"),
        borderRadius: hasBorder ? `${bRadius}px` : undefined,
      }}
    />
  );

  // Border overlay (always full opacity, independent of video)
  const borderEl = hasBorder ? (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        borderRadius: `${bRadius}px`,
        ...(bPos === "inset"
          ? { boxShadow: `inset 0 0 0 ${bWidth}px ${bColor}` }
          : { border: `${bWidth}px solid ${bColor}` }),
      }}
    />
  ) : null;

  return (
    <>
      {videoEl}
      {borderEl}
    </>
  );
};

// Gradient divider between sections
const Divider = ({ fromLight, darkColor }: { fromLight: boolean; darkColor: string }) => (
  <div
    className="w-full h-24 pointer-events-none"
    style={{
      background: fromLight
        ? `linear-gradient(to bottom, hsl(0 0% 97%), ${darkColor})`
        : `linear-gradient(to bottom, ${darkColor}, hsl(0 0% 97%))`,
    }}
  />
);

// Announcement Bar
const AnnouncementBar = ({ config, L }: { config: Record<string, string>; L: (key: string, fb?: string) => string }) => {
  const [dismissed, setDismissed] = React.useState(false);
  if (config.announcement_enabled !== "true" || dismissed) return null;
  const bg = config.announcement_bg || "hsl(262 75% 55%)";
  const color = config.announcement_color || "hsl(0 0% 100%)";
  const text = L('announcement_text', '');
  const link = config.announcement_link || "";
  const linkLabel = L('announcement_link_label', '');
  if (!text) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium"
      style={{ background: bg, color, paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}
    >
      <span>{text}</span>
      {link && linkLabel && (
        <a href={link} className="underline underline-offset-2 font-semibold hover:opacity-80 transition">
          {linkLabel}
        </a>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 opacity-60 hover:opacity-100 transition text-base leading-none"
      >
        &times;
      </button>
    </div>
  );
};

// Nav
const Nav = ({
  navigate,
  config,
  hasAnnouncement,
  L,
}: {
  navigate: ReturnType<typeof useNavigate>;
  config: Record<string, string>;
  hasAnnouncement: boolean;
  L: (key: string, fb?: string) => string;
}) => {
  const { t } = useTranslation();
  const navBg = config.nav_bg || "hsl(0 0% 100% / 0.96)";
  const navBorder = config.nav_border_color || "hsl(0 0% 0% / 0.08)";
  const linkColor = config.nav_link_color || "hsl(220 15% 45%)";
  const linkHoverColor = config.nav_link_hover_color || "hsl(220 15% 10%)";
  const loginLabel = L('nav_btn_login_label', t("landing.nav.login")) || t("landing.nav.login");
  const signupLabel = L('nav_btn_signup_label', t("landing.nav.signup")) || t("landing.nav.signup");
  const loginBg = config.nav_btn_login_bg || "";
  const loginColor = config.nav_btn_login_color || "";
  const signupBg = config.nav_btn_signup_bg || "";
  const signupColor = config.nav_btn_signup_color || "";

  const navLinks = [
    { label: L('nav_link_0_label', t("landing.nav.features")), href: config.nav_link_0_href || "#recursos" },
    { label: L('nav_link_1_label', t("landing.nav.sounds")), href: config.nav_link_1_href || "#sons" },
    { label: L('nav_link_2_label', t("landing.nav.plans")), href: config.nav_link_2_href || "#planos" },
  ];

  return (
    <nav
      className="fixed left-0 right-0 z-50 backdrop-blur-xl border-b"
      style={{
        top: hasAnnouncement ? "32px" : "0",
        background: navBg,
        borderColor: navBorder,
        paddingTop: hasAnnouncement ? "0" : "env(safe-area-inset-top)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 shrink-0">
          <img src={logoDark} alt="Glory Pads" className="h-8 w-auto" />
          <span className="font-bold text-lg hidden sm:inline" style={{ color: config.nav_brand_color || 'hsl(var(--foreground))' }}>Glory Pads</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <LanguageSelector compact className="hidden sm:flex shrink-0" />
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-xs sm:text-sm transition hidden sm:inline whitespace-nowrap"
              style={{ color: linkColor }}
              onMouseEnter={(e) => (e.currentTarget.style.color = linkHoverColor)}
              onMouseLeave={(e) => (e.currentTarget.style.color = linkColor)}
            >
              {l.label}
            </a>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/auth")}
            className="shrink-0 whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4"
            style={{ ...(loginBg ? { background: loginBg } : {}), ...(loginColor ? { color: loginColor } : {}) }}
          >
            {loginLabel}
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/auth?mode=signup")}
            className="font-semibold shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4"
            style={{
              background: signupBg || "hsl(220 15% 10%)",
              color: signupColor || "hsl(0 0% 100%)",
            }}
          >
            {signupLabel}
          </Button>
        </div>
      </div>
    </nav>
  );
};

const Hero = ({ navigate, config, L }: { navigate: ReturnType<typeof useNavigate>; config: Record<string, string>; L: (key: string, fb?: string) => string }) => {
  const bg = config.hero_bg || "hsl(0 0% 97%)";
  const titleColor = config.hero_title_color || "hsl(220 15% 10%)";
  const titleSize = titleSizeClass(config.hero_title_size || "7xl");
  const subtitleColor = config.hero_subtitle_color || "hsl(220 15% 40%)";
  const badgeBg = config.hero_badge_bg || "hsl(262 75% 55% / 0.06)";
  const badgeColor = config.hero_badge_color || "hsl(262 75% 55%)";

  const pt = config.hero_pt ? `${config.hero_pt}px` : undefined;
  const pb = config.hero_pb ? `${config.hero_pb}px` : undefined;

  // Live pad colors from app localStorage
  const livePadColors = useLivePadColors();

  // Default pad definitions — fallback colors when user hasn't customized
  const PADS = [
    { id: "kick", name: "KCK", label: "Kick", color: "0 75% 55%" },
    { id: "snare", name: "SNR", label: "Snare", color: "30 85% 55%" },
    { id: "hihat-closed", name: "HHC", label: "Hi-Hat", color: "50 80% 50%" },
    { id: "hihat-open", name: "HHO", label: "Open HH", color: "50 80% 50%" },
    { id: "crash", name: "CRS", label: "Crash", color: "340 70% 55%" },
    { id: "clap", name: "CLP", label: "Clap", color: "140 60% 45%" },
    { id: "worship-loop", name: "WSP", label: "Loop", color: "262 75% 55%" },
    { id: "worship-fill", name: "WFL", label: "Loop 2", color: "262 75% 55%" },
  ];

  // Resolve color: use live customization if set, otherwise default
  const getPadColor = (pad: (typeof PADS)[0]) => {
    const custom = livePadColors[pad.id];
    if (custom) return `${custom.hue} ${custom.saturation}% ${custom.lightness}%`;
    return pad.color;
  };

  const AMBIENT_NOTES = [
    { note: "C", color: "0 75% 55%" },
    { note: "D", color: "30 85% 55%" },
    { note: "E", color: "50 80% 50%" },
    { note: "F", color: "140 60% 45%" },
    { note: "G", color: "200 75% 50%" },
    { note: "A", color: "262 75% 55%" },
  ];

  return (
    <section
      className="relative overflow-visible"
      style={{
        background: bg,
        paddingTop: pt ?? "calc(env(safe-area-inset-top) + 7rem)",
        paddingBottom: pb ?? "0",
      }}
    >
      <SectionVideo
        url={config.hero_video_url}
        opacity={config.hero_video_opacity}
        fit={config.hero_video_fit}
        borderPos={config.hero_video_border_pos}
        borderWidth={config.hero_video_border_width}
        borderRadius={config.hero_video_border_radius}
        borderColor={config.hero_video_border_color}
      />
      <div className="relative max-w-5xl mx-auto px-4 text-center pb-20">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.div
            variants={fadeUp}
            custom={0}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6"
            style={{ border: `1px solid ${badgeColor} / 0.2`, background: badgeBg }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: badgeColor }} />
            <span className="text-xs font-medium" style={{ color: badgeColor }}>
              {L('hero_badge', "Spotify AI integrado · PWA nativo")}
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className={`${titleSize} font-extrabold tracking-tight leading-[1.08] mb-6`}
            style={{ color: titleColor }}
          >
            <RichText html={L('hero_title', "Seus pads de worship na palma da mão")} />
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-lg sm:text-xl max-w-2xl mx-auto mb-10"
            style={{ color: subtitleColor }}
          >
            <RichText html={L('hero_subtitle', "Pads profissionais, metrônomo, loops, continuous pads e Glory Store — tudo que o músico de louvor precisa, em um único app.")} />
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth?mode=signup")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-xl"
              style={{ boxShadow: "0 0 40px hsl(var(--primary) / 0.25)" }}
            >
              {L('hero_cta_primary', 'Começar gratuitamente')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                document.getElementById("recursos")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-lg px-8 py-6 rounded-xl"
            >
              {L('hero_cta_secondary', 'Ver recursos')}
              <ChevronDown className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>

        {/* App preview mockup — reactive pad colors */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-3xl mx-auto mt-16"
        >
          <div
            className="relative rounded-2xl p-3 sm:p-5 shadow-2xl"
            style={{
              border: "1px solid hsl(0 0% 0% / 0.1)",
              background: "hsl(220 15% 10%)",
            }}
          >
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {PADS.map((pad, i) => {
                const color = getPadColor(pad);
                return (
                  <motion.div
                    key={pad.id}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + i * 0.05, duration: 0.35 }}
                    className="aspect-square rounded-xl flex flex-col items-center justify-center relative overflow-hidden"
                    style={{
                      background: `linear-gradient(145deg, hsl(0 0% 9%) 0%, hsl(0 0% 5%) 100%)`,
                      border: `1.5px solid hsl(${color} / 0.28)`,
                      boxShadow: `0 0 18px hsl(${color} / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.04)`,
                      transition: "border-color 0.4s ease, box-shadow 0.4s ease",
                    }}
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                      style={{ background: `hsl(${color})`, transition: "background 0.4s ease" }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: `radial-gradient(circle at center, hsl(${color} / 0.2) 0%, transparent 70%)`,
                      }}
                      animate={{ opacity: [0.3, 0.65, 0.3] }}
                      transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <span
                      className="relative text-base sm:text-lg font-bold tracking-wider"
                      style={{ color: `hsl(${color})`, transition: "color 0.4s ease" }}
                    >
                      {pad.name}
                    </span>
                    <span
                      className="relative text-[9px] sm:text-[10px] mt-0.5"
                      style={{ color: "hsl(0 0% 100% / 0.4)" }}
                    >
                      {pad.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
            <div className="mt-3 flex gap-1.5">
              {AMBIENT_NOTES.map((n, i) => (
                <motion.div
                  key={n.note}
                  className="flex-1 h-9 sm:h-10 rounded-lg flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: `linear-gradient(180deg, hsl(${n.color} / 0.18) 0%, hsl(${n.color} / 0.04) 100%)`,
                    border: `1px solid hsl(${n.color} / 0.22)`,
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 + i * 0.06, duration: 0.4 }}
                >
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: `radial-gradient(ellipse at bottom, hsl(${n.color} / 0.28) 0%, transparent 80%)`,
                    }}
                    animate={{ opacity: [0.2, 0.55, 0.2] }}
                    transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <span
                    className="relative text-[10px] sm:text-xs font-semibold"
                    style={{ color: `hsl(${n.color} / 0.85)` }}
                  >
                    {n.note}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
          <div
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 rounded-full"
            style={{ background: "hsl(var(--primary) / 0.15)", filter: "blur(60px)" }}
          />
        </motion.div>
      </div>
    </section>
  );
};

// Stats — dynamic styles (with optional image per stat)
const Stats = ({ config, L }: { config: Record<string, string>; L: (key: string, fb?: string) => string }) => {
  const bg = config.stats_bg || "hsl(220 15% 7%)";
  const valueColor = config.stats_value_color || "hsl(0 0% 100%)";
  const labelColor = config.stats_label_color || "hsl(0 0% 100% / 0.4)";
  const stats = [
    { value: L('stat_1_value', "12+"), label: L('stat_1_label', "Sons padrão inclusos"), image: config.stat_1_image },
    { value: L('stat_2_value', "∞"), label: L('stat_2_label', "Setlists por culto"), image: config.stat_2_image },
    { value: L('stat_3_value', "AI"), label: L('stat_3_label', "Spotify integrado"), image: config.stat_3_image },
    { value: L('stat_4_value', "PWA"), label: L('stat_4_label', "Instale no celular"), image: config.stat_4_image },
  ];
  const pt = config.stats_pt ? `${config.stats_pt}px` : "64px";
  const pb = config.stats_pb ? `${config.stats_pb}px` : "64px";
  return (
    <section className="relative overflow-hidden" style={{ background: bg, paddingTop: pt, paddingBottom: pb, paddingLeft: "1rem", paddingRight: "1rem" }}>
      <SectionVideo url={config.stats_video_url} opacity={config.stats_video_opacity} fit={config.stats_video_fit}
        borderPos={config.stats_video_border_pos} borderWidth={config.stats_video_border_width}
        borderRadius={config.stats_video_border_radius} borderColor={config.stats_video_border_color} />
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
        className="relative max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} variants={fadeUp} custom={i} className="flex flex-col items-center">
            {stat.image && <img src={stat.image} alt={stat.label} className="w-10 h-10 object-contain mb-3" />}
            <div className="text-4xl sm:text-5xl font-black mb-2" style={{ color: valueColor }}>{stat.value}</div>
            <div className="text-sm font-medium" style={{ color: labelColor }}>{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

// App Screenshots section — 3 feature mockup images
const AppScreenshots = ({ config, L }: { config: Record<string, string>; L: (key: string, fb?: string) => string }) => {
  const bg = config.screenshots_bg || "hsl(0 0% 97%)";
  const titleColor = config.screenshots_title_color || "hsl(220 15% 10%)";
  const subtitleColor = config.screenshots_subtitle_color || "hsl(220 15% 40%)";

  const shots = [
    {
      key: "screenshot_1",
      defaultImg: appPadGridDefault,
      defaultTitle: L('screenshot_1_title', "Pad Grid"),
      defaultDesc: L('screenshot_1_desc', "Pads totalmente personalizáveis com cores, efeitos e sons da sua biblioteca."),
    },
    {
      key: "screenshot_2",
      defaultImg: appSetlistDefault,
      defaultTitle: L('screenshot_2_title', "Repertório"),
      defaultDesc: L('screenshot_2_desc', "Organize suas músicas em setlists e acesse o tom e BPM de cada uma."),
    },
    {
      key: "screenshot_3",
      defaultImg: appMixerDefault,
      defaultTitle: L('screenshot_3_title', "Mixer"),
      defaultDesc: L('screenshot_3_desc', "Controle de volume e pan individual por pad, em tempo real."),
    },
  ];

  if (config.screenshots_enabled === "false") return null;

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: bg,
        paddingTop: config.screenshots_pt ? `${config.screenshots_pt}px` : "80px",
        paddingBottom: config.screenshots_pb ? `${config.screenshots_pb}px` : "96px",
        paddingLeft: "1rem",
        paddingRight: "1rem",
      }}
    >
      <SectionVideo
        url={config.screenshots_video_url}
        opacity={config.screenshots_video_opacity}
        fit={config.screenshots_video_fit}
        borderPos={config.screenshots_video_border_pos}
        borderWidth={config.screenshots_video_border_width}
        borderRadius={config.screenshots_video_border_radius}
        borderColor={config.screenshots_video_border_color}
      />
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center mb-12"
        >
          <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            {L('screenshots_section_label', 'App Glory Pads')}
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-3xl sm:text-5xl font-extrabold mb-4"
            style={{ color: titleColor }}
          >
            {L('screenshots_title', "Tudo que você precisa, em um só lugar")}
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="max-w-lg mx-auto text-base"
            style={{ color: subtitleColor }}
          >
            {L('screenshots_subtitle', "Interface intuitiva feita para músicos de louvor profissionais.")}
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={stagger}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto"
        >
          {shots.map((shot, i) => {
            const imgSrc = config[`${shot.key}_image`] || shot.defaultImg;
            const title = config[`${shot.key}_title`] || shot.defaultTitle;
            const desc = config[`${shot.key}_desc`] || shot.defaultDesc;
            return (
              <motion.div key={shot.key} variants={fadeUp} custom={i} className="group flex flex-col">
                <div
                  className="relative rounded-2xl overflow-hidden mb-4 shadow-lg"
                  style={{ border: "1px solid hsl(0 0% 0% / 0.07)" }}
                >
                  <img
                    src={imgSrc}
                    alt={title}
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    style={{ aspectRatio: "9/16", objectFit: "cover", objectPosition: "top" }}
                    loading="lazy"
                  />
                  <div
                    className="absolute inset-0 pointer-events-none rounded-2xl"
                    style={{ background: "linear-gradient(to bottom, transparent 60%, hsl(0 0% 0% / 0.12) 100%)" }}
                  />
                </div>
                <h3 className="text-base font-bold mb-1.5" style={{ color: titleColor }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed flex-1" style={{ color: subtitleColor }}>
                  {desc}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

// Features — dynamic styles
const Features = ({
  navigate,
  config,
  landingFeatures,
  L,
}: {
  navigate: ReturnType<typeof useNavigate>;
  config: Record<string, string>;
  landingFeatures: LandingFeature[];
  L: (key: string, fb?: string) => string;
}) => {
  const bg = config.features_bg || "hsl(0 0% 97%)";
  const cardBg = config.features_card_bg || "hsl(0 0% 100%)";
  const cardBorder = config.features_card_border || "hsl(0 0% 0% / 0.07)";
  const titleColor = config.features_title_color || "hsl(220 15% 10%)";
  const cardTitleColor = config.features_card_title_color || "hsl(220 15% 10%)";
  const subtitleColor = config.features_subtitle_color || "hsl(220 15% 40%)";

  const visible = landingFeatures.filter((f) => f.enabled).sort((a, b) => a.sort_order - b.sort_order);

  const pt = config.features_pt ? `${config.features_pt}px` : "80px";
  const pb = config.features_pb ? `${config.features_pb}px` : "112px";
  return (
    <section
      id="recursos"
      className="relative overflow-hidden"
      style={{ background: bg, paddingTop: pt, paddingBottom: pb, paddingLeft: "1rem", paddingRight: "1rem" }}
    >
      <SectionVideo
        url={config.features_video_url}
        opacity={config.features_video_opacity}
        fit={config.features_video_fit}
        borderPos={config.features_video_border_pos}
        borderWidth={config.features_video_border_width}
        borderRadius={config.features_video_border_radius}
        borderColor={config.features_video_border_color}
      />
      <div className="relative max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center mb-14"
        >
          <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            {L('features_section_label', 'Recursos')}
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-3xl sm:text-5xl font-extrabold mb-4"
            style={{ color: titleColor }}
          >
            {L('features_title', "Tudo que você precisa para o louvor")}
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="max-w-lg mx-auto" style={{ color: subtitleColor }}>
            {L('features_subtitle', "Desenvolvido por músicos de louvor, para músicos de louvor.")}
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={stagger}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {visible.map((f, i) => {
            const IconComponent = ICON_MAP[f.icon_name] ?? Sparkles;
            return (
              <motion.div
                key={f.id}
                variants={fadeUp}
                custom={i}
                className="group rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300"
                style={{ border: `1px solid ${cardBorder}`, background: cardBg }}
              >
                {f.image_url ? (
                  <div className="w-full h-32 overflow-hidden">
                    <img
                      src={f.image_url}
                      alt={f.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="px-6 pt-6 pb-2">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center mb-4 transition"
                      style={{ background: "hsl(var(--primary) / 0.08)" }}
                    >
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                )}
                <div className={f.image_url ? "px-6 pb-6 pt-4" : "px-6 pb-6"}>
                  <h3 className="font-semibold mb-2 text-sm" style={{ color: cardTitleColor }}>
                    {f.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: subtitleColor }}>
                    {f.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <Button
            size="lg"
            onClick={() => navigate("/auth?mode=signup")}
            className="bg-foreground text-background hover:bg-foreground/85 text-base px-8 py-5 rounded-xl font-semibold"
          >
            {L('features_cta', 'Experimente grátis')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

// Sound categories — dynamic styles
const SoundSection = ({
  navigate,
  config,
  L,
}: {
  navigate: ReturnType<typeof useNavigate>;
  config: Record<string, string>;
  L: (key: string, fb?: string) => string;
}) => {
  const bg = config.store_bg || "hsl(220 15% 7%)";
  const titleColor = config.store_title_color || "hsl(0 0% 100%)";
  const subtitleColor = config.store_subtitle_color || "hsl(0 0% 100% / 0.45)";

  return (
    <section
      id="sons"
      className="relative overflow-hidden"
      style={{
        background: bg,
        paddingTop: config.store_pt ? `${config.store_pt}px` : "80px",
        paddingBottom: config.store_pb ? `${config.store_pb}px` : "112px",
        paddingLeft: "1rem",
        paddingRight: "1rem",
      }}
    >
      <SectionVideo
        url={config.store_video_url}
        opacity={config.store_video_opacity}
        fit={config.store_video_fit}
        borderPos={config.store_video_border_pos}
        borderWidth={config.store_video_border_width}
        borderRadius={config.store_video_border_radius}
        borderColor={config.store_video_border_color}
      />
      <div className="relative max-w-5xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center mb-14"
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-xs font-semibold uppercase tracking-widest text-primary mb-3"
          >
            {L('store_section_label', 'Glory Store')}
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-3xl sm:text-5xl font-extrabold mb-4"
            style={{ color: titleColor }}
          >
            {L('store_title', "Uma biblioteca de sons para cada momento")}
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="max-w-lg mx-auto" style={{ color: subtitleColor }}>
            {L('store_subtitle', "Sons de bateria secos, com reverb, loops, continuous pads, efeitos crescentes e muito mais.")}
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="grid grid-cols-2 sm:grid-cols-3 gap-4"
        >
          {DEFAULT_CATEGORIES.map((def, i) => {
            const name = L(`store_cat_${i}_name`, def.name);
            const icon = config[`store_cat_${i}_emoji`] || def.icon;
            const link = config[`store_cat_${i}_link`] || "/auth?mode=signup";
            const catImage = config[`store_cat_${i}_image`];
            return (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="group relative rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                style={{
                  border: `1px solid hsl(${def.color} / 0.2)`,
                  background: `linear-gradient(145deg, hsl(${def.color} / 0.08) 0%, ${bg} 100%)`,
                }}
                onClick={() => navigate(link)}
              >
                {catImage && (
                  <img
                    src={catImage}
                    alt={name}
                    className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity"
                  />
                )}
                
                <h3 className="relative font-bold text-lg mb-1" style={{ color: titleColor }}>
                  {name}
                </h3>
                <p className="relative text-xs" style={{ color: subtitleColor }}>
                  {L('store_cat_available_label', 'Pack disponível na loja')}
                </p>
                <div className="relative mt-2 h-1 w-8 rounded-full" style={{ background: `hsl(${def.color})` }} />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

// How it works — dynamic styles + texts
const HowItWorks = ({ config, L }: { config: Record<string, string>; L: (key: string, fb?: string) => string }) => {
  const bg = config.howitworks_bg || "hsl(0 0% 97%)";
  const titleColor = config.howitworks_title_color || "hsl(220 15% 10%)";
  const stepColor = config.howitworks_step_color || "hsl(0 0% 0% / 0.06)";
  const itemTitleColor = config.howitworks_item_title_color || "hsl(220 15% 10%)";
  const itemDescColor = config.howitworks_item_desc_color || "hsl(220 15% 40%)";
  const mainTitle = L('how_main_title', "Do ensaio ao culto em 3 passos");

  const steps = [
    { step: "01", title: L('how_step_1_title', "Crie sua Setlist"), desc: L('how_step_1_desc', "Adicione músicas, configure os pads de cada uma e salve. Tudo sincronizado na nuvem.") },
    { step: "02", title: L('how_step_2_title', "Configure os Sons"), desc: L('how_step_2_desc', "Escolha sons da biblioteca, importe os seus ou use Spotify AI para configurar automaticamente.") },
    { step: "03", title: L('how_step_3_title', "Toque ao Vivo"), desc: L('how_step_3_desc', "No culto, abra o setlist, selecione a música e toque. Metrônomo e loops sincronizados.") },
  ];

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: bg,
        paddingTop: config.howitworks_pt ? `${config.howitworks_pt}px` : "80px",
        paddingBottom: config.howitworks_pb ? `${config.howitworks_pb}px` : "112px",
        paddingLeft: "1rem",
        paddingRight: "1rem",
      }}
    >
      <SectionVideo
        url={config.howitworks_video_url}
        opacity={config.howitworks_video_opacity}
        fit={config.howitworks_video_fit}
        borderPos={config.howitworks_video_border_pos}
        borderWidth={config.howitworks_video_border_width}
        borderRadius={config.howitworks_video_border_radius}
        borderColor={config.howitworks_video_border_color}
      />
      <div className="relative max-w-4xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center mb-14"
        >
          <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            {L('howitworks_section_label', 'Como funciona')}
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-3xl sm:text-5xl font-extrabold mb-4"
            style={{ color: titleColor }}
          >
            {mainTitle}
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6"
        >
          {steps.map((item, i) => (
            <motion.div key={item.step} variants={fadeUp} custom={i} className="relative text-center sm:text-left">
              <div className="text-6xl font-black leading-none mb-3 mx-auto sm:mx-0" style={{ color: stepColor }}>
                {item.step}
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: itemTitleColor }}>
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: itemDescColor }}>
                {item.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// Pricing — dynamic styles
const Pricing = ({
  navigate,
  config,
  pricing,
  features,
  L,
  paymentMode,
}: {
  navigate: ReturnType<typeof useNavigate>;
  config: Record<string, string>;
  pricing: any[];
  features: any[];
  L: (key: string, fb?: string) => string;
  paymentMode: ReturnType<typeof usePaymentMode>;
}) => {
  const { t } = useTranslation();
  if (config.show_pricing === "false") return null;

  const bg = config.pricing_bg || "hsl(220 15% 7%)";
  const titleColor = config.pricing_title_color || "hsl(0 0% 100%)";
  const subtitleColor = config.pricing_subtitle_color || "hsl(0 0% 100% / 0.45)";
  const tierOrder = ["free", "pro", "master"];

  return (
    <section
      id="planos"
      className="relative overflow-hidden"
      style={{
        background: bg,
        paddingTop: config.pricing_pt ? `${config.pricing_pt}px` : "80px",
        paddingBottom: config.pricing_pb ? `${config.pricing_pb}px` : "112px",
        paddingLeft: "1rem",
        paddingRight: "1rem",
      }}
    >
      <SectionVideo
        url={config.pricing_video_url}
        opacity={config.pricing_video_opacity}
        fit={config.pricing_video_fit}
        borderPos={config.pricing_video_border_pos}
        borderWidth={config.pricing_video_border_width}
        borderRadius={config.pricing_video_border_radius}
        borderColor={config.pricing_video_border_color}
      />
      <div className="relative max-w-5xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center mb-14"
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-xs font-semibold uppercase tracking-widest text-primary mb-3"
          >
            {L('pricing_section_label', 'Planos')}
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-3xl sm:text-5xl font-extrabold mb-4"
            style={{ color: titleColor }}
          >
            {L('plans_title', "Comece grátis. Cresça quando quiser.")}
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="max-w-lg mx-auto" style={{ color: subtitleColor }}>
            {L('plans_subtitle', "Sem contrato, cancele quando quiser.")}
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={stagger}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6"
        >
          {tierOrder.map((tierKey, i) => {
            const plan = pricing.find((p) => p.tier === tierKey);
            if (!plan) return null;
            const tierFeats = features
              .filter((f) => f.tier === tierKey)
              .sort((a: any, b: any) => a.sort_order - b.sort_order);

            return (
              <motion.div
                key={tierKey}
                variants={fadeUp}
                custom={i}
                className="relative rounded-2xl p-7 sm:p-8 flex flex-col"
                style={
                  plan.highlight
                    ? {
                        background: "hsl(0 0% 100%)",
                        border: "2px solid hsl(0 0% 100%)",
                        transform: "scale(1.02)",
                        boxShadow: "0 20px 60px hsl(0 0% 0% / 0.4)",
                      }
                    : {
                        border: "1px solid hsl(0 0% 100% / 0.1)",
                        background: "hsl(0 0% 100% / 0.03)",
                      }
                }
              >
                {plan.badge_text && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1 rounded-full"
                    style={{ background: "hsl(var(--primary))", color: "hsl(0 0% 100%)" }}
                  >
                    {plan.badge_text}
                  </span>
                )}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    {tierKey === "master" && (
                      <Crown
                        className="h-5 w-5"
                        style={{ color: plan.highlight ? "hsl(var(--primary))" : "hsl(45 80% 55%)" }}
                      />
                    )}
                    {tierKey === "pro" && (
                      <Zap
                        className="h-5 w-5"
                        style={{ color: plan.highlight ? "hsl(var(--primary))" : "hsl(262 75% 65%)" }}
                      />
                    )}
                    <h3
                      className="text-xl font-bold"
                      style={{ color: plan.highlight ? "hsl(220 15% 10%)" : "hsl(0 0% 100%)" }}
                    >
                      {plan.name}
                    </h3>
                  </div>
                  <div
                    className="text-4xl font-black"
                    style={{ color: plan.highlight ? "hsl(220 15% 10%)" : "hsl(0 0% 100%)" }}
                  >
                    {plan.price_brl === 0 ? L('pricing_free', t('landing.free')) : `R$${Number(plan.price_brl).toFixed(2)}`}
                    {plan.period && (
                      <span
                        className="text-base font-normal ml-1"
                        style={{ color: plan.highlight ? "hsl(0 0% 0% / 0.4)" : "hsl(0 0% 100% / 0.35)" }}
                      >
                        {plan.period}
                      </span>
                    )}
                  </div>
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {tierFeats.map((f: any) => (
                    <li
                      key={f.feature_key}
                      className="flex items-start gap-2.5 text-sm"
                      style={{
                        color: f.enabled
                          ? plan.highlight
                            ? "hsl(220 15% 15%)"
                            : "hsl(0 0% 100%)"
                          : plan.highlight
                            ? "hsl(0 0% 0% / 0.2)"
                            : "hsl(0 0% 100% / 0.2)",
                      }}
                    >
                      {f.enabled ? (
                        <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "hsl(142 70% 50%)" }} />
                      ) : (
                        <X className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "hsl(0 0% 50%)" }} />
                      )}
                      {f.feature_label}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => navigate("/auth?mode=signup")}
                  className="w-full rounded-xl py-5 font-semibold"
                  style={
                    plan.highlight
                      ? {
                          background: "hsl(220 15% 10%)",
                          color: "hsl(0 0% 100%)",
                        }
                      : {
                          background: "hsl(0 0% 100% / 0.1)",
                          color: "hsl(0 0% 100%)",
                          border: "1px solid hsl(0 0% 100% / 0.15)",
                        }
                  }
                >
                  {plan.cta_text}
                </Button>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

// CTA Final — dynamic styles
const FinalCTA = ({
  navigate,
  config,
  L,
}: {
  navigate: ReturnType<typeof useNavigate>;
  config: Record<string, string>;
  L: (key: string, fb?: string) => string;
}) => {
  const bg = config.cta_bg || "hsl(0 0% 97%)";
  const cardBg = config.cta_card_bg || "hsl(0 0% 100%)";
  const titleColor = config.cta_title_color || "hsl(220 15% 10%)";
  const subtitleColor = config.cta_subtitle_color || "hsl(220 15% 40%)";

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: bg,
        paddingTop: config.cta_pt ? `${config.cta_pt}px` : "80px",
        paddingBottom: config.cta_pb ? `${config.cta_pb}px` : "112px",
        paddingLeft: "1rem",
        paddingRight: "1rem",
      }}
    >
      <SectionVideo
        url={config.cta_video_url}
        opacity={config.cta_video_opacity}
        fit={config.cta_video_fit}
        borderPos={config.cta_video_border_pos}
        borderWidth={config.cta_video_border_width}
        borderRadius={config.cta_video_border_radius}
        borderColor={config.cta_video_border_color}
      />
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="relative max-w-3xl mx-auto text-center"
      >
        <motion.div
          variants={fadeUp}
          custom={0}
          className="relative rounded-3xl p-10 sm:p-16 overflow-hidden"
          style={{ border: "1px solid hsl(0 0% 0% / 0.07)", background: cardBg }}
        >
          {/* Card background video */}
          {config.cta_card_video_url && config.cta_card_video_url.trim() !== "" && (
            <video
              src={config.cta_card_video_url}
              autoPlay muted loop playsInline
              className="absolute inset-0 w-full h-full pointer-events-none rounded-3xl z-[1]"
              style={{
                objectFit: (config.cta_card_video_fit as any) || "cover",
                opacity: parseFloat(config.cta_card_video_opacity || "0.15"),
              }}
            />
          )}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full pointer-events-none"
            style={{ background: "hsl(var(--primary) / 0.06)", filter: "blur(100px)" }}
          />
          <div className="relative">
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-xs font-semibold uppercase tracking-widest text-primary mb-4"
            >
              Glory Pads
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-5xl font-extrabold mb-5"
              style={{ color: titleColor }}
            >
              {L('cta_title', "Pronto para transformar seu louvor?")}
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mb-8 max-w-md mx-auto" style={{ color: subtitleColor }}>
              {L('cta_subtitle', "Junte-se a músicos que já usam o Glory Pads para criar momentos de adoração inesquecíveis.")}
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/auth?mode=signup")}
                className="bg-foreground text-background hover:bg-foreground/85 text-lg px-10 py-6 rounded-xl font-bold"
              >
                {L('cta_button', 'Começar agora — é grátis')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

// Footer — dynamic styles + texts + links
const Footer = ({ navigate, config, L }: { navigate: ReturnType<typeof useNavigate>; config: Record<string, string>; L: (key: string, fb?: string) => string }) => {
  const { t } = useTranslation();
  const bg = config.footer_bg || "hsl(220 15% 5%)";
  const textColor = config.footer_text_color || "hsl(0 0% 100% / 0.35)";
  const tagline = L('footer_tagline', "A ferramenta definitiva para músicos de louvor — pads, loops e muito mais.");
  const copyright = L('footer_copyright', "Glory Pads");
  const logoUrl = config.footer_logo_url;

  const footerLinks = [
    { label: L('footer_link_0_label', "Recursos"), href: config.footer_link_0_href || "#recursos" },
    { label: L('footer_link_1_label', "Planos"), href: config.footer_link_1_href || "#planos" },
    { label: L('footer_link_2_label', "Glory Store"), href: config.footer_link_2_href || "#sons" },
  ];

  return (
    <footer
      className="relative overflow-hidden border-t"
      style={{
        background: bg,
        borderColor: "hsl(0 0% 100% / 0.06)",
        paddingTop: config.footer_pt ? `${config.footer_pt}px` : "40px",
        paddingBottom: config.footer_pb ? `${config.footer_pb}px` : "40px",
        paddingLeft: "1rem",
        paddingRight: "1rem",
      }}
    >
      <SectionVideo
        url={config.footer_video_url}
        opacity={config.footer_video_opacity}
        fit={config.footer_video_fit}
        borderPos={config.footer_video_border_pos}
        borderWidth={config.footer_video_border_width}
        borderRadius={config.footer_video_border_radius}
        borderColor={config.footer_video_border_color}
      />
      <div className="relative max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              {logoUrl ? (
                <img src={logoUrl} alt={copyright} className="h-7 w-auto" />
              ) : (
                <img src={logoLight} alt={copyright} className="h-7 w-auto" />
              )}
              <span className="font-bold" style={{ color: "hsl(0 0% 100%)" }}>
                {copyright}
              </span>
            </div>
            <p className="text-sm max-w-xs" style={{ color: textColor }}>
              {tagline}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            {footerLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="transition"
                style={{ color: textColor }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(0 0% 100%)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = textColor)}
              >
                {l.label}
              </a>
            ))}
            <button onClick={() => navigate("/auth")} className="text-left transition" style={{ color: textColor }}>
              {L('footer_login_label', 'Entrar')}
            </button>
            <button
              onClick={() => navigate("/auth?mode=signup")}
              className="text-left transition"
              style={{ color: textColor }}
            >
              {L('footer_signup_label', 'Criar conta')}
            </button>
            <a href="/install" className="transition" style={{ color: textColor }}>
              {L('footer_install_label', 'Instalar app')}
            </a>
          </div>
        </div>
        <div
          className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs"
          style={{ borderColor: "hsl(0 0% 100% / 0.06)", color: textColor }}
        >
          <p>
            © {new Date().getFullYear()} {copyright}. {t('landing.footer.allRightsReserved')}
          </p>
          <p>{t('landing.footer.madeWithLove')}</p>
        </div>
      </div>
    </footer>
  );
};

// Root
const Landing = () => {
  const navigate = useNavigate();
  useBodyScroll();
  const { config, pricing, features, landingFeatures, loading, getLocalized } = useLandingConfig();
  const prelaunch = usePrelaunchMode();
  const maintenance = useMaintenanceMode();
  const paymentMode = usePaymentMode();
  const restrictedMode = prelaunch.enabled || maintenance.enabled;
  const [showPrelaunch, setShowPrelaunch] = useState(false);

  // Redirect installed app users (PWA/Capacitor) straight to login
  const { user, loading: authLoading } = useAuth();
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      !!(window as any).Capacitor?.isNativePlatform?.() ||
      document.URL.startsWith('capacitor://') ||
      document.URL.startsWith('https://glorypads.com');
    
    console.log('[Landing redirect]', {
      isStandalone,
      user: !!user,
      authLoading,
      prelaunchLoading: prelaunch.loading,
      prelaunchEnabled: prelaunch.enabled,
      maintenanceLoading: maintenance.loading,
      maintenanceEnabled: maintenance.enabled,
      url: document.URL,
    });

    if (
      isStandalone &&
      !user &&
      !authLoading &&
      !prelaunch.loading &&
      !prelaunch.enabled &&
      !maintenance.loading &&
      !maintenance.enabled
    ) {
      console.log('[Landing redirect] → navigating to /auth');
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, prelaunch.loading, prelaunch.enabled, maintenance.loading, maintenance.enabled, navigate]);

  // Intercept navigation when prelaunch or maintenance is active
  const prelaunchNavigate = useCallback((...args: any[]) => {
    const path = typeof args[0] === 'string' ? args[0] : '';
    // Allow /auth navigation if current URL has a valid access key
    const currentAccess = new URLSearchParams(window.location.search).get('access');
    if (restrictedMode && path.startsWith('/auth') && currentAccess) {
      navigate(`/auth?access=${currentAccess}` as any);
      return;
    }
    if (restrictedMode && (path.startsWith('/auth') || path.startsWith('/app') || path.startsWith('/dashboard'))) {
      setShowPrelaunch(true);
      return;
    }
    navigate(args[0] as any, args[1]);
  }, [navigate, restrictedMode]) as ReturnType<typeof useNavigate>;

  const darkColor = config.divider_dark_color || "hsl(220 15% 7%)";
  const hasAnnouncement = config.announcement_enabled === "true" && !!config.announcement_text;

  return (
    <div
      className="overflow-x-hidden"
      style={{
        minHeight: "100vh",
        height: "100%",
        backgroundColor: config?.hero_bg || "#fff",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <AnnouncementBar config={config} L={getLocalized} />
      <Nav navigate={prelaunchNavigate} config={config} hasAnnouncement={hasAnnouncement} L={getLocalized} />

      {/* WHITE hero */}
      <Hero navigate={prelaunchNavigate} config={config} L={getLocalized} />

      {/* white → dark gradient */}
      <Divider fromLight={true} darkColor={darkColor} />

      {/* DARK stats */}
      <Stats config={config} L={getLocalized} />

      {/* dark → white gradient */}
      <Divider fromLight={false} darkColor={darkColor} />

      {/* WHITE features */}
      <Features navigate={prelaunchNavigate} config={config} landingFeatures={landingFeatures} L={getLocalized} />

      {/* WHITE app screenshots */}
      <AppScreenshots config={config} L={getLocalized} />

      {/* white → dark gradient */}
      <Divider fromLight={true} darkColor={darkColor} />

      {/* DARK sound store */}
      <SoundSection navigate={prelaunchNavigate} config={config} L={getLocalized} />

      {/* dark → white gradient */}
      <Divider fromLight={false} darkColor={darkColor} />

      {/* WHITE how it works */}
      <HowItWorks config={config} L={getLocalized} />

      {/* white → dark gradient */}
      <Divider fromLight={true} darkColor={darkColor} />

      {/* DARK pricing (conditional) */}
      {!loading && <Pricing navigate={prelaunchNavigate} config={config} pricing={pricing} features={features} L={getLocalized} paymentMode={paymentMode} />}

      {/* dark → white gradient */}
      <Divider fromLight={false} darkColor={darkColor} />

      {/* WHITE CTA */}
      <FinalCTA navigate={prelaunchNavigate} config={config} L={getLocalized} />

      {/* white → dark gradient */}
      <Divider fromLight={true} darkColor={darkColor} />

      {/* DARK footer */}
      <Footer navigate={prelaunchNavigate} config={config} L={getLocalized} />

      {/* Prelaunch / Maintenance modal */}
      {restrictedMode && (
        <PrelaunchCountdownModal
          open={showPrelaunch}
          onOpenChange={setShowPrelaunch}
          launchDate={prelaunch.enabled ? prelaunch.launchDate : ''}
          customMessage={maintenance.enabled && !prelaunch.enabled ? 'Estamos em manutenção, voltamos em breve!' : prelaunch.customMessage}
        />
      )}
    </div>
  );
};

export default Landing;
