import { z } from 'zod';

const travelStyleCodeSchema = z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);

export const travelStyleSchema = z.object({
  code: travelStyleCodeSchema,
  label: z.string().trim().min(1).max(100),
  sortOrder: z.number().int().min(0).max(10_000),
  isActive: z.boolean(),
});

export const replaceTravelStylesBodySchema = z.object({
  styles: z.array(travelStyleSchema).min(1).max(100),
}).superRefine(({ styles }, ctx) => {
  const codes = new Set<string>();
  const labels = new Set<string>();
  styles.forEach((style, index) => {
    if (codes.has(style.code)) {
      ctx.addIssue({ code: 'custom', path: ['styles', index, 'code'], message: 'Mã Travel Style bị trùng.' });
    }
    if (labels.has(style.label.toLocaleLowerCase())) {
      ctx.addIssue({ code: 'custom', path: ['styles', index, 'label'], message: 'Tên Travel Style bị trùng.' });
    }
    codes.add(style.code);
    labels.add(style.label.toLocaleLowerCase());
  });
  if (!styles.some((style) => style.isActive)) {
    ctx.addIssue({ code: 'custom', path: ['styles'], message: 'Cần có ít nhất một Travel Style đang hoạt động.' });
  }
});

export const deleteTravelStyleQuerySchema = z.object({
  code: travelStyleCodeSchema,
});

export type TravelStyle = z.infer<typeof travelStyleSchema>;

export const DEFAULT_TRAVEL_STYLES: TravelStyle[] = [
  ['luxury', 'Luxury'], ['premium-cultural', 'Premium Cultural'], ['cultural', 'Cultural'],
  ['adventure', 'Adventure'], ['family', 'Family'], ['culinary', 'Culinary'],
  ['photography', 'Photography'], ['honeymoon', 'Honeymoon'],
].map(([code, label], index) => ({ code, label, sortOrder: (index + 1) * 10, isActive: true }))
  .sort((a, b) => a.label.localeCompare(b.label));
