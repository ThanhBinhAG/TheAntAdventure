'use client';

import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';

type Props = {
  onConfirm: () => void;
  disabled?: boolean;
  buttonClassName?: string;
  resetKey?: string;
};

export default function GalleryRemovePhotoAction({
  onConfirm,
  disabled = false,
  buttonClassName = 'gallery-viewer-del',
  resetKey,
}: Props) {
  return <GalleryRemovePhotoActionBody key={resetKey} onConfirm={onConfirm} disabled={disabled} buttonClassName={buttonClassName} />;
}

function GalleryRemovePhotoActionBody({
  onConfirm,
  disabled = false,
  buttonClassName = 'gallery-viewer-del',
}: Omit<Props, 'resetKey'>) {
  const { tp, tc } = useLanguage();
  const [pending, setPending] = useState(false);

  if (pending) {
    return (
      <div className="gallery-remove-wrap">
        <span className="gallery-remove-prompt-text">{tp('gallery', 'removePhotoConfirm')}</span>
        <button
          type="button"
          className="btn btn-s btn-sm gallery-remove-confirm-btn"
          disabled={disabled}
          onClick={() => {
            setPending(false);
            onConfirm();
          }}
        >
          {tp('gallery', 'yesRemove')}
        </button>
        <button
          type="button"
          className="btn btn-s btn-sm"
          disabled={disabled}
          onClick={() => setPending(false)}
        >
          {tc('cancel')}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`btn btn-s btn-sm ${buttonClassName}`}
      disabled={disabled}
      onClick={() => setPending(true)}
    >
      {tp('gallery', 'removePhoto')}
    </button>
  );
}
