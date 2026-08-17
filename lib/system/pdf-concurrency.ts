import 'server-only';
import { Semaphore } from '@/lib/system/semaphore';

/**
 * At most one Chromium PDF export at a time so proposal/pricing PDF
 * does not stack browsers against Docker mem_limit.
 */
export const pdfBrowserGate = new Semaphore(1);
