import { AA_HOTELS } from '../seeds/hotels';
import { SEED_EXTENDED_SUPPLIERS } from '../seeds/extendedSuppliers';
import { SEED_CRUISES, SEED_RESTAURANTS, SEED_TRANSPORT } from '../seeds/suppliers';
import type { CruiseSupplier, ExtendedSupplier, Hotel, RestaurantSupplier, TransportSupplier } from '../types';

function clone<T>(rows: readonly T[]): T[] {
  return rows.map((row) => ({ ...row }));
}

export function mergeSupplierSeeds(input: {
  hotels?: Hotel[];
  transport?: TransportSupplier[];
  restaurants?: RestaurantSupplier[];
  cruises?: CruiseSupplier[];
  specialSuppliers?: ExtendedSupplier[];
}): {
  hotels: Hotel[];
  transport: TransportSupplier[];
  restaurants: RestaurantSupplier[];
  cruises: CruiseSupplier[];
  specialSuppliers: ExtendedSupplier[];
} {
  return {
    hotels: input.hotels?.length ? input.hotels : (clone(AA_HOTELS) as unknown as Hotel[]),
    transport: input.transport?.length ? input.transport : (clone(SEED_TRANSPORT) as unknown as TransportSupplier[]),
    restaurants: input.restaurants?.length ? input.restaurants : (clone(SEED_RESTAURANTS) as unknown as RestaurantSupplier[]),
    cruises: input.cruises?.length ? input.cruises : (clone(SEED_CRUISES) as unknown as CruiseSupplier[]),
    specialSuppliers: input.specialSuppliers?.length
      ? input.specialSuppliers
      : (clone(SEED_EXTENDED_SUPPLIERS) as unknown as ExtendedSupplier[]),
  };
}
