import { GALLERY_MAX_CONCURRENT_SHARP_WORKERS } from '@/lib/image-pipeline/limits';
import { Semaphore } from '@/lib/system/semaphore';

/** Shared gate for all gallery Sharp work in this process. */
export const sharpWorkerGate = new Semaphore(GALLERY_MAX_CONCURRENT_SHARP_WORKERS);
