export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
};

type Listener = (toasts: ToastItem[]) => void;

const DEFAULT_DURATION = 3200;
const INFO_DURATION = 5000;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  const snapshot = toasts.slice();
  listeners.forEach((fn) => fn(snapshot));
}

function uid() {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function push(message: string, variant: ToastVariant, duration?: number) {
  const item: ToastItem = {
    id: uid(),
    message,
    variant,
    duration:
      duration ??
      (variant === 'info' ? INFO_DURATION : DEFAULT_DURATION),
  };
  toasts = [...toasts, item];
  emit();
  return item.id;
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts.slice());
  return () => {
    listeners.delete(listener);
  };
}

export const toast = {
  success(message: string, duration?: number) {
    return push(message, 'success', duration);
  },
  error(message: string, duration?: number) {
    return push(message, 'error', duration);
  },
  info(message: string, duration?: number) {
    return push(message, 'info', duration);
  },
  warning(message: string, duration?: number) {
    return push(message, 'warning', duration);
  },
};
