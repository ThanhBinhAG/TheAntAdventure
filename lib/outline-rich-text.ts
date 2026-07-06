/** Allow basic inline formatting for guest outline cells (bold, italic, underline, color). */

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'DIV', 'SPAN', 'FONT']);

function escapePlain(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hasHtmlMarkup(value: string): boolean {
  return /<[a-z][\s\S]*?>/i.test(value);
}

function sanitizeStyle(style: string): string {
  const colorMatch = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
  if (!colorMatch) return '';
  const color = colorMatch[1].trim();
  if (/^#[0-9a-f]{3,8}$/i.test(color)) return `color:${color}`;
  if (/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i.test(color)) return `color:${color}`;
  const named = ['black', 'red', 'blue', 'green', 'navy', 'maroon', 'purple', 'orange', 'gray', 'grey'];
  if (named.includes(color.toLowerCase())) return `color:${color}`;
  return '';
}

function sanitizeAllowedTagsFallback(raw: string): string {
  let s = raw.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '');
  s = s.replace(/<(?!\/?(?:b|strong|i|em|u|br|p|div|span|font)\b)[^>]*>/gi, '');
  s = s.replace(/<(span|font)(\s[^>]*)?>/gi, (match, tag, attrs = '') => {
    const styleMatch = attrs.match(/style\s*=\s*"([^"]*)"/i);
    const colorMatch = attrs.match(/color\s*=\s*"([^"]*)"/i);
    const style = styleMatch ? sanitizeStyle(styleMatch[1]) : '';
    const colorAttr = colorMatch && /^#[0-9a-f]{3,8}$/i.test(colorMatch[1].trim()) ? colorMatch[1].trim() : '';
    if (style) return `<span style="${style}">`;
    if (colorAttr) return `<span style="color:${colorAttr}">`;
    return `<${tag.toLowerCase()}>`;
  });
  return s.trim();
}

/** Strip unsafe HTML; keep bold/italic/underline/color only. */
export function sanitizeOutlineHtml(raw: string): string {
  if (!raw?.trim()) return '';
  if (!hasHtmlMarkup(raw)) {
    return escapePlain(raw.trim()).replace(/\n/g, '<br>');
  }

  if (typeof DOMParser === 'undefined') {
    return sanitizeAllowedTagsFallback(raw);
  }

  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapePlain(node.textContent || '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();
    if (!ALLOWED_TAGS.has(tag)) {
      return Array.from(el.childNodes).map(walk).join('');
    }

    if (tag === 'BR') return '<br>';

    let attrs = '';
    if (tag === 'SPAN' || tag === 'FONT') {
      const style = sanitizeStyle(el.getAttribute('style') || '');
      const colorAttr = el.getAttribute('color');
      if (style) attrs = ` style="${style}"`;
      else if (colorAttr && /^#[0-9a-f]{3,8}$/i.test(colorAttr.trim())) {
        attrs = ` style="color:${colorAttr.trim()}"`;
      }
    }

    const inner = Array.from(el.childNodes).map(walk).join('');
    const lower = tag.toLowerCase();
    if (lower === 'p' || lower === 'div') {
      return `<${lower}${attrs}>${inner}</${lower}>`;
    }
    return `<${lower}${attrs}>${inner}</${lower}>`;
  };

  return Array.from(doc.body.childNodes).map(walk).join('').trim();
}

export function outlineCellHtml(value?: string): string {
  if (!value?.trim()) return '';
  return sanitizeOutlineHtml(value);
}

export const OUTLINE_TEXT_COLORS = [
  { label: 'Black', value: '#000000' },
  { label: 'Red', value: '#C00000' },
  { label: 'Blue', value: '#0563C1' },
  { label: 'Green', value: '#2E7D52' },
  { label: 'Orange', value: '#E67E22' },
  { label: 'Purple', value: '#7030A0' },
] as const;
