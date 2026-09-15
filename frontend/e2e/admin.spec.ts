import { expect, test } from '@playwright/test';

test('the admin page asks not to be indexed', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, nofollow',
  );
});

test('a site address and a language make the translate-mode link', async ({
  page,
}) => {
  await page.goto('/');
  // Blueprint's AnchorButton is an <a role="button">.
  const open = page.getByRole('button', { name: 'Open in translate mode' });

  await page
    .getByLabel('Site address')
    .fill('https://smiles.cheminfo.org/tutorial');
  await page.getByLabel('Language').selectOption('de');

  await expect(open).toHaveAttribute(
    'href',
    'https://smiles.cheminfo.org/tutorial?translate=de',
  );
});

test('an address that is not a site is refused', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Site address').fill('smiles');
  await expect(
    page.getByText('Type the full address of a site, starting with https://'),
  ).toBeVisible();
});
