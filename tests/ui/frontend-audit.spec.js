const { test, expect } = require('@playwright/test');

const email = 'manager@workloadwise.demo';
const password = 'DemoPass123!';
const prefix = `UI-AUDIT-${Date.now()}`;

test('01 - login, navigation, visible control inventory and browser errors', async ({ page }) => {
  const pageErrors = [];
  const failedRequests = [];

  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('requestfailed', r => {
    if (/localhost:5000/.test(r.url())) {
      failedRequests.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText}`);
    }
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /sign in to workspace/i }).click();

  await expect(page.getByRole('heading', { name: /good to see you, ananya/i })).toBeVisible();

  for (const label of ['Tasks', 'Team', 'Analytics', 'Settings', 'Overview']) {
    await page.getByRole('button', { name: new RegExp(label, 'i') }).first().click();
    if (label === 'Overview') {
      await expect(page.getByRole('heading', { name: /good to see you, ananya/i })).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: new RegExp(label, 'i') }).first()).toBeVisible();
    }
  }

  // Record visible buttons and links for review without triggering destructive actions.
  const controls = await page.locator('button:visible, a:visible, [role="button"]:visible').evaluateAll(els =>
    els.map(el => ({
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 100),
      ariaLabel: el.getAttribute('aria-label'),
      title: el.getAttribute('title'),
      disabled: !!el.disabled
    }))
  );

  console.log('UI_AUDIT_CONTROLS=' + JSON.stringify(controls));
  console.log('UI_AUDIT_PAGE_ERRORS=' + JSON.stringify(pageErrors));
  console.log('UI_AUDIT_FAILED_API_REQUESTS=' + JSON.stringify(failedRequests));

  expect(pageErrors, 'Browser JavaScript errors').toEqual([]);
  expect(failedRequests, 'Failed API requests').toEqual([]);
});

test('02 - create, edit, update status and delete a temporary task', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /sign in to workspace/i }).click();
  await expect(page.getByRole('heading', { name: /good to see you, ananya/i })).toBeVisible();

  await page.getByRole('button', { name: /tasks/i }).first().click();
  await page.getByRole('button', { name: /new task/i }).click();

  await page.getByLabel(/task title/i).fill(prefix);
  await page.getByLabel(/description/i).fill('Temporary browser audit task');
  await page.getByLabel(/estimated hours/i).fill('1');
  await page.getByRole('button', { name: /create task/i }).click();

  const task = page.locator('.task-card').filter({ hasText: prefix });
  await expect(task).toBeVisible();

  await task.getByRole('button', { name: new RegExp(`Edit ${prefix}`) }).click();
  await page.getByLabel(/task title/i).fill(`${prefix}-EDITED`);
  await page.getByRole('button', { name: /save changes/i }).click();

  const editedTask = page.locator('.task-card').filter({ hasText: `${prefix}-EDITED` });
  await expect(editedTask).toBeVisible();

  await editedTask.getByLabel('Task status').selectOption('IN_PROGRESS');
  await expect(editedTask.getByLabel('Task status')).toHaveValue('IN_PROGRESS');

  page.once('dialog', dialog => dialog.accept());
  await editedTask.getByRole('button', { name: /delete task/i }).click();
  await expect(page.locator('.task-card').filter({ hasText: `${prefix}-EDITED` })).toHaveCount(0);
});

test('03 - Settings preferences save and restore', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /sign in to workspace/i }).click();
  await expect(page.getByRole('heading', { name: /good to see you, ananya/i })).toBeVisible();

  await page.getByRole('button', { name: /settings/i }).first().click();

  // Wait until saved preferences finish loading and both controls render.
  await expect(
    page.getByRole('button', { name: 'Toggle notifications' })
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: 'Toggle workload insights' })
  ).toBeVisible();

  const toggles = page.locator(
    'button[aria-label="Toggle notifications"], button[aria-label="Toggle workload insights"]'
  );
  await expect(toggles).toHaveCount(2);
  const count = await toggles.count();

  if (count >= 2) {
    const original = [];
    for (let i = 0; i < 2; i++) {
      original.push(await toggles.nth(i).getAttribute('aria-pressed'));
    }

    try {
      for (let i = 0; i < 2; i++) await toggles.nth(i).click();
      await page.getByRole('button', { name: /save preferences/i }).click();
      await expect(page.getByText(/preferences saved/i)).toBeVisible();

      await page.reload();
      await page.getByRole('button', { name: /settings/i }).first().click();
      // Both preferences were toggled before saving, so expect the opposite
      // of the original values after reload.
      for (let i = 0; i < 2; i++) {
        const expected = original[i] === 'true' ? 'false' : 'true';
        await expect(toggles.nth(i)).toHaveAttribute('aria-pressed', expected);
      }
    } finally {
      // Restore the original saved preferences.
      await page.reload();
      await page.getByRole('button', { name: /settings/i }).first().click();
      for (let i = 0; i < 2; i++) {
        const current = await toggles.nth(i).getAttribute('aria-pressed');
        if (current !== original[i]) await toggles.nth(i).click();
      }
      await page.getByRole('button', { name: /save preferences/i }).click();
    }
  } else {
    throw new Error(`Expected 2 preference switches; found ${count}`);
  }
});

test('04 - Analytics report export downloads a CSV', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /sign in to workspace/i }).click();
  await expect(page.getByRole('heading', { name: /good to see you, ananya/i })).toBeVisible();

  await page.getByRole('button', { name: /analytics/i }).first().click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export report/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.csv$/i);
});

test('05 - Search and notification controls are checked for visible response', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /sign in to workspace/i }).click();
  await expect(page.getByRole('heading', { name: /good to see you, ananya/i })).toBeVisible();

  const search = page.getByRole('button', { name: /search/i });
  await expect(search).toBeVisible();
  await search.click();

  // Search currently dispatches a custom event. This test checks whether a UI reacts.
  await page.waitForTimeout(300);
  const searchResponse = await page.locator('input:visible, [role="dialog"]:visible').count();
  console.log(`SEARCH_VISIBLE_RESPONSE_COUNT=${searchResponse}`);

  const notifications = page.getByRole('button', { name: /notifications/i });
  await expect(notifications).toBeVisible();
  await notifications.click();
  await page.waitForTimeout(300);
  const notificationResponse = await page.locator('[role="dialog"]:visible, [role="menu"]:visible').count();
  console.log(`NOTIFICATION_VISIBLE_RESPONSE_COUNT=${notificationResponse}`);

  expect(searchResponse, 'Search should open a visible input/dialog').toBeGreaterThan(0);
  expect(notificationResponse, 'Notifications should open a visible menu/dialog').toBeGreaterThan(0);
});
