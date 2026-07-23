import puppeteer, { type Browser, type Page } from 'puppeteer-core';

export const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';

export const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    executablePath: process.env.CHROME_PATH || MAC_CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
}

/** Opens a mobile-UA page, runs `fn`, and always closes the page. */
export async function withPage<T>(browser: Browser, fn: (page: Page) => Promise<T>): Promise<T> {
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  try {
    return await fn(page);
  } finally {
    await page.close().catch(() => {});
  }
}
