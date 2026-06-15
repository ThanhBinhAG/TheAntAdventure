import type { PageSlug } from './types';

export const FX = { USD: 1, EUR: 0.92, VND: 25000 } as const;
export const FX_SYM = { USD: '$', EUR: '€', VND: '₫' } as const;

export const STAGE_ORDER = [
  'Completed',
  'Confirmed',
  'Negotiation',
  'Quoted',
  'Designing',
  'Inquiry',
] as const;

export const STAGE_PROB_V22: Record<string, number> = {
  Inquiry: 10,
  Designing: 25,
  Quoted: 40,
  Negotiation: 40,
  Pending: 70,
  Confirmed: 90,
  'On Tour': 95,
  Completed: 100,
  Lost: 0,
};

export const STAGE_COLORS: Record<string, string> = {
  Inquiry: 'bdg-b',
  Designing: 'bdg-p',
  Quoted: 'bdg-a',
  Negotiation: 'bdg-a',
  Confirmed: 'bdg-g',
  'On Tour': 'bdg-g',
  Completed: 'bdg-g',
  Lost: 'bdg-r',
};

export const SRC_COLORS: Record<string, string> = {
  Referral: 'bdg-g',
  Website: 'bdg-b',
  Agent: 'bdg-p',
  Direct: 'bdg-w',
  Virtuoso: 'bdg-a',
  Abercrombie: 'bdg-a',
};

export const PIPELINE_STAGES = [
  'Inquiry',
  'Designing',
  'Quoted',
  'Negotiation',
  'Won',
  'Lost',
] as const;

export const SALES_STAGES = [
  'Inquiry',
  'Designing',
  'Quoted',
  'Negotiation',
  'Confirmed',
  'Completed',
  'Lost',
  'On Tour',
] as const;

export const PAGE_TITLES: Record<PageSlug, string> = {
  dashboard: 'Dashboard',
  planner: 'Daily Planner',
  customers: 'Clients',
  agents: 'B2B Agents',
  sales: 'Sales Pipeline',
  tourdesign: 'Tour Design Studio ✦',
  products: 'Tour Products',
  gallery: 'Photo Gallery',
  pricing: 'Pricing',
  bookings: 'Bookings',
  contracts: 'Contracts',
  suppliers: 'Suppliers',
  guides: 'Guides',
  weather: 'Weather Guide',
  attractions: 'Attraction Schedule 🏛',
  posttour: 'Post-Tour & Feedback ⭐',
  finance: 'Finance',
  tax: 'Tax',
  salary: 'Salary',
  about: 'About Us',
  culture: 'Culture',
  regulations: 'Regulations',
  hr: 'Human Resources',
  ai: 'AI Requirements ⚡',
  devnotes: 'Dev Notes 📝',
  teamchat: 'Team Chat 💬',
};

export const VI_LABELS: Record<string, string> = {
  Dashboard: 'Bảng điều hành',
  Clients: 'Khách hàng',
  'B2B Agents': 'Đại lý B2B',
  'Sales Pipeline': 'Kênh bán hàng',
  'Tour Design Studio ✦': 'Thiết kế tour ✦',
  'Tour Products': 'Sản phẩm tour',
  Pricing: 'Bảng giá',
  Bookings: 'Đặt tour',
  Suppliers: 'Nhà cung cấp',
  Guides: 'Hướng dẫn viên',
  Finance: 'Tài chính',
  Tax: 'Thuế',
  Salary: 'Lương thưởng',
  'About Us': 'Về chúng tôi',
  Culture: 'Văn hóa',
  Regulations: 'Quy định',
  'Human Resources': 'Nhân sự',
  'Weather Guide': 'Thời tiết',
  'Photo Gallery': 'Thư viện ảnh',
  'AI Requirements ⚡': 'Yêu cầu AI',
  'Dev Notes 📝': 'Ghi chú kỹ thuật',
  'Team Chat 💬': 'Chat nội bộ',
  'Daily Planner': 'Kế hoạch ngày',
  Contracts: 'Hợp đồng',
  'Attraction Schedule 🏛': 'Lịch điểm tham quan',
  'Post-Tour & Feedback ⭐': 'Hậu tour & Phản hồi',
};

