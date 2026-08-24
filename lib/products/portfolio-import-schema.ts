import { z } from 'zod';

const importText = z.string().trim();

/** Contract for the reviewed Excel row submitted by PortfolioImportModal. */
export const portfolioDraftSchema = z.object({
  code: importText.min(1, 'Product code is required'),
  name: importText.min(1, 'Product name is required'),
  desc: importText,
  notesToSales: importText,
  dur: importText,
  cat: importText,
  dest: importText,
  region: z.enum(['north', 'central', 'south', 'services']),
  lvl: importText,
  needsReview: z.boolean(),
  reviewReasons: z.array(importText.min(1)).max(50),
}).strict();

export const portfolioImportBodySchema = z.object({
  drafts: z.array(portfolioDraftSchema).min(1).max(2_000).superRefine((drafts, ctx) => {
    const codes = new Map<string, number>();
    drafts.forEach((draft, index) => {
      const normalizedCode = draft.code.toUpperCase();
      const previousIndex = codes.get(normalizedCode);
      if (previousIndex !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'code'],
          message: `Product code duplicates row ${previousIndex + 1}`,
        });
        return;
      }
      codes.set(normalizedCode, index);
    });
  }),
}).strict();

export type PortfolioImportDraft = z.infer<typeof portfolioDraftSchema>;
