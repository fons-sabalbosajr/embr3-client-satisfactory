// Admin theme — the ARTA palette used by the client survey and the sign-in
// pages (blue #0038a8 · red #ce1126 · yellow #fcd116 on navy), applied to the
// admin shell.
//
// Still configurable: each user's saved preferences (My Account → Appearance)
// override the defaults —
//   siderBg       sidebar colour        (null → ARTA navy gradient)
//   headerBg      header colour         (null → white / navy by mode)
//   colorPrimary  buttons, links, focus (null → ARTA blue / bright blue in dark)
// and the light/dark switch picks the mode. A value that is not a valid hex
// colour is treated as "use the default".

export const ARTA = { blue: "#0038a8", red: "#ce1126", yellow: "#fcd116", ink: "#0a1a3f" };

const MODE = {
  light: {
    primary: ARTA.blue,
    layoutBg: "#f2f5fc",
    surface: "#ffffff",
    elevated: "#ffffff",
    border: "#dfe5f2",
    borderSoft: "#eaeff8",
    text: ARTA.ink,
    muted: "#4a5878",
    siderBase: "#061f5c",
    siderGradient: "linear-gradient(180deg, #0a2a78 0%, #062062 42%, #061a4d 100%)",
    headerBg: "#ffffff",
  },
  dark: {
    primary: "#4f7dff",
    layoutBg: "#070f24",
    surface: "#0d1833",
    elevated: "#16254a",
    border: "#24365e",
    borderSoft: "#1a2a4d",
    text: "#e8eefc",
    muted: "#a9b6d4",
    siderBase: "#071330",
    siderGradient: "linear-gradient(180deg, #0b1d4a 0%, #081538 45%, #050d22 100%)",
    headerBg: "#0b1736",
  },
};

export const isHex = (v) => typeof v === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
export const cleanPref = (v) => (isHex(v) ? v.trim() : null);

export const normalizePrefs = (p = {}) => ({
  siderBg: cleanPref(p.siderBg),
  headerBg: cleanPref(p.headerBg),
  colorPrimary: cleanPref(p.colorPrimary),
});

const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

export const luminance = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  const [R, G, B] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};

const rgba = (hex, a) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

// Text and state colours for a surface, light or dark.
function surfaceInk(bgHex, primary) {
  const light = luminance(bgHex) > 0.45;
  return light
    ? {
        isLight: true,
        text: "#33415e",
        strong: ARTA.ink,
        muted: "#6b7896",
        hover: rgba(primary, 0.07),
        selected: rgba(primary, 0.12),
        selectedText: primary,
        indicator: primary,
        border: "rgba(10, 26, 63, 0.08)",
      }
    : {
        isLight: false,
        text: "rgba(226, 234, 255, 0.84)",
        strong: "#ffffff",
        muted: "rgba(169, 193, 255, 0.6)",
        hover: "rgba(255, 255, 255, 0.07)",
        selected: "rgba(255, 255, 255, 0.13)",
        selectedText: "#ffffff",
        indicator: ARTA.yellow,
        border: "rgba(255, 255, 255, 0.08)",
      };
}

/**
 * Everything the shell needs for one mode + set of preferences:
 *   antd   — ConfigProvider theme (algorithm chosen by the caller)
 *   vars   — CSS custom properties for adminpage.css
 *   sider  — ink for the sidebar (menu tokens, logo text)
 */
export function buildAdminTheme({ dark, prefs }) {
  const m = dark ? MODE.dark : MODE.light;
  const p = normalizePrefs(prefs);
  const primary = p.colorPrimary || m.primary;
  const siderBase = p.siderBg || m.siderBase;
  const siderBackground = p.siderBg || m.siderGradient;
  const headerBg = p.headerBg || m.headerBg;
  const sider = surfaceInk(siderBase, primary);
  const header = surfaceInk(headerBg, primary);

  const vars = {
    "--adm-primary": primary,
    "--adm-primary-soft": rgba(primary, dark ? 0.18 : 0.1),
    "--adm-layout-bg": m.layoutBg,
    "--adm-surface": m.surface,
    "--adm-border": m.border,
    "--adm-border-soft": m.borderSoft,
    "--adm-text": m.text,
    "--adm-muted": m.muted,
    "--adm-sider-bg": siderBackground,
    "--adm-sider-text": sider.text,
    "--adm-sider-strong": sider.strong,
    "--adm-sider-muted": sider.muted,
    "--adm-sider-hover": sider.hover,
    "--adm-sider-selected": sider.selected,
    "--adm-sider-indicator": sider.indicator,
    "--adm-sider-border": sider.border,
    "--adm-header-bg": headerBg,
    "--adm-header-text": header.strong,
    "--adm-header-muted": header.muted,
    "--adm-header-hover": header.hover,
    "--adm-header-border": header.isLight ? "rgba(10, 26, 63, 0.08)" : "rgba(255, 255, 255, 0.08)",
  };

  const antd = {
    token: {
      colorPrimary: primary,
      colorInfo: primary,
      colorLink: primary,
      borderRadius: 10,
      colorBgLayout: m.layoutBg,
      colorBgContainer: m.surface,
      colorBgElevated: m.elevated,
      colorBorder: m.border,
      colorBorderSecondary: m.borderSoft,
      colorText: dark ? "rgba(232, 238, 252, 0.92)" : "rgba(10, 26, 63, 0.92)",
      colorTextSecondary: dark ? "rgba(214, 222, 240, 0.7)" : "rgba(10, 26, 63, 0.64)",
      fontFamily: "'Plus Jakarta Sans', 'Inter', 'Poppins', system-ui, sans-serif",
    },
    components: {
      Layout: {
        bodyBg: m.layoutBg,
        siderBg: "transparent",
        headerBg,
        footerBg: "transparent",
      },
      Menu: {
        itemBg: "transparent",
        subMenuItemBg: "transparent",
        popupBg: siderBase,
        itemColor: sider.text,
        itemHoverColor: sider.strong,
        itemHoverBg: sider.hover,
        itemSelectedColor: sider.selectedText,
        itemSelectedBg: sider.selected,
        itemActiveBg: sider.selected,
        groupTitleColor: sider.muted,
        groupTitleFontSize: 11,
        itemBorderRadius: 10,
        itemMarginInline: 10,
        itemHeight: 42,
        iconSize: 16,
        collapsedIconSize: 18,
      },
    },
  };

  return { antd, vars, sider, header, primary };
}

// Presets offered in My Account → Appearance. null = the ARTA default.
export const THEME_PRESETS = [
  { name: "ARTA (default)", siderBg: null, headerBg: null, colorPrimary: null },
  { name: "ARTA light sidebar", siderBg: "#ffffff", headerBg: null, colorPrimary: null },
  { name: "Midnight", siderBg: "#0b1220", headerBg: "#0b1220", colorPrimary: "#4f7dff" },
  { name: "Ember Green", siderBg: "#003b2f", headerBg: null, colorPrimary: "#2f7d5f" },
  { name: "Forest", siderBg: "#0f2f1f", headerBg: "#0f2f1f", colorPrimary: "#4caf50" },
  { name: "Sunset", siderBg: "#2d1b38", headerBg: null, colorPrimary: "#d46b08" },
];
