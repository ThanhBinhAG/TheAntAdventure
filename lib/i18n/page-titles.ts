import { NAV_SECTIONS, PAGE_TITLES } from '@/lib/constants';
import type { PageSlug } from '@/lib/types';
import type { AppLanguage } from './stages';

const TITLE_BY_SLUG: Partial<Record<PageSlug, { en: string; vi: string }>> = {};

for (const section of NAV_SECTIONS) {
  for (const item of section.items) {
    TITLE_BY_SLUG[item.page] = { en: item.en, vi: item.vi };
    for (const child of item.children ?? []) {
      TITLE_BY_SLUG[child.page] = { en: child.en, vi: child.vi };
    }
  }
}

// Slugs not in sidebar nav (pricing sub-routes, portal, tools).
const EXTRA_TITLES: Partial<Record<PageSlug, { en: string; vi: string }>> = {
  pricing: { en: 'Tour Price List', vi: 'Bảng giá tour' },
  'pricing-essentials': { en: 'Essentials — Saigon & Mekong', vi: 'Essentials — Sài Gòn & Mekong' },
  'pricing-accommodation': { en: 'Accommodation & Cruises', vi: 'Lưu trú & Du thuyền' },
  tourdesign: { en: 'Tour Design Studio ✦', vi: 'Thiết kế tour ✦' },
  attractions: { en: 'Attraction Schedule 🏛', vi: 'Lịch điểm tham quan 🏛' },
  posttour: { en: 'Post-Tour & Feedback ⭐', vi: 'Hậu tour & Phản hồi ⭐' },
  ai: { en: 'AI Requirements ⚡', vi: 'Yêu cầu AI ⚡' },
  devnotes: { en: 'Dev Notes 📝', vi: 'Ghi chú kỹ thuật 📝' },
  teamchat: { en: 'Team Chat 💬', vi: 'Chat nội bộ 💬' },
  'access-control': { en: 'Access Control', vi: 'Kiểm soát truy cập' },
  settings: { en: 'Settings', vi: 'Cài đặt' },
  about: { en: 'About Us', vi: 'Về chúng tôi' },
  culture: { en: 'Culture', vi: 'Văn hóa' },
  regulations: { en: 'Regulations', vi: 'Quy định' },
};

for (const [slug, labels] of Object.entries(EXTRA_TITLES) as [PageSlug, { en: string; vi: string }][]) {
  if (!TITLE_BY_SLUG[slug]) TITLE_BY_SLUG[slug] = labels;
}

/** Page title for Topbar — prefers NAV_SECTIONS labels, falls back to PAGE_TITLES. */
export function pageTitleForSlug(slug: PageSlug, language: AppLanguage): string {
  const fromNav = TITLE_BY_SLUG[slug];
  if (fromNav) return language === 'vi' ? fromNav.vi : fromNav.en;
  const fallback = PAGE_TITLES[slug];
  return fallback ?? slug;
}
