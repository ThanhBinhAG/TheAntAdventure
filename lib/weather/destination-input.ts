import { z } from 'zod';

export const weatherRegionSchema = z.enum(['north', 'central', 'south']);

export const destinationCreateBodySchema = z.object({
  id: z.string().trim().min(1).max(64).optional(),
  name: z.string().trim().min(1, 'Name is required.').max(120),
  region: weatherRegionSchema,
  emoji: z.string().trim().max(16).nullable().optional(),
  latitude: z.coerce.number().gte(-90).lte(90),
  longitude: z.coerce.number().gte(-180).lte(180),
  elevationM: z.coerce.number().nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  coverPhotoId: z.string().trim().min(1).max(64).nullable().optional(),
  isFeatured: z.boolean().optional(),
});

export type DestinationCreateBody = z.infer<typeof destinationCreateBodySchema>;

export const destinationPatchBodySchema = destinationCreateBodySchema.partial();

export type DestinationPatchBody = z.infer<typeof destinationPatchBodySchema>;

export const destinationRefreshBodySchema = z.object({
  id: z.string().trim().min(1, 'id is required.').max(64),
  force: z.boolean().optional(),
});

export type DestinationRefreshBody = z.infer<typeof destinationRefreshBodySchema>;

export const featuredIdsBodySchema = z.object({
  ids: z.array(z.string().trim().min(1).max(64)).min(1).max(2),
});

export type FeaturedIdsBody = z.infer<typeof featuredIdsBodySchema>;

export const weatherRefreshBodySchema = z.object({
  force: z.boolean().optional(),
});

export type WeatherRefreshBody = z.infer<typeof weatherRefreshBodySchema>;
