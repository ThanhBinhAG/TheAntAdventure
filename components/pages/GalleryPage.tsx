import { Suspense } from 'react';
import Gallery from './Gallery';

export default function GalleryPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: 'var(--m)' }}>Loading gallery…</div>}>
      <Gallery />
    </Suspense>
  );
}
