import { taaTourToProductPricing } from '../product-pricing-helpers';
import { TAA_TOURS } from './taa-tours';

/** Initial pricing rows seeded from legacy TAA_TOURS catalogue */
export const SEED_PRODUCT_PRICING = TAA_TOURS.map(taaTourToProductPricing);
