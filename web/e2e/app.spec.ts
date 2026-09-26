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

const tab = (page: Page, name: string) => page.locator('nav.tabs a', { hasText: name }).click();

test('page loads with 75 seats on the boundary map', async ({ page }) => {
  await expect(page.locator('#map [data-code]')).toHaveCount(75);
  await expect(page.locator('#map path.seat')).toHaveCount(75);
  await expect(page.locator('#bkstatus')).toContainText('Snapshot data · version');
  await expect(page.locator('.brand b')).toHaveText('London Housing Gap Explorer');
  await expect(page.locator('#p-map')).toContainText('Resident views for 24 seats are modelled estimates');
});

test('boundary / hex toggle', async ({ page }) => {
  await page.click('#mapview button[data-v="hex"]');
  await expect(page.locator('#map g[data-code] polygon')).toHaveCount(75);
  await page.click('#mapview button[data-v="geo"]');
  await expect(page.locator('#map path.seat')).toHaveCount(75);
});

test('tabs switch pages and update the hash', async ({ page }) => {
  await tab(page, 'Rankings');
  await expect(page.locator('#p-rank')).toBeVisible();
  await expect(page.locator('#p-map')).toBeHidden();
  expect(page.url()).toContain('#p-rank');
  await tab(page, 'Map');
  await expect(page.locator('#p-map')).toBeVisible();
});

test('postcode SE15 5DQ selects Peckham and the card shows its name', async ({ page }) => {
  await tab(page, 'Seat brief');
  await page.fill('#pcin', 'SE15 5DQ');
  await page.click('#pcform button[type=submit]');
  const name = page.getByTestId('seat-name');
  await expect(name).toBeVisible();
  const seat = (await name.textContent())!.trim();
  expect(seat).toContain('Peckham');
  await expect(page.locator('#pcmsg')).toHaveText(`Showing ${seat}.`);
  await expect(page.locator('#labseat')).toHaveText(seat);
});

test('seat picker selects a seat', async ({ page }) => {
  await tab(page, 'Seat brief');
  await page.selectOption('#sseat2', { index: 3 });
  await expect(page.getByTestId('seat-name')).toBeVisible();
});

test('bad postcode shows an error', async ({ page }) => {
  await tab(page, 'Seat brief');
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
  await tab(page, 'Rankings');
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

test('changing the target changes a missing figure; leverage slider works', async ({ page }) => {
  await tab(page, 'Rankings');
  await page.click('#settings summary');
  const before = await page.getByTestId('total-missing').textContent();
  await page.selectOption('#wtot', '88000');
  await expect(page.getByTestId('total-missing')).not.toHaveText(before!);
  await page.locator('#wclose').fill('80');
  await expect(page.locator('#wcloseo')).toHaveText('80 / 20');
});

test('memo button produces a memo card and Download PDF downloads', async ({ page }) => {
  await page.locator('#map [data-code]').first().click();
  await tab(page, 'Seat brief');
  await expect(page.locator('#memobtn')).toBeEnabled();
  await expect(page.locator('#llmnote')).toContainText('Mock memo mode');
  await page.click('#memobtn');
  await expect(page.getByTestId('memo-card')).toBeVisible();
  await expect(page.locator('.mc-bl')).toContainText('This seat builds far fewer homes');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#mcdl')]);
  expect(dl.suggestedFilename()).toMatch(/^policy-memo-.*\.pdf$/);
  await expect(page.locator('#memobtn')).toHaveText('Write a new memo');
});

test('keyboard Enter on a seat selects it (boundary and hex)', async ({ page }) => {
  const seat = page.locator('#map path.seat').nth(10);
  const code = await seat.getAttribute('data-code');
  await seat.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(`#map path.seat[data-code="${code}"]`)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('mapsel')).toBeVisible();
  await page.click('#mapview button[data-v="hex"]');
  await expect(page.locator(`#map g[data-code="${code}"] polygon.sel`)).toHaveCount(1);
  const hex = page.locator('#map g[data-code]').nth(3);
  const code2 = await hex.getAttribute('data-code');
  await hex.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(`#map g[data-code="${code2}"] polygon.sel`)).toHaveCount(1);
});

test('scenario lever changes the KPI and the map layer', async ({ page }) => {
  await tab(page, 'Scenarios');
  const before = (await page.getByTestId('kpi-missing').textContent())!;
  await page.locator('#lv-stalled').fill('60');
  await expect(page.getByTestId('kpi-missing')).not.toHaveText(before);
  await expect(page.locator('#lvo-stalled')).toHaveText('60%');
  await page.click('.presets button[data-p="reset"]');
  await expect(page.getByTestId('kpi-missing')).toHaveText(before);
  await page.click('.presets button[data-p="4"]');
  await expect(page.getByTestId('kpi-added')).not.toHaveText('0');
  await page.fill('#scname', 'Test scenario');
  await page.click('#scsavebtn');
  await expect(page.locator('#scenlist')).toContainText('Test scenario');
  await tab(page, 'Map');
  await expect(page.locator('#layers button[data-l="scen"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#legend [data-legend="scen"]')).toBeVisible();
});

test('trends slider and play change the year label', async ({ page }) => {
  await tab(page, 'Trends');
  const year = page.getByTestId('trend-year');
  const last = (await year.textContent())!;
  await page.locator('#try').fill('0');
  await expect(year).not.toHaveText(last);
  const first = (await year.textContent())!;
  await page.click('#trplay');
  await expect(year).not.toHaveText(first, { timeout: 5000 });
  await page.click('#trplay');
  await page.click('#trmap');
  await expect(page.locator('#p-map')).toBeVisible();
  await expect(page.locator('#legend [data-legend="trend"]')).toBeVisible();
});

test('evidence page lists rated policies', async ({ page }) => {
  await tab(page, 'Evidence');
  const rows = page.locator('[data-testid="policy-matrix"] tbody tr');
  await expect(rows).toHaveCount(7);
  await expect(page.locator('#whygap .wg')).toHaveCount(4);
  const id = (await rows.nth(2).getAttribute('data-polrow'))!;
  await rows.nth(2).locator('button[data-pol]').click();
  await expect(page.locator('#pcpol')).toHaveValue(id);
  await expect(page.locator('#evcards article')).toHaveCount(7);
});
