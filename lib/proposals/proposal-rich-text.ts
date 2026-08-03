import { sanitizeOutlineHtml } from '../outline/outline-rich-text';

/** Sanitize rich text for proposal narrative fields (bold, italic, lists, color). */
export function proposalRichHtml(value?: string): string {
  if (!value?.trim()) return '';
  return sanitizeOutlineHtml(value);
}
