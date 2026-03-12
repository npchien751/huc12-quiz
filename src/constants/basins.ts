// ── State definitions ─────────────────────────────────────────────────────────

export interface StateInfo {
  code: string;
  name: string;
  color: string;
}

export const STATES: StateInfo[] = [
  { code: 'CT', name: 'Connecticut', color: '#3b82f6' },
  { code: 'MA', name: 'Massachusetts', color: '#10b981' },
  { code: 'RI', name: 'Rhode Island', color: '#f59e0b' },
  { code: 'VT', name: 'Vermont', color: '#22c55e' },
  { code: 'NH', name: 'New Hampshire', color: '#a855f7' },
  { code: 'ME', name: 'Maine', color: '#ef4444' },
];

export const STATE_COLORS: Record<string, string> = {
  CT: '#3b82f6',
  MA: '#10b981',
  RI: '#f59e0b',
  VT: '#22c55e',
  NH: '#a855f7',
  ME: '#ef4444',
};

export function getStateColor(stateCode: string): string {
  return STATE_COLORS[stateCode] || '#94a3b8';
}

// ── HUC-6 (Accounting Unit) definitions ──────────────────────────────────────

export interface Huc6Info {
  code: string;
  name: string;
  color: string;
}

export const HUC6_COLORS: Record<string, string> = {
  '010100': '#ef4444', // St. John — red (Maine)
  '010200': '#f97316', // Penobscot — orange
  '010300': '#f59e0b', // Kennebec — amber
  '010400': '#84cc16', // Androscoggin — lime
  '010500': '#10b981', // Saco — emerald
  '010600': '#06b6d4', // Connecticut — cyan
  '010700': '#3b82f6', // Southern New England — blue
  '010800': '#6366f1', // Lower Connecticut — indigo
  '010900': '#a855f7', // Blackstone-Narragansett — purple
  '011000': '#ec4899', // Housatonic-Thames — pink
  '011001': '#f43f5e', // Rhode Island — rose
  '010801': '#0d9488', // Lake Champlain — teal
  '010802': '#0ea5e9', // Lower Connecticut — sky
  '020200': '#94a3b8', // Upper Delaware — gray
  '020301': '#64748b', // Upper Hudson — slate
  '020302': '#78716c', // Long Island Sound — stone
};

// HUC6_BASINS is derived at runtime from the data so it always reflects
// what's actually in ne_huc12.json. See geo-utils.ts getAllHuc6Basins().

export function getHuc6Color(huc6Code: string): string {
  return HUC6_COLORS[huc6Code] || '#94a3b8';
}

// ── HUC-8 (Subbasin) definitions ─────────────────────────────────────────────

export const BASIN_COLORS: Record<string, string> = {
  // Connecticut
  '01080205': '#3b82f6',
  '01080206': '#3b82f6',
  '01080207': '#10b981',
  '01090005': '#a855f7',
  '01100001': '#f59e0b',
  '01100002': '#ef4444',
  '01100003': '#06b6d4',
  '01100004': '#8b5cf6',
  '01100005': '#22c55e',
  '01100006': '#f97316',
  '01100007': '#a855f7',
  '02030203': '#64748b',
  '02030101': '#ec4899',
  '02030102': '#ec4899',
  // Maine
  '01010001': '#ef4444',
  '01010002': '#dc2626',
  '01010003': '#b91c1c',
  '01010004': '#991b1b',
  '01010005': '#7f1d1d',
  '01020001': '#f97316',
  '01020002': '#ea580c',
  '01020003': '#c2410c',
  '01020004': '#9a3412',
  '01020005': '#7c2d12',
  '01030001': '#f59e0b',
  '01030002': '#d97706',
  '01030003': '#b45309',
  '01040001': '#84cc16',
  '01040002': '#65a30d',
  '01050001': '#10b981',
  '01050002': '#059669',
  '01050003': '#047857',
  '01050004': '#065f46',
  // NH/VT/MA — Connecticut River watershed
  '01060001': '#06b6d4',
  '01060002': '#0891b2',
  '01060003': '#0e7490',
  '01060004': '#155e75',
  '01060005': '#164e63',
  // Merrimack
  '01070001': '#6366f1',
  '01070002': '#4f46e5',
  '01070003': '#4338ca',
  '01070004': '#3730a3',
  '01070005': '#312e81',
  '01070006': '#6366f1',
  '01070007': '#818cf8',
  // Lake Champlain / VT
  '01080101': '#22c55e',
  '01080102': '#16a34a',
  '01080103': '#15803d',
  '01080104': '#166534',
  '01080201': '#4ade80',
  '01080202': '#86efac',
  '01080203': '#bbf7d0',
  '01080204': '#dcfce7',
  // MA/RI coastal
  '01090001': '#a855f7',
  '01090002': '#9333ea',
  '01090003': '#7e22ce',
  '01090004': '#6b21a8',
  '01090006': '#c084fc',
  '01100008': '#ec4899',
  '01100009': '#db2777',
  '02030203': '#64748b',
};

export interface BasinInfo {
  code: string;
  name: string;
  color: string;
}

// HUC-8 basins are derived at runtime from the data (see geo-utils.ts
// getHuc8Basins / getHuc8BasinsForState / getHuc8BasinsForHuc6).
// The static BASINS list below is kept for backwards compatibility.
export const BASINS: BasinInfo[] = [
  { code: '01080205', name: 'Lower Connecticut', color: '#3b82f6' },
  { code: '01080207', name: 'Farmington', color: '#10b981' },
  { code: '01100005', name: 'Housatonic', color: '#22c55e' },
  { code: '01100001', name: 'Quinebaug', color: '#f59e0b' },
  { code: '01100002', name: 'Shetucket', color: '#ef4444' },
  { code: '01100004', name: 'Quinnipiac', color: '#8b5cf6' },
  { code: '01100006', name: 'Saugatuck', color: '#f97316' },
  { code: '01100003', name: 'Thames', color: '#06b6d4' },
  { code: '01090005', name: 'Pawcatuck-Wood', color: '#a855f7' },
  { code: '02030101', name: 'Croton', color: '#ec4899' },
  { code: '02030203', name: 'Long Island Sound', color: '#64748b' },
];

export function getBasinColor(huc8Code: string): string {
  return BASIN_COLORS[huc8Code] || getHuc6Color(huc8Code.substring(0, 6));
}
