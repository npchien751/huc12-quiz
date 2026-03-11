export const BASIN_COLORS: Record<string, string> = {
  '01080205': '#3b82f6', // Lower Connecticut — blue
  '01080206': '#3b82f6', // Lower Connecticut (cont.) — blue
  '01080207': '#10b981', // Farmington — emerald
  '01090005': '#a855f7', // Pawcatuck-Wood — purple
  '01100001': '#f59e0b', // Quinebaug — amber
  '01100002': '#ef4444', // Shetucket — red
  '01100003': '#06b6d4', // Thames — cyan
  '01100004': '#8b5cf6', // Quinnipiac — violet
  '01100005': '#22c55e', // Housatonic — green
  '01100006': '#f97316', // Saugatuck — orange
  '01100007': '#a855f7', // Pawcatuck-Wood (cont.) — purple
  '02030203': '#64748b', // Long Island Sound — slate
  '02030101': '#ec4899', // Croton — pink
  '02030102': '#ec4899', // Croton (cont.) — pink
};

export interface BasinInfo {
  code: string;
  name: string;
  color: string;
}

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
  return BASIN_COLORS[huc8Code] || '#94a3b8';
}
