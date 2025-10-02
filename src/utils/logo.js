export const DEFAULT_LOGO_POSITION = { x: 0, y: 0 };
export const DEFAULT_LOGO_SCALE = 1;
export const DEFAULT_TEAM_LOGO_SCALE = 1;

export const normalizeLogoPosition = (value) => {
  if (!value || typeof value !== "object") return { ...DEFAULT_LOGO_POSITION };
  const x = Number(value.x);
  const y = Number(value.y);
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
  };
};
