/** Per-user CRM base font size (independent of color theme). */

export const CRM_FONT_SIZE_IDS = ['small', 'medium', 'large', 'xlarge'] as const;

export type CrmFontSizeId = (typeof CRM_FONT_SIZE_IDS)[number];

/** Design baseline — matches factory body size in globals.css. */
export const CRM_FONT_SIZE_BASE_PX = 13;

export type CrmFontSizeOption = {
  id: CrmFontSizeId;
  px: string;
  /** Scales the CRM shell (hardcoded `px` rules) via `zoom`. */
  scale: number;
  en: string;
  vi: string;
  enSample: string;
  viSample: string;
};

export const CRM_FONT_SIZE_OPTIONS: readonly CrmFontSizeOption[] = [
  {
    id: 'small',
    px: '12px',
    scale: 12 / CRM_FONT_SIZE_BASE_PX,
    en: 'Small',
    vi: 'Nhỏ',
    enSample: 'Compact UI text',
    viSample: 'Chữ giao diện gọn',
  },
  {
    id: 'medium',
    px: '13px',
    scale: 1,
    en: 'Medium',
    vi: 'Vừa',
    enSample: 'Standard CRM size',
    viSample: 'Cỡ chữ CRM chuẩn',
  },
  {
    id: 'large',
    px: '14.5px',
    scale: 14.5 / CRM_FONT_SIZE_BASE_PX,
    en: 'Large',
    vi: 'Lớn',
    enSample: 'Easier to read',
    viSample: 'Dễ đọc hơn',
  },
  {
    id: 'xlarge',
    px: '16px',
    scale: 16 / CRM_FONT_SIZE_BASE_PX,
    en: 'Extra large',
    vi: 'Rất lớn',
    enSample: 'Maximum comfort',
    viSample: 'Thoải mái tối đa',
  },
];

export function isCrmFontSizeId(
  value: string | null | undefined,
): value is CrmFontSizeId {
  return (
    typeof value === 'string' &&
    (CRM_FONT_SIZE_IDS as readonly string[]).includes(value)
  );
}

export function getFontSizeOption(id: CrmFontSizeId): CrmFontSizeOption {
  return (
    CRM_FONT_SIZE_OPTIONS.find((o) => o.id === id) ?? CRM_FONT_SIZE_OPTIONS[1]
  );
}
