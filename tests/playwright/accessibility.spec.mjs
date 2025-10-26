import { test, expect } from '@playwright/test';

// Small Playwright test to validate keyboard focus and modal open/close on the local file
// Run with: npx playwright test tests/playwright/accessibility.spec.mjs --project=chromium

test('keyboard focus and modal open/close flow', async ({ page }) => {
    // load local file — adjust the path if your workspace is in a different location
    await page.goto('file:///C:/github/GCI/OOOReview.html');
    await page.waitForSelector('#generate');

    // Move focus to the first interactive element via Tab
    await page.keyboard.press('Tab');

    // Focus the first badge button in the cabinet
    const firstBadge = page.locator('#badge-cabinet button.badge').first();
    await expect(firstBadge).toHaveCount(1);
    await firstBadge.focus();
    await expect(firstBadge).toBeFocused();

    // Activate the badge (Enter) — should open the modal
    await page.keyboard.press('Enter');
    const modal = page.locator('#badge-modal');
    await expect(modal).toBeVisible();

    // Close should be focused after open
    const closeBtn = page.locator('#badge-modal-close');
    await expect(closeBtn).toBeVisible();
    await expect(closeBtn).toBeFocused();

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
});
