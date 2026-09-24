import type { Locator } from '@playwright/test';
import { expect, test } from '@playwright/test';

const TRANSLATE_LINK = 'https://smiles.cheminfo.org/tutorial?translate=de';

function selection(locator: Locator): Promise<string> {
  return locator.evaluate(
    (element) => globalThis.getComputedStyle(element).userSelect,
  );
}

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
});

test('the page is not selectable, and its form fields are', async ({
  page,
}) => {
  await page.goto('/');
  const intro = page.getByText('The site opens with the overlay:');

  expect(await selection(intro)).toBe('none');
  await intro.dblclick();
  expect(await page.evaluate(() => globalThis.getSelection()?.toString())).toBe(
    '',
  );

  expect(await selection(page.getByLabel('Site address'))).toBe('text');
});

test('the translate-mode link is copied by clicking it', async ({ page }) => {
  await page.goto('/');
  await page
    .getByLabel('Site address')
    .fill('https://smiles.cheminfo.org/tutorial');
  await page.getByLabel('Language').selectOption('de');

  const link = page.locator('.launch-link .click-to-copy');
  await expect(link).toHaveText(TRANSLATE_LINK);
  await expect(link).toHaveAttribute(
    'title',
    `Copy the translate-mode link (${TRANSLATE_LINK})`,
  );
  expect(
    await link.evaluate(
      (element) => globalThis.getComputedStyle(element).cursor,
    ),
  ).toBe('copy');

  await link.click();
  await expect(link).toHaveAttribute('data-copy', 'copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    TRANSLATE_LINK,
  );
});

test('the setup sample stays selectable and its button copies it', async ({
  page,
}) => {
  await page.goto('/');
  const sample = page.locator('.code-block pre');
  expect(await selection(sample)).toBe('text');

  const code = await sample.evaluate((element) => element.textContent ?? '');
  expect(code.startsWith("import en from './locales/en.json'")).toBe(true);

  await page
    .locator('.code-block')
    .getByRole('button', { name: 'Copy to clipboard' })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);
});

test('the overlay is not selectable, and its search field is', async ({
  page,
}) => {
  await page.goto('/?translate=fr');
  const launcher = page.getByRole('toolbar', { name: 'Translate' });
  await expect(launcher).toContainText('Translating into French');
  expect(await selection(launcher)).toBe('none');

  await launcher.getByRole('button', { name: 'Messages' }).click();
  const search = page.getByPlaceholder('Search keys and text');
  await expect(search).toBeVisible();
  expect(await selection(search)).toBe('text');
});
