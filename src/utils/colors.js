export const DEFAULT_PRIMARY = { h: 0, s: 85, l: 60 };
export const DEFAULT_SECONDARY = { h: 46, s: 86, l: 47 };

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
