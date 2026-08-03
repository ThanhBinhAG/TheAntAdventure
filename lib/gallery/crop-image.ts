/** Canvas helpers for react-easy-crop output. */

export type CropArea = { x: number; y: number; width: number; height: number };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', () => reject(new Error('Failed to load image for crop')));
    img.crossOrigin = 'anonymous';
    img.src = src;
  });
}

/**
 * Load a remote gallery URL as a same-origin blob URL so canvas crop is not tainted.
 */
export async function blobUrlFromRemote(src: string): Promise<string> {
  const res = await fetch(src, { mode: 'cors' });
  if (!res.ok) throw new Error('Could not fetch photo for cropping');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: CropArea,
  outputSize = 512
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  ctx.beginPath();
  ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Crop export failed'));
        else resolve(blob);
      },
      'image/webp',
      0.9
    );
  });
}