export interface NavItem {
  page: PageSlug;
  icon: string;
  en: string;
  vi: string;
  badge?: string;
  badgeType?: 'ceo' | 'new';
}

export interface NavSection {
  en: string;
  vi: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    en: 'Sales & Product',
    vi: 'Bán hàng & Sản phẩm',
    items: [
      { page: 'dashboard', icon: '◈', en: 'Dashboard', vi: 'Bảng điều hành', badge: 'CEO', badgeType: 'ceo' },
      { page: 'planner', icon: '📅', en: 'Daily Planner', vi: 'Kế hoạch ngày' },
      { page: 'customers', icon: '◎', en: 'Clients', vi: 'Khách hàng' },
      { page: 'agents', icon: '🤝', en: 'B2B Agents', vi: 'Đại lý B2B' },
      { page: 'sales', icon: '◉', en: 'Sales Pipeline', vi: 'Kênh bán hàng' },
      { page: 'tourdesign', icon: '✦', en: 'Tour Design', vi: 'Thiết kế tour', badge: 'AI', badgeType: 'new' },
      { page: 'products', icon: '◆', en: 'Tour Products', vi: 'Sản phẩm tour' },
      { page: 'gallery', icon: '🖼', en: 'Photo Gallery', vi: 'Thư viện ảnh' },
      { page: 'pricing', icon: '◈', en: 'Pricing', vi: 'Bảng giá' },
    ],
  },
  {
    en: 'Operations',
    vi: 'Vận hành',
    items: [
      { page: 'bookings', icon: '▣', en: 'Bookings', vi: 'Đặt tour' },
      { page: 'contracts', icon: '📄', en: 'Contracts', vi: 'Hợp đồng' },
      { page: 'suppliers', icon: '◫', en: 'Suppliers', vi: 'Nhà cung cấp' },
      { page: 'guides', icon: '◑', en: 'Guides', vi: 'Hướng dẫn viên' },
      { page: 'weather', icon: '☁', en: 'Weather Guide', vi: 'Thời tiết' },
      { page: 'attractions', icon: '🏛', en: 'Attraction Schedule', vi: 'Lịch điểm tham quan', badge: 'NEW', badgeType: 'new' },
      { page: 'posttour', icon: '⭐', en: 'Post-Tour & Feedback', vi: 'Hậu tour & Phản hồi', badge: 'NEW', badgeType: 'new' },
    ],
  },
  {
    en: 'Finance',
    vi: 'Tài chính',
    items: [
      { page: 'finance', icon: '◧', en: 'Finance', vi: 'Tài chính' },
      { page: 'tax', icon: '◩', en: 'Tax', vi: 'Thuế' },
      { page: 'salary', icon: '$', en: 'Salary', vi: 'Lương thưởng' },
    ],
  },
  {
    en: 'Company Portal',
    vi: 'Cổng thông tin',
    items: [
      { page: 'about', icon: '🐜', en: 'About Us', vi: 'Về chúng tôi' },
      { page: 'culture', icon: '🌿', en: 'Culture', vi: 'Văn hóa' },
      { page: 'regulations', icon: '📋', en: 'Regulations', vi: 'Quy định' },
      { page: 'hr', icon: '👥', en: 'Human Resources', vi: 'Nhân sự' },
      { page: 'ai', icon: '⚡', en: 'AI Requirements', vi: 'Yêu cầu AI', badge: 'NEW', badgeType: 'new' },
      { page: 'devnotes', icon: '📝', en: 'Dev Notes', vi: 'Ghi chú kỹ thuật' },
      { page: 'teamchat', icon: '💬', en: 'Team Chat', vi: 'Chat nội bộ' },
    ],
  },
];

export const QUICK_NAV_PAGES: PageSlug[] = ['dashboard', 'sales', 'tourdesign', 'bookings'];

export const VALID_PAGES = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.page));

export function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export function bdg(text: string, cls: string): string {
  return `<span class="bdg ${cls}">${text}</span>`;
}
