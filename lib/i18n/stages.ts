export type AppLanguage = 'en' | 'vi';

const STAGE_LABELS: Record<AppLanguage, Record<string, string>> = {
  en: {
    Inquiry: 'Inquiry',
    Designing: 'Designing',
    Quoted: 'Quoted',
    Negotiation: 'Negotiation',
    Confirmed: 'Confirmed',
    Completed: 'Completed',
    Lost: 'Lost',
    'On Tour': 'On Tour',
    Pending: 'Pending',
    Won: 'Won',
  },
  vi: {
    Inquiry: 'Yêu cầu',
    Designing: 'Thiết kế',
    Quoted: 'Báo giá',
    Negotiation: 'Đàm phán',
    Confirmed: 'Xác nhận',
    Completed: 'Hoàn tất',
    Lost: 'Mất',
    'On Tour': 'Đang tour',
    Pending: 'Chờ',
    Won: 'Thắng',
  },
};

export function tStage(stage: string, language: AppLanguage): string {
  return STAGE_LABELS[language][stage] ?? STAGE_LABELS.en[stage] ?? stage;
}
