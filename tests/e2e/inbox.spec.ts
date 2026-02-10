import { test, expect } from '@playwright/test';

test.describe('Inbox Page', () => {
  test.beforeEach(async ({ page }) => {
    // In a real scenario, we'd handle authentication here
    // For now, we assume the user is redirected to login if not authenticated
    await page.goto('/inbox');
  });

  test('should redirect to login if not authenticated', async ({ page }) => {
    // Since we don't have a mock session in E2E yet, it should redirect
    await expect(page).toHaveURL(/.*login/);
  });

  test('login page should have heading', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('AI Email');
  });
});
