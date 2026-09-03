export type ConfirmChoice = 'cancel' | 'confirm' | 'tertiary';

export type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Optional third action (e.g. discard while save-draft is confirm). */
  tertiaryLabel?: string;
  /** Red style for the confirm (primary) button — default true for destructive confirms. */
  danger?: boolean;
  /** Red style for the tertiary button (e.g. discard). */
  tertiaryDanger?: boolean;
};

export type ConfirmRequest = {
  id: string;
  message: string;
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  tertiaryLabel?: string;
  danger: boolean;
  tertiaryDanger: boolean;
  resolve: (choice: ConfirmChoice) => void;
};

type Listener = (req: ConfirmRequest | null) => void;

let current: ConfirmRequest | null = null;
const listeners = new Set<Listener>();
const queue: Array<() => void> = [];

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

export function resolveConfirm(id: string, choice: ConfirmChoice) {
  if (!current || current.id !== id) return;
  const { resolve } = current;
  current = null;
  emit();
  resolve(choice);
  flushQueue();
}

/**
 * In-app confirm with optional tertiary action.
 * Escape / overlay → cancel.
 */
export function confirmChoice(
  message: string,
  options: ConfirmOptions = {},
): Promise<ConfirmChoice> {
  return new Promise((resolve) => {
    const run = () => {
      current = {
        id: uid(),
        message,
        title: options.title ?? 'Confirm',
        confirmLabel: options.confirmLabel ?? 'Delete',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        tertiaryLabel: options.tertiaryLabel,
        danger: options.danger !== false,
        tertiaryDanger: options.tertiaryDanger === true,
        resolve,
      };
      emit();
    };
    if (current) queue.push(run);
    else run();
  });
}

/**
 * In-app confirm dialog (replaces window.confirm).
 * Resolves true if the user confirms, false if cancelled.
 */
export function confirmDialog(
  message: string,
  options: ConfirmOptions = {},
): Promise<boolean> {
  return confirmChoice(message, options).then((choice) => choice === 'confirm');
}
