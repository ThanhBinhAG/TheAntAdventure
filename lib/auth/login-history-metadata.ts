/**
 * Phân tích metadata request cho lịch sử đăng nhập.
 *
 * Module này không ghi database và không đọc secret nên giữ thuần để test
 * được các quy tắc tin cậy IP độc lập với Route Handler.
 */
import { isIP } from 'node:net';

const MAX_USER_AGENT_LENGTH = 512;

export type LoginDeviceType =
    | 'desktop'
    | 'mobile'
    | 'tablet'
    | 'unknown';

export type LoginClientMetadata = {
    ipAddress: string | null;
    userAgent: string | null;
    browserName: string;
    operatingSystem: string;
    deviceType: LoginDeviceType;
};

/** Chỉ tin các header IP khi reverse proxy đã kiểm soát và ghi đè chúng. */
function canTrustProxyHeaders(): boolean {
    return process.env.TRUST_PROXY_HEADERS === 'true';
}

/** Lấy một IP hợp lệ, hỗ trợ IPv4 và IPv6. */
function normalizeIp(value: string | null): string | null {
    if (!value) return null;

    const ip = value.trim().replace(/^\[|\]$/g, '');

    return isIP(ip) === 0 ? null : ip;
}

/**
 * Lấy IP nguồn từ proxy đáng tin cậy.
 *
 * Khi TRUST_PROXY_HEADERS chưa bật, trả null để tránh lưu một IP giả do
 * browser tự gắn vào X-Forwarded-For.
 */
function getTrustedClientIp(request: Request): string | null {
    if (!canTrustProxyHeaders()) return null;

    const cloudflareIp = normalizeIp(
        request.headers.get('cf-connecting-ip'),
    );
    if (cloudflareIp) return cloudflareIp;

    const realIp = normalizeIp(request.headers.get('x-real-ip'));
    if (realIp) return realIp;

    const forwarded = request.headers.get('x-forwarded-for');
    const firstForwardedIp = forwarded?.split(',')[0] ?? null;

    return normalizeIp(firstForwardedIp);
}

/** Cắt và làm sạch User-Agent trước khi lưu database. */
function getSafeUserAgent(request: Request): string | null {
    const value = request.headers
        .get('user-agent')
        ?.replace(/[\u0000-\u001F\u007F]/g, ' ')
        .trim()
        .slice(0, MAX_USER_AGENT_LENGTH);

    return value || null;
}

/** User-Agent không đáng tin tuyệt đối; đây chỉ là nhãn hiển thị. */
function detectDevice(userAgent: string | null): Omit<
    LoginClientMetadata,
    'ipAddress' | 'userAgent'
> {
    const value = userAgent?.toLowerCase() ?? '';

    const browserName =
        /edg\/|edga\/|edgios/.test(value)
            ? 'Microsoft Edge'
            : /firefox\/|fxios\//.test(value)
                ? 'Firefox'
                : /chrome\/|crios\//.test(value)
                    ? 'Google Chrome'
                    : /safari\//.test(value) &&
                        !/chrome\/|crios\/|android/.test(value)
                        ? 'Safari'
                        : 'Không xác định';

    const operatingSystem =
        /iphone|ipad|ipod/.test(value)
            ? 'iOS'
            : /android/.test(value)
                ? 'Android'
                : /windows/.test(value)
                    ? 'Windows'
                    : /mac os x|macintosh/.test(value)
                        ? 'macOS'
                        : /linux/.test(value)
                            ? 'Linux'
                            : 'Không xác định';

    const deviceType: LoginDeviceType =
        /ipad|tablet/.test(value)
            ? 'tablet'
            : /mobi|iphone|ipod|android/.test(value)
                ? 'mobile'
                : /windows|macintosh|linux/.test(value)
                    ? 'desktop'
                    : 'unknown';

    return {
        browserName,
        operatingSystem,
        deviceType,
    };
}

/** Gom toàn bộ metadata cần ghi cho một lần đăng nhập thành công. */
export function getLoginClientMetadata(
    request: Request,
): LoginClientMetadata {
    const userAgent = getSafeUserAgent(request);

    return {
        ipAddress: getTrustedClientIp(request),
        userAgent,
        ...detectDevice(userAgent),
    };
}
