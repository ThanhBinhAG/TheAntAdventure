export type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red primary button for destructive actions (default true). */
  danger?: boolean;
};

export type ConfirmRequest = {
  id: string;
  message: string;
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
};

type Listener = (req: ConfirmRequest | null) => void;

let current: ConfirmRequest | null = null;
const listeners = new Set<Listener>();
let queue: Array<() => void> = [];

function emit() {
  listeners.forEach((fn) => fn(current));
}

function uid() {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function flushQueue() {
  if (current || queue.length === 0) return;
  const next = queue.shift();
  next?.();
}

export function subscribeConfirm(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

export function resolveConfirm(id: string, ok: boolean) {
  if (!current || current.id !== id) return;
  const { resolve } = current;
  current = null;
  emit();
  resolve(ok);
  flushQueue();
}

/**
 * In-app confirm dialog (replaces window.confirm).
 * Resolves true if the user confirms, false if cancelled.
 */
export function confirmDialog(
  message: string,
  options: ConfirmOptions = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    const run = () => {
      current = {
        id: uid(),
        message,
        title: options.title ?? 'Confirm',
        confirmLabel: options.confirmLabel ?? 'Delete',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        danger: options.danger !== false,
        resolve,
      };
      emit();
    };
    if (current) queue.push(run);
    else run();
  });
}
