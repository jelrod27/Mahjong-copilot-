import { test, expect } from '@playwright/test';

const widths = [
  { name: 'lg-low', width: 1024, height: 768 },
  { name: 'lg-high', width: 1279, height: 800 },
  { name: 'xl', width: 1440, height: 900 },
  { name: 'xl-wide', width: 1920, height: 1080 },
];

test.describe('Sidebar responsive behavior', () => {
  for (const v of widths) {
    test(`@ ${v.name} (${v.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: v.width, height: v.height });
      await page.goto('/', { waitUntil: 'networkidle' });

      // Wait for client hydration to settle the viewport-aware sidebar state.
      const sidebar = page.locator('[data-slot="sidebar"][data-state]').first();
      const expectedState = v.width >= 1280 ? 'expanded' : 'collapsed';
      await expect(sidebar).toHaveAttribute('data-state', expectedState);

      // Capture screenshot AFTER hydration so it reflects what users actually see.
      await page.screenshot({ path: `test-results/sidebar-${v.name}.png`, fullPage: false });

      if (v.width >= 1280) {
        await expect(sidebar.getByRole('link', { name: 'Learn' })).toBeVisible();
      }
    });
  }
});
