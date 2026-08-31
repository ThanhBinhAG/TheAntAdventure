import { z } from 'zod';

export const taxPeriodQuerySchema = z.object({
  period: z.string().trim().max(64).default('all'),
});

/** Tax report list/detail DTO (browser-safe). */
export type TaxListItem = {
  id: string;
  period?: string;
  rev?: number;
  expenses?: number;
  vat_out?: number;
  vat_in?: number;
  vat_pay?: number;
  profit_bt?: number;
  corp_tax?: number;
};

export type TaxReportsResponse = {
  rows: TaxListItem[];
  ytd?: TaxListItem;
};
