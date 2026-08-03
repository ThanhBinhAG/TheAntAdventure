import 'server-only';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { getAppUrl } from '@/lib/env';
import { buildProposalHTML } from '@/lib/proposals/proposal-html';
import type { ProposalDoc } from '@/lib/proposals/proposal-types';

const LINUX_CHROME_CANDIDATES = [
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/snap/bin/chromium',
];

const WSL_SETUP_HINT =
  'On WSL/Linux, run: bash scripts/setup-pdf-deps-wsl.sh then restart the dev server. ' +
  'Or set PUPPETEER_EXECUTABLE_PATH in .env.local to a Chrome/Chromium binary. ' +
  'You can also use Print / Save PDF in the browser.';

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveExecutablePath(): Promise<string> {
  const custom = (process.env.PUPPETEER_EXECUTABLE_PATH ?? '').trim();
  if (custom) return custom;

  if (process.platform === 'linux') {
    for (const candidate of LINUX_CHROME_CANDIDATES) {
      if (await isExecutable(candidate)) return candidate;
    }
  }

  return chromium.executablePath();
}

function formatPdfLaunchError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const needsSystemLibs =
    /libnspr4|libnss3|shared libraries|Code:\s*127|Failed to launch the browser process/i.test(message);
  if (needsSystemLibs) {
    return `PDF export could not start Chromium. ${WSL_SETUP_HINT} (${message})`;
  }
  return `PDF generation failed: ${message}`;
}

export async function renderProposalPdf(doc: ProposalDoc): Promise<Buffer> {
  const origin = getAppUrl();
  const html = buildProposalHTML(doc, origin);

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 794, height: 1123 },
      executablePath: await resolveExecutablePath(),
      headless: true,
    });
  } catch (err) {
    throw new Error(formatPdfLaunchError(err));
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 60_000 });
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      await Promise.all(
        imgs.map(
          (img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  img.onload = () => resolve();
                  img.onerror = () => resolve();
                })
        )
      );
    });
    const pdf = await page.pdf({
      format: 'A4',
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `<div style="width:100%;font-size:8px;color:#6B7F74;text-align:center;padding:0 12mm;font-family:Calibri,Arial,sans-serif;">
        THE ANT ADVENTURES &nbsp;|&nbsp; Boutique Inbound Travel — Vietnam &nbsp;|&nbsp; sales@theantadventures.com &nbsp;|&nbsp; www.theantadventures.com &nbsp;|&nbsp; Page <span class="pageNumber"></span>
      </div>`,
      margin: { top: '12mm', right: '12mm', bottom: '16mm', left: '12mm' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}