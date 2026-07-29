/** Print via a hidden iframe so the main page stays interactive (no popup tab). */

const PRINT_DELAY_MS = 150;
const CLEANUP_FALLBACK_MS = 120_000;

export function waitForImages(doc: Document): Promise<void> {
  const images = Array.from(doc.images);
  if (!images.length) return Promise.resolve();
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          }
        })
    )
  ).then(() => undefined);
}

function schedulePrint(w: Window, onAfterPrint?: () => void): void {
  const triggerPrint = () => {
    const done = () => {
      try {
        onAfterPrint?.();
      } catch {
        /* ignore */
      }
    };
    w.addEventListener('afterprint', done, { once: true });
    w.print();
  };

  const run = () => {
    void waitForImages(w.document).then(() => {
      setTimeout(triggerPrint, PRINT_DELAY_MS);
    });
  };

  if (w.document.readyState === 'complete') {
    run();
  } else {
    w.addEventListener('load', run, { once: true });
  }
}

/**
 * Strip browser print chrome (date / document title / page URL) as much as possible:
 * - empty &lt;title&gt; so the header has no document name
 * - blob: URL iframe so the footer is not the app route (tourdesign?…)
 */
function preparePrintHtml(html: string): string {
  return html
    .replace(/<title>[^<]*<\/title>/i, '<title></title>')
    .replace(
      /@page\s*\{[^}]*\}/i,
      '@page { size: A4; margin: 12mm 10mm 14mm; }'
    );
}

/** Render HTML in a hidden iframe, open the print dialog, then remove the iframe. */
export function openPrintWindow(html: string, title = ''): void {
  // Retain the title argument for callers while deliberately stripping print chrome.
  void title;
  const prepared = preparePrintHtml(html);
  const blob = new Blob([prepared], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.title = 'Print';
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:none;visibility:hidden';
  document.body.appendChild(iframe);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    URL.revokeObjectURL(blobUrl);
    iframe.remove();
  };

  const fallbackTimer = window.setTimeout(cleanup, CLEANUP_FALLBACK_MS);
  const cleanupOnce = () => {
    window.clearTimeout(fallbackTimer);
    cleanup();
  };

  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) {
      cleanupOnce();
      return;
    }
    try {
      win.document.title = '';
    } catch {
      /* cross-origin blob should still be same-origin */
    }
    schedulePrint(win, cleanupOnce);
  };

  iframe.src = blobUrl;
}
