import { expect, test } from '@playwright/test';

const LAUNCH_HEADING =
  '[data-translate-keys="translate.cheminfo.org:launch.heading"]';
const TRY_INTRO = '[data-translate-keys="translate.cheminfo.org:try.intro"]';

test('outside translate mode the page carries no overlay and no marker', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Open a site in translate mode' }),
  ).toBeVisible();
  await expect(page.locator('[data-translate-overlay]')).toHaveCount(0);
  const text = await page.locator('main').evaluate((main) => main.textContent);
  expect(text).not.toMatch(/[⁠-⁤]/);
});

test('in translate mode every message is annotated with its key and status', async ({
  page,
}) => {
  await page.goto('/?translate=fr');
  const heading = page.locator(LAUNCH_HEADING);
  await expect(heading).toContainText('Ouvrir un site en mode traduction');
  await expect(heading).toHaveAttribute('data-translate-state', 'translated');
  await expect(page.locator(TRY_INTRO)).toHaveAttribute(
    'data-translate-state',
    'missing',
  );
  await expect(page.getByRole('toolbar', { name: 'Translate' })).toContainText(
    'Translating into French',
  );
});

test('Alt-click opens the editor, and the page shows the edit as it is typed', async ({
  page,
}) => {
  await page.goto('/?translate=fr');
  const paragraph = page.locator(TRY_INTRO);
  await paragraph.click({ modifiers: ['Alt'] });

  const editor = page.getByRole('dialog', { name: /French — try\.intro/ });
  await expect(editor).toBeVisible();
  await editor
    .getByRole('textbox')
    .fill('Cette page est traduisible, elle aussi.');

  await expect(paragraph).toContainText(
    'Cette page est traduisible, elle aussi.',
  );
  await expect(paragraph).toHaveAttribute('data-translate-state', 'draft');
  await expect(page.getByText('1 edit', { exact: true })).toBeVisible();
});

test('an edit that drops a placeholder is refused and the page keeps its text', async ({
  page,
}) => {
  await page.goto('/?translate=fr');
  const button = page.locator(
    '[data-translate-keys="translate.cheminfo.org:try.open"]',
  );
  await expect(button).toContainText('Traduire cette page en French');
  await button.click({ modifiers: ['Alt'] });

  const editor = page.getByRole('dialog', { name: /French — try\.open/ });
  await editor.getByRole('textbox').fill('Traduire cette page');
  await expect(
    editor.getByText(
      '{language} is in the English message but not in the translation.',
    ),
  ).toBeVisible();
  await expect(button).toContainText('Traduire cette page en French');
  await expect(button).toHaveAttribute('data-translate-state', 'invalid');
});

test('submitting to a server without GitHub settings says so', async ({
  page,
}) => {
  await page.goto('/?translate=fr');
  await page.locator(TRY_INTRO).click({ modifiers: ['Alt'] });
  const editor = page.getByRole('dialog', { name: /French — try\.intro/ });
  await editor.getByRole('textbox').fill('Cette page est traduisible.');
  await editor.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: 'Submit 1' }).click();
  await page.getByRole('button', { name: 'Open the pull request' }).click();
  await expect(
    page.getByText(
      'Submitting is not configured on this server; download the translation instead.',
    ),
  ).toBeVisible();
});
