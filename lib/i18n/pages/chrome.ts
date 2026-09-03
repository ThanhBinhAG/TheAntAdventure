import type { AppLanguage } from '../stages';

export const CHROME = {
  en: {
    "menuTitle": "Menu",
    "menuAriaOpen": "Open navigation menu",
    "welcome": "Welcome",
    "langSwitchTitle": "Switch language / Đổi ngôn ngữ",
    "backup": "⬇ Backup",
    "backupTitle": "Download JSON backup · Last backup: {status}",
    "restore": "⬆ Restore",
    "restoreTitle": "Restore from backup",
    "logout": "⎋ Logout",
    "logoutTitle": "Log out",
    "toolsExpand": "Open system tools · Last backup: {status}",
    "toolsCollapse": "Collapse system tools",
    "toastInvalidBackup": "Invalid backup file",
    "lastBackupNever": "never",
    "aiTitle": "AI Co-Pilot",
    "aiSubtitle": "Tour design assistant",
    "aiTriggerTitle": "AI Co-Pilot — tour design assistant",
    "aiPlaceholder": "Ask about itineraries, pricing, clients…",
    "aiSend": "Send",
    "aiSystemReady": "AI Co-Pilot ready. Connect your Anthropic API key in ⚡ AI Requirements to enable live responses.",
    "aiDemoReply": "Demo mode — configure API key in AI Requirements page.",
  },
  vi: {
    "menuTitle": "Menu",
    "menuAriaOpen": "Mở menu điều hướng",
    "welcome": "Chào mừng",
    "langSwitchTitle": "Đổi ngôn ngữ / Switch language",
    "backup": "⬇ Sao lưu",
    "backupTitle": "Tải backup JSON · Lần sao lưu cuối: {status}",
    "restore": "⬆ Khôi phục",
    "restoreTitle": "Khôi phục từ backup",
    "logout": "⎋ Đăng xuất",
    "logoutTitle": "Đăng xuất",
    "toolsExpand": "Mở công cụ hệ thống · Lần sao lưu cuối: {status}",
    "toolsCollapse": "Thu gọn công cụ hệ thống",
    "toastInvalidBackup": "File backup không hợp lệ",
    "lastBackupNever": "chưa bao giờ",
    "aiTitle": "AI Co-Pilot",
    "aiSubtitle": "Trợ lý thiết kế tour",
    "aiTriggerTitle": "AI Co-Pilot — trợ lý thiết kế tour",
    "aiPlaceholder": "Hỏi về lịch trình, giá, khách hàng…",
    "aiSend": "Gửi",
    "aiSystemReady": "AI Co-Pilot sẵn sàng. Kết nối Anthropic API key trong ⚡ AI Requirements để bật phản hồi thật.",
    "aiDemoReply": "Chế độ demo — cấu hình API key trong trang AI Requirements.",
  },
} as const;

export type CHROMEKey = keyof typeof CHROME.en;

export function tch(key: CHROMEKey, language: AppLanguage): string {
  return CHROME[language][key] ?? CHROME.en[key];
}
