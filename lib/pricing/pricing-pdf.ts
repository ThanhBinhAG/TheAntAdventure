import 'server-only';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { getAppUrl } from '@/lib/env';
import { buildPricingHTML, type PricingHtmlMeta } from '@/lib/pricing-html';
import type { PricingTableRow } from '@/lib/product-pricing-helpers';

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

export interface PricingPdfInput {
  rows: PricingTableRow[];
  meta: PricingHtmlMeta;
}

export async function renderPricingPdf(input: PricingPdfInput): Promise<Buffer> {
  const origin = getAppUrl();
  const html = buildPricingHTML(input.rows, input.meta, origin);

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1123, height: 794 },
      executablePath: await resolveExecutablePath(),
      headless: true,
    });
  } catch (err) {
    throw new Error(formatPdfLaunchError(err));
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 60_000 });
    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '10mm', right: '8mm', bottom: '10mm', left: '8mm' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
