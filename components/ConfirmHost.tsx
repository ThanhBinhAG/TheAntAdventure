'use client';

import { useEffect, useRef, useState } from 'react';
import {
  resolveConfirm,
  subscribeConfirm,
  type ConfirmRequest,
} from '@/lib/confirm';

export default function ConfirmHost() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => subscribeConfirm(setReq), []);

  useEffect(() => {
    if (!req) return;
    confirmBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        resolveConfirm(req.id, false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [req]);

  if (!req) return null;

  return (
    <div
      className="confirm-overlay open"
      role="presentation"
      onClick={() => resolveConfirm(req.id, false)}
    >
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-msg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-hd">
          <strong id="confirm-title">{req.title}</strong>
        </div>
        <p id="confirm-msg" className="confirm-msg">
          {req.message}
        </p>
        <div className="confirm-actions">
          <button
            type="button"
            className="btn btn-s"
            onClick={() => resolveConfirm(req.id, false)}
          >
            {req.cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={`btn ${req.danger ? 'btn-danger' : 'btn-p'}`}
            onClick={() => resolveConfirm(req.id, true)}
          >
            {req.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
