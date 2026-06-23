import type { AppLanguage } from '../stages';
import { tc, type CommonKey } from '../common';

export const SALES: Record<AppLanguage, Record<string, string>> = {
  en: {
    policyQuickRef: 'Quick reference for sales staff. Full policy version in',
    regulationsLink: 'Regulations page →',
    bookingPaymentPolicy: '📋 Booking & Payment Policy',
    cancellationPolicy: '🚫 Cancellation Policy',
    noticePeriod: 'Notice Period',
    penalty: 'Penalty',
    deposit30: 'Non-refundable deposit to confirm. Payable within 7 days of confirmation.',
    balance70: 'Balance due 45 days before departure. Bookings within 45 days: full payment at confirmation.',
    fxPolicy: 'All prices in USD. Payment via bank transfer or credit card (+2.5% fee).',
    b2bCommission: 'Agent commission within 14 days of completion. Bronze 8% / Silver 12% / Gold 15% / Platinum 20%.',
    cancel60plus: '60+ days before',
    cancelDepositForfeited: 'Deposit forfeited',
    cancel45to59: '45–59 days',
    cancel30pct: '30% of total',
    cancel30to44: '30–44 days',
    cancel50pct: '50% of total',
    cancel15to29: '15–29 days',
    cancel75pct: '75% of total',
    cancel0to14: '0–14 days / no-show',
    cancel100pct: '100% of total',
    weightedFormula: 'Weighted = stage probability × deal value',
    leadId: 'Lead ID',
    customer: 'Customer',
    travelDate: 'Travel Date',
    selectReason: '— Select reason —',
    optionalContext: 'Optional context...',
    datesUnavailable: 'Dates unavailable',
    preferredDates: 'your preferred dates',
    aiEmailGreeting: 'Dear',
    aiEmailThanks: 'Thank you for your interest in',
    aiEmailPreparing: 'We are preparing a tailored proposal for',
    aiEmailGuests: 'guests travelling in',
    aiEmailFollowUp: 'Our team at The Ant Adventures will follow up shortly with itinerary options and pricing.',
    aiEmailRegards: 'Warm regards,',
    aiEmailSignature: 'The Ant Adventures',
    paxSuffix: 'pax',
  },
  vi: {
    policyQuickRef: 'Tài liệu tham khảo nhanh cho nhân viên bán hàng. Phiên bản chính sách đầy đủ tại',
    regulationsLink: 'Trang Quy định →',
    bookingPaymentPolicy: '📋 Chính sách Đặt tour & Thanh toán',
    cancellationPolicy: '🚫 Chính sách Hủy tour',
    noticePeriod: 'Thời hạn báo trước',
    penalty: 'Phạt',
    deposit30: 'Đặt cọc không hoàn lại để xác nhận. Thanh toán trong vòng 7 ngày kể từ khi xác nhận.',
    balance70: 'Số dư thanh toán trước 45 ngày khởi hành. Đặt trong vòng 45 ngày: thanh toán toàn bộ khi xác nhận.',
    fxPolicy: 'Tất cả giá tính bằng USD. Thanh toán qua chuyển khoản hoặc thẻ tín dụng (+2,5% phí).',
    b2bCommission: 'Hoa hồng đại lý trong 14 ngày sau khi hoàn thành. Đồng 8% / Bạc 12% / Vàng 15% / Bạch kim 20%.',
    cancel60plus: 'Trước 60+ ngày',
    cancelDepositForfeited: 'Mất tiền cọc',
    cancel45to59: '45–59 ngày',
    cancel30pct: '30% tổng giá trị',
    cancel30to44: '30–44 ngày',
    cancel50pct: '50% tổng giá trị',
    cancel15to29: '15–29 ngày',
    cancel75pct: '75% tổng giá trị',
    cancel0to14: '0–14 ngày / không đến',
    cancel100pct: '100% tổng giá trị',
    weightedFormula: 'Có trọng số = xác suất giai đoạn × giá trị deal',
    leadId: 'Mã lead',
    customer: 'Khách hàng',
    travelDate: 'Ngày đi',
    selectReason: '— Chọn lý do —',
    optionalContext: 'Ghi chú thêm (tùy chọn)...',
    datesUnavailable: 'Ngày không khả dụng',
    preferredDates: 'ngày bạn mong muốn',
    aiEmailGreeting: 'Kính gửi',
    aiEmailThanks: 'Cảm ơn bạn đã quan tâm đến',
    aiEmailPreparing: 'Chúng tôi đang chuẩn bị đề xuất riêng cho',
    aiEmailGuests: 'khách, dự kiến đi vào',
    aiEmailFollowUp: 'Đội ngũ The Ant Adventures sẽ sớm liên hệ với lịch trình và báo giá.',
    aiEmailRegards: 'Trân trọng,',
    aiEmailSignature: 'The Ant Adventures',
    paxSuffix: 'khách',
  },
};

export type SalesKey = keyof typeof SALES.en;

export function tsf(key: SalesKey, language: AppLanguage): string {
  return SALES[language][key] ?? SALES.en[key];
}

const LOST_REASON_KEYS: Record<string, CommonKey | 'datesUnavailable'> = {
  'Price too high': 'priceTooHigh',
  'Chose competitor': 'choseCompetitor',
  'Dates unavailable': 'datesUnavailable',
  'No response': 'noResponse',
  'Changed plans': 'changedPlans',
  Other: 'other',
};

export function tLostReason(reason: string, language: AppLanguage): string {
  const key = LOST_REASON_KEYS[reason];
  if (!key) return reason;
  if (key === 'datesUnavailable') return tsf('datesUnavailable', language);
  return tc(key, language);
}
