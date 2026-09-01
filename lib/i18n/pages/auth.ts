import type { AppLanguage } from '../stages';

export const AUTH = {
  en: {
    "loading": "Loading…",
    "brandTitle": "The Ant Adventures",
    "brandSubtitle": "CRM — Login",
    "labelEmail": "Email",
    "labelPassword": "Password",
    "placeholderEmail": "email@example.com",
    "captchaRequired": "Please complete the CAPTCHA.",
    "submitLogin": "Login",
    "submitLoggingIn": "Logging in…",
    "hintNoRegistration": "Account is assigned by administrator. No public registration.",
    "hintAdminDebug": "Admin:",
    "linkSystemDiagnostics": "System diagnostics",
    "errorLoginFailed": "Login failed.",
    "errorInvalidCredentials": "Invalid email or password.",
    "errorEmailNotConfirmed": "Email not confirmed. Check your inbox or contact administrator.",
    "errorCaptchaFailed": "CAPTCHA verification failed. Please try again.",
    "errorNetwork": "Could not reach authentication server — SSL, network, or firewall issue. Contact administrator.",
  },
  vi: {
    "loading": "Đang tải…",
    "brandTitle": "The Ant Adventures",
    "brandSubtitle": "CRM — Đăng nhập",
    "labelEmail": "Email",
    "labelPassword": "Mật khẩu",
    "placeholderEmail": "email@example.com",
    "captchaRequired": "Vui lòng hoàn thành CAPTCHA.",
    "submitLogin": "Đăng nhập",
    "submitLoggingIn": "Đang đăng nhập…",
    "hintNoRegistration": "Tài khoản do quản trị viên cấp. Không đăng ký công khai.",
    "hintAdminDebug": "Quản trị:",
    "linkSystemDiagnostics": "Chẩn đoán hệ thống",
    "errorLoginFailed": "Đăng nhập thất bại. Vui lòng thử lại.",
    "errorInvalidCredentials": "Tài khoản hoặc mật khẩu không đúng.",
    "errorEmailNotConfirmed": "Email chưa được xác nhận. Kiểm tra hộp thư hoặc liên hệ quản trị viên.",
    "errorCaptchaFailed": "Xác minh CAPTCHA thất bại. Vui lòng thử lại.",
    "errorNetwork": "Không kết nối được máy chủ xác thực — có thể do SSL, mạng, hoặc firewall. Liên hệ quản trị viên.",
  },
} as const;

export type AUTHKey = keyof typeof AUTH.en;

export function tauth(key: AUTHKey, language: AppLanguage): string {
  return AUTH[language][key] ?? AUTH.en[key];
}
