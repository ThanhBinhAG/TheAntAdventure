import { z } from 'zod';
import type { ExtendedSupplier } from '@/lib/types';

const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9._-]+$/);

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const extendedSupplierSchema = z.object({
  id: idSchema.optional(),
  cat: z.string().trim().min(1).max(80),
  subcat: optionalText(120),
  name: z.string().trim().min(1).max(300),
  ename: optionalText(300),
  contact: optionalText(200),
  phone: optionalText(80),
  email: optionalText(200),
  location: optionalText(300),
  region: optionalText(80),
  rate: optionalText(200),
  currency: optionalText(16).default('USD'),
  payment: optionalText(200),
  contract: optionalText(40),
  cancel: optionalText(500),
  insurance: optionalText(500),
  avail: optionalText(200),
  desc: optionalText(4_000),
  notes: optionalText(4_000),
  tags: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  rating: optionalText(40),
  status: optionalText(40).default('Active'),
});

export const extendedSupplierCreateRequestSchema = z.object({
  supplier: extendedSupplierSchema,
});

export const extendedSupplierUpdateRequestSchema = z.object({
  supplier: extendedSupplierSchema.extend({ id: idSchema }),
});

export type ExtendedSupplierInput = z.infer<typeof extendedSupplierSchema>;

/** List/detail DTO for extended suppliers BFF. */
export type ExtendedSupplierListItem = ExtendedSupplier;

export function inputToExtendedSupplier(
  input: ExtendedSupplierInput,
  id: string,
): ExtendedSupplier {
  return {
    id,
    cat: input.cat,
    subcat: input.subcat,
    name: input.name,
    ename: input.ename,
    contact: input.contact,
    phone: input.phone,
    email: input.email,
    location: input.location,
    region: input.region,
    rate: input.rate,
    currency: input.currency || 'USD',
    payment: input.payment,
    contract: input.contract,
    cancel: input.cancel,
    insurance: input.insurance,
    avail: input.avail,
    desc: input.desc,
    notes: input.notes,
    tags: input.tags ?? [],
    rating: input.rating,
    status: input.status || 'Active',
  };
}
