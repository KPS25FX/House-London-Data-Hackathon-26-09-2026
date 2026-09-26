import { test, expect, type Page } from '@playwright/test';

const MEMO = `# Policy memo
## Bottom line
This seat builds far fewer homes than it could. Stalled permissions are the main blocker [K01]. More detail follows here.
## The seat in numbers
- Homes built a year: 400
## Why homes aren't being built
Permissions are granted but not built [K01].
## What would help
- Fast-track route
## Who can act
- The council
## The ask of the MP
Back the target.
## Risks and trade-offs
Some risk.
## Data gaps
None known.
<!--meta {"docIds":["K01"],"unknownCitations":[],"model":"mock"}-->`;

async function mockApi(page: Page) {
  await page.route('**/api/health', r => r.fulfill({ json: { ok: true, llm: 'mock' } }));
  await page.route('**/api/memo', r => r.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: MEMO }));
  await page.route('**/api/ask', r => r.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: 'Short answer [K01].' }));
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await expect(page.locator('body[data-ready="true"]')).toBeAttached();
});

test('page loads with 75 hexes', async ({ page }) => {
  await expect(page.locator('#map g[data-code]')).toHaveCount(75);
  await expect(page.locator('#bkstatus')).toContainText('Snapshot data · version');
});

test('postcode SE15 5DQ selects a seat and the card shows its name', async ({ page }) => {
  await page.fill('#pcin', 'SE15 5DQ');
  await page.click('#pcform button[type=submit]');
  const name = page.getByTestId('seat-name');
  await expect(name).toBeVisible();
  const seat = (await name.textContent())!.trim();
  expect(seat.length).toBeGreaterThan(2);
  await expect(page.locator('#pcmsg')).toHaveText(`Showing ${seat}.`);
  await expect(page.locator('#labseat')).toHaveText(seat);
});

test('bad postcode shows an error', async ({ page }) => {
  await page.fill('#pcin', 'Z');
  await page.click('#pcform button[type=submit]');
  await expect(page.locator('#pcmsg')).toHaveText('Enter a postcode, for example SE15 5DQ.');
});

test('switching layer changes the legend', async ({ page }) => {
  await page.click('#layers button[data-l="type"]');
  await expect(page.locator('#legend [data-legend="type"]')).toBeVisible();
  await page.click('#layers button[data-l="blocker"]');
  await expect(page.locator('#legend [data-legend="blocker"]')).toBeVisible();
  await page.click('#layers button[data-l="margin"]');
  await expect(page.locator('#legend')).toContainText('knife-edge');
});

test('table sorts and filters', async ({ page }) => {
  const rows = page.locator('#rank tbody tr[data-code]');
  await expect(rows).toHaveCount(75);
  await page.selectOption('#fsort', 'margin');
  const margins = await page.locator('#rank tbody tr[data-code]').evaluateAll(trs => trs.map(t => t.getAttribute('data-code')));
  await page.selectOption('#fsort', 'gap');
  const gaps = await page.locator('#rank tbody tr[data-code]').evaluateAll(trs => trs.map(t => t.getAttribute('data-code')));
  expect(margins).not.toEqual(gaps);
  const firstBorough = await page.locator('#fborough option').nth(1).textContent();
  await page.selectOption('#fborough', firstBorough!);
  const n = await rows.count();
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(75);
  await page.selectOption('#ftype', 'settled');
  await page.selectOption('#fparty', { index: 1 });
  // either rows or the empty message
  await expect(page.locator('#rank tbody tr').first()).toBeVisible();
});

test('changing the target changes a missing figure', async ({ page }) => {
  await page.click('#settings summary');
  const before = await page.getByTestId('total-missing').textContent();
  await page.selectOption('#wtot', '88000');
  await expect(page.getByTestId('total-missing')).not.toHaveText(before!);
});

test('memo button produces a memo card and Download PDF downloads', async ({ page }) => {
  await page.locator('#map g[data-code]').first().click();
  await expect(page.locator('#memobtn')).toBeEnabled();
  await expect(page.locator('#llmnote')).toContainText('Mock memo mode');
  await page.click('#memobtn');
  await expect(page.getByTestId('memo-card')).toBeVisible();
  await expect(page.locator('.mc-bl')).toContainText('This seat builds far fewer homes');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#mcdl')]);
  expect(dl.suggestedFilename()).toMatch(/^policy-memo-.*\.pdf$/);
  await expect(page.locator('#memobtn')).toHaveText('Write a new memo');
});

test('keyboard Enter on a hex selects it', async ({ page }) => {
  const hex = page.locator('#map g[data-code]').nth(10);
  const code = await hex.getAttribute('data-code');
  await hex.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(`#map g[data-code="${code}"] polygon.sel`)).toHaveCount(1);
  await expect(page.getByTestId('seat-name')).toBeVisible();
});

test('role toggle persists across reload', async ({ page }) => {
  await page.click('button[data-role="policy"]');
  await expect(page.locator('#rankh')).toHaveText('Where homes are missing');
  await page.reload();
  await expect(page.locator('button[data-role="policy"]')).toHaveAttribute('aria-pressed', 'true');
});
