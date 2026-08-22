import { bffRoute } from '@/lib/bff/route';
import { getAllGalleryPhotosServer } from '@/lib/gallery/photo-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  { requiredPermission: 'gallery.read' },
  async () => getAllGalleryPhotosServer()
);
