import { bffRoute } from '@/lib/bff/route';
import { getAllGalleryPhotosServer } from '@/lib/gallery/photo-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  { logging: { scope: 'gallery/photos', route: '/api/photos/all' }, requiredPermission: 'gallery.read' },
  async ({ supabase }) => getAllGalleryPhotosServer(supabase)
);
