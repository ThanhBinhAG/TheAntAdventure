'use client';

import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import type { PhotoFolder } from '@/lib/gallery/photo-folders';
import { blobUrlFromRemote, getCroppedImageBlob } from '@/lib/gallery/crop-image';
import { photoDisplayUrl } from '@/lib/gallery/gallery-helpers';
import { useStore } from '@/hooks/useStore';
import CompanyLogoGalleryPicker from '@/components/sidebar/CompanyLogoGalleryPicker';
import {
  clearCompanyLogoClient,
  saveCompanyLogoClient,
} from '@/lib/storage/company-logo-client';
import { toast } from '@/lib/toast';

type Step = 'pick' | 'crop';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (logoUrl: string | null) => void;
};

export default function CompanyLogoEditor({ open, onClose, onSaved }: Props) {
  const photos = useStore((s) => s.photos) as GalleryPhoto[];
  const photoFolders = useStore((s) => s.photoFolders) as PhotoFolder[];
  const [step, setStep] = useState<Step>('pick');
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setCropSrc(null);
    setStep('pick');
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setBusy(false);
  }, [blobUrl]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePick = async (photo: GalleryPhoto) => {
    const url = photoDisplayUrl(photo) || photo.url;
    if (!url) {
      toast.error('Photo has no URL');
      return;
    }
    setBusy(true);
    try {
      const local = await blobUrlFromRemote(url);
      setBlobUrl(local);
      setCropSrc(local);
      setStep('crop');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load photo');
    } finally {
      setBusy(false);
    }
  };

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleSave = async () => {
    if (!cropSrc || !croppedAreaPixels) return;
    setBusy(true);
    try {
      const blob = await getCroppedImageBlob(cropSrc, croppedAreaPixels, 512);
      const file = new File([blob], 'logo.webp', { type: 'image/webp' });
      const logoUrl = await saveCompanyLogoClient(file);
      toast.success('Company logo updated');
      onSaved(logoUrl);
      handleClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
      setBusy(false);
    }
  };

  const handleResetDefault = async () => {
    setBusy(true);
    try {
      await clearCompanyLogoClient();
      toast.success('Restored default logo');
      onSaved(null);
      handleClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reset failed');
      setBusy(false);
    }
  };

  if (!open) return null;

  if (step === 'pick') {
    return (
      <CompanyLogoGalleryPicker
        open
        photos={photos}
        folders={photoFolders}
        onClose={handleClose}
        onPick={(p) => {
          void handlePick(p);
        }}
      />
    );
  }

  return (
    <div className="overlay open" onClick={handleClose}>
      <div className="modal logo-crop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green">
          <div>
            <div className="phlib-modal-title">Adjust logo</div>
            <div className="phlib-modal-sub">Drag to center · scroll or slider to zoom</div>
          </div>
          <button type="button" className="modal-close-btn" onClick={handleClose} disabled={busy}>
            ✕
          </button>
        </div>
        <div className="logo-crop-stage">
          {cropSrc && (
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>
        <div className="logo-crop-controls">
          <label className="logo-crop-zoom">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              disabled={busy}
            />
          </label>
        </div>
        <div className="phlib-modal-ft logo-crop-ft">
          <button type="button" className="btn btn-o btn-sm" onClick={handleResetDefault} disabled={busy}>
            Use default logo
          </button>
          <div className="phlib-modal-ft-right">
            <button
              type="button"
              className="btn btn-o"
              onClick={() => {
                if (blobUrl) URL.revokeObjectURL(blobUrl);
                setBlobUrl(null);
                setCropSrc(null);
                setStep('pick');
              }}
              disabled={busy}
            >
              Back
            </button>
            <button type="button" className="btn btn-g" onClick={() => void handleSave()} disabled={busy || !croppedAreaPixels}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
