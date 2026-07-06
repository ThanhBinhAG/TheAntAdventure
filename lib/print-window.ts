/** Defer print until document + images are ready; auto-close after print. */

const PRINT_DELAY_MS = 150;

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

function schedulePrint(w: Window): void {
  const triggerPrint = () => {
    const closeAfterPrint = () => {
      try {
        w.close();
      } catch {
        /* ignore */
      }
    };
    w.addEventListener('afterprint', closeAfterPrint, { once: true });
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

/** Open a blank window, write full HTML, print when ready, then close. */
export function openPrintWindow(html: string, title = ''): void {
  const w = window.open('', '_blank', 'noopener');
  if (!w) return;

  w.document.open();
  w.document.write(html);
  w.document.close();
  if (title) w.document.title = title;

  schedulePrint(w);
}
