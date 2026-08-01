'use client';

import { useEffect, useState } from 'react';
import {
  dismissToast,
  subscribeToasts,
  type ToastItem,
} from '@/lib/toast';

function ToastCard({ item }: { item: ToastItem }) {
  const [out, setOut] = useState(false);

  useEffect(() => {
    const leaveAt = window.setTimeout(() => setOut(true), item.duration);
    const removeAt = window.setTimeout(
      () => dismissToast(item.id),
      item.duration + 220,
    );
    return () => {
      window.clearTimeout(leaveAt);
      window.clearTimeout(removeAt);
    };
  }, [item.id, item.duration]);

  return (
    <div
      className={`toast toast-${item.variant}${out ? ' toast-out' : ''}`}
      role={item.variant === 'error' ? 'alert' : 'status'}
    >
      <span className="toast-msg">{item.message}</span>
      <button
        type="button"
        className="toast-close"
        aria-label="Dismiss"
        onClick={() => {
          setOut(true);
          window.setTimeout(() => dismissToast(item.id), 220);
        }}
      >
        ×
      </button>
    </div>
  );
}

export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div className="toast-host" aria-live="polite" aria-relevant="additions">
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}
