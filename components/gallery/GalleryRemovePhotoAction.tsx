'use client';

import { useEffect, useState } from 'react';

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
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [resetKey]);

  if (pending) {
    return (
      <div className="gallery-remove-wrap">
        <span className="gallery-remove-prompt-text">Remove this photo from the gallery?</span>
        <button
          type="button"
          className="btn btn-s btn-sm gallery-remove-confirm-btn"
          disabled={disabled}
          onClick={() => {
            setPending(false);
            onConfirm();
          }}
        >
          Yes, remove
        </button>
        <button
          type="button"
          className="btn btn-s btn-sm"
          disabled={disabled}
          onClick={() => setPending(false)}
        >
          Cancel
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
      Remove photo
    </button>
  );
}
