export const COLORS = {
  background: '#0a0e17',
  surface: '#1a1f2e',
  surfaceLight: '#252b3d',
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  border: '#334155',
  white: '#ffffff',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.6)',
  mapStroke: '#ffffff',
};

export const FONTS = {
  regular: { fontSize: 14, color: COLORS.text },
  medium: { fontSize: 16, color: COLORS.text, fontWeight: '500' as const },
  large: { fontSize: 20, color: COLORS.text, fontWeight: '600' as const },
  title: { fontSize: 28, color: COLORS.text, fontWeight: '700' as const },
  caption: { fontSize: 12, color: COLORS.textSecondary },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
};

// Connecticut map defaults
export const CT_CENTER = {
  latitude: 41.55,
  longitude: -72.75,
  latitudeDelta: 1.2,
  longitudeDelta: 1.0,
};
