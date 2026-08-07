/**
 * Cổng server-only cho metadata lịch sử đăng nhập.
 *
 * Route đăng nhập chỉ import từ đây để không vô tình dùng metadata request
 * trong Client Component; logic thuần nằm riêng để có unit test ổn định.
 */
import 'server-only';

export {
    getLoginClientMetadata,
    type LoginClientMetadata,
    type LoginDeviceType,
} from './login-history-metadata';
