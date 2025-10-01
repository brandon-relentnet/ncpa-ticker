export const DEFAULT_PRIMARY = { h: 0, s: 0, l: 0 };
export const DEFAULT_SECONDARY = { h: 0, s: 0, l: 100 };
export const DEFAULT_SCORE_BACKGROUND = { h: 0, s: 0, l: 22 };
export const DEFAULT_BADGE_BACKGROUND = { h: 0, s: 100, l: 22 };
export const DEFAULT_TICKER_BACKGROUND = { h: 120, s: 100, l: 50 };
export const DEFAULT_TEXT_COLOR = { h: 0, s: 0, l: 100 };

export const hsl = ({ h, s, l }) => `hsl(${h} ${s}% ${l}%)`;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function hslToRgb({ h, s, l }) {
  const hue = clamp(h, 0, 360);
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;

  const k = (n) => (n + hue / 30) % 12;
  const a = saturation * Math.min(lightness, 1 - lightness);
  const f = (n) =>
    lightness - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4)),
  ];
}

export function luminance(rgb) {
  const [r, g, b] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

export function contrastTextColor(color) {
  const lum = luminance(hslToRgb(color));
  return lum > 0.5 ? "black" : "white";
}

export function hexToHsl(hex) {
  if (typeof hex !== "string") return null;
  const match = hex.trim().match(/^#?([a-f0-9]{6})$/i);
  if (!match) return null;

  const value = match[1];
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToHex({ h, s, l }) {
  const rgb = hslToRgb({ h, s, l });
  return `#${rgb
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}
