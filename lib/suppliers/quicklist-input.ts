import { z } from 'zod';
import type {
  CruiseSupplier,
  RestaurantSupplier,
  TransportSupplier,
} from '@/lib/types';

const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9._-]+$/);

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const transportSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(1).max(300),
  region: optionalText(80),
  vehicles: optionalText(500),
  rate: optionalText(120),
  notes: optionalText(2_000),
  supplierId: optionalText(64),
});

export const restaurantSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(1).max(300),
  city: optionalText(120),
  cuisine: optionalText(120),
  set: optionalText(200),
  cap: z.number().int().min(0).max(100_000).optional(),
  rating: optionalText(40),
  notes: optionalText(2_000),
  supplierId: optionalText(64),
});

export const cruiseSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(1).max(300),
  route: optionalText(300),
  cabins: optionalText(300),
  rate: optionalText(120),
  valid: optionalText(80),
  rating: optionalText(40),
  notes: optionalText(2_000),
  supplierId: optionalText(64),
});

export const transportCreateRequestSchema = z.object({ transport: transportSchema });
export const transportUpdateRequestSchema = z.object({
  transport: transportSchema.extend({ id: idSchema }),
});

export const restaurantCreateRequestSchema = z.object({
  restaurant: restaurantSchema,
});
export const restaurantUpdateRequestSchema = z.object({
  restaurant: restaurantSchema.extend({ id: idSchema }),
});

export const cruiseCreateRequestSchema = z.object({ cruise: cruiseSchema });
export const cruiseUpdateRequestSchema = z.object({
  cruise: cruiseSchema.extend({ id: idSchema }),
});

export type TransportInput = z.infer<typeof transportSchema>;
export type RestaurantInput = z.infer<typeof restaurantSchema>;
export type CruiseInput = z.infer<typeof cruiseSchema>;

export type TransportListItem = TransportSupplier;
export type RestaurantListItem = RestaurantSupplier;
export type CruiseListItem = CruiseSupplier;

export function inputToTransport(input: TransportInput, id: string): TransportSupplier {
  return {
    id,
    name: input.name,
    region: input.region,
    vehicles: input.vehicles,
    rate: input.rate,
    notes: input.notes,
    supplierId: input.supplierId,
  };
}

export function inputToRestaurant(
  input: RestaurantInput,
  id: string,
): RestaurantSupplier {
  return {
    id,
    name: input.name,
    city: input.city,
    cuisine: input.cuisine,
    set: input.set,
    cap: input.cap,
    rating: input.rating,
    notes: input.notes,
    supplierId: input.supplierId,
  };
}

export function inputToCruise(input: CruiseInput, id: string): CruiseSupplier {
  return {
    id,
    name: input.name,
    route: input.route,
    cabins: input.cabins,
    rate: input.rate,
    valid: input.valid,
    rating: input.rating,
    notes: input.notes,
    supplierId: input.supplierId,
  };
}
