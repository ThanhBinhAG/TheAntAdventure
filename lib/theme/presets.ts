/** CRM UI color theme preset IDs and CSS token maps (per-user, client-only). */

export const CRM_THEME_IDS = [
  'default',
  'forest',
  'ocean',
  'slate',
  'orchid',
] as const;

export type CrmThemeId = (typeof CRM_THEME_IDS)[number];

/** Color tokens only — font size is controlled separately (`crm.fontSize`). */
export type CrmThemeCssVars = {
  '--g': string;
  '--gl': string;
  '--gd': string;
  '--gm': string;
  '--gold': string;
  '--gold-l': string;
  '--bg': string;
  '--s': string;
  '--b': string;
  '--t': string;
  '--td': string;
  '--m': string;
};

export type CrmThemePreset = {
  id: CrmThemeId;
  en: string;
  vi: string;
  enDesc: string;
  viDesc: string;
  vars: CrmThemeCssVars;
};

/** Factory palette — matches `:root` in app/globals.css. */
export const DEFAULT_THEME_VARS: CrmThemeCssVars = {
  '--g': '#2E7D52',
  '--gl': '#E8F5EE',
  '--gd': '#1a5c38',
  '--gm': '#5AA87A',
  '--gold': '#C9A84C',
  '--gold-l': '#FDF6E3',
  '--bg': '#F7F8F6',
  '--s': '#fff',
  '--b': '#E2E8E4',
  '--t': '#1a2e23',
  '--td': '#1a2e23',
  '--m': '#6B7F74',
};

export const CRM_THEME_PRESETS: readonly CrmThemePreset[] = [
  {
    id: 'default',
    en: 'Default',
    vi: 'Mặc định',
    enDesc: 'Ant green and gold — company standard.',
    viDesc: 'Xanh Ant và vàng — chuẩn công ty.',
    vars: { ...DEFAULT_THEME_VARS },
  },
  {
    id: 'forest',
    en: 'Forest',
    vi: 'Rừng',
    enDesc: 'Deeper greens, same layout.',
    viDesc: 'Xanh đậm hơn, cùng bố cục.',
    vars: {
      '--g': '#1B5E3B',
      '--gl': '#E2F0E8',
      '--gd': '#0F3D28',
      '--gm': '#3D8F62',
      '--gold': '#B8953A',
      '--gold-l': '#F8F0D8',
      '--bg': '#F4F7F5',
      '--s': '#fff',
      '--b': '#D5E0D9',
      '--t': '#12261C',
      '--td': '#12261C',
      '--m': '#5A7064',
    },
  },
  {
    id: 'ocean',
    en: 'Ocean',
    vi: 'Đại dương',
    enDesc: 'Cool blue primary and surfaces.',
    viDesc: 'Xanh dương mát, bề mặt lạnh.',
    vars: {
      '--g': '#1A6B8A',
      '--gl': '#E5F3F8',
      '--gd': '#0E4A62',
      '--gm': '#4A92AE',
      '--gold': '#D4A84B',
      '--gold-l': '#FDF6E3',
      '--bg': '#F5F8FA',
      '--s': '#fff',
      '--b': '#D5E2E9',
      '--t': '#142830',
      '--td': '#142830',
      '--m': '#5E7380',
    },
  },
  {
    id: 'slate',
    en: 'Slate',
    vi: 'Xám đá',
    enDesc: 'Cool gray professional look.',
    viDesc: 'Xám lạnh, phong cách chuyên nghiệp.',
    vars: {
      '--g': '#3D5A6C',
      '--gl': '#E8EEF1',
      '--gd': '#243B48',
      '--gm': '#6A8494',
      '--gold': '#A89060',
      '--gold-l': '#F5F0E6',
      '--bg': '#F6F7F8',
      '--s': '#fff',
      '--b': '#DCE2E6',
      '--t': '#1A242C',
      '--td': '#1A242C',
      '--m': '#64748B',
    },
  },
  {
    id: 'orchid',
    en: 'Orchid',
    vi: 'Phong lan',
    enDesc: 'Muted plum accent on soft surfaces.',
    viDesc: 'Tím mận dịu trên nền mềm.',
    vars: {
      '--g': '#6B4C7A',
      '--gl': '#F3EBF6',
      '--gd': '#4A3356',
      '--gm': '#8B6B99',
      '--gold': '#C4A35A',
      '--gold-l': '#FBF6E8',
      '--bg': '#F8F6F9',
      '--s': '#fff',
      '--b': '#E4DCE8',
      '--t': '#2A1F30',
      '--td': '#2A1F30',
      '--m': '#6E6178',
    },
  },
];

export function getThemePreset(id: CrmThemeId): CrmThemePreset {
  return CRM_THEME_PRESETS.find((p) => p.id === id) ?? CRM_THEME_PRESETS[0];
}
