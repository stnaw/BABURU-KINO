import { test, expect } from "@playwright/test";

const baseURL = process.env.QA_BASE_URL || "http://127.0.0.1:4173";

test.describe("BABURU KINKO smoke", () => {
  test("desktop overview and borrow flow shell render", async ({ page }) => {
    await page.goto(baseURL);

    await expect(page).toHaveTitle("BABURU KINKO");
    await expect(page.getByRole("heading", { level: 1, name: "BABURU KINKO" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: /金库状态|Vault Status/ })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: /免息借出 BNB|Borrow Interest-Free BNB/ })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: /我的借款|My Loans/ })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: /金库手册|Vault Manual/ })).toBeVisible();
    await expect(page.locator("#reserve-metric")).toBeVisible();
    await expect(page.locator("#borrow-estimate")).toBeVisible();
    await expect(page.locator("#borrow-action-button")).toBeVisible();
  });

  test.describe("mobile breakpoints", () => {
    const cases = [
      { name: "375x812", width: 375, height: 812 },
      { name: "390x844", width: 390, height: 844 },
      { name: "768x1024", width: 768, height: 1024 },
    ];

    for (const viewport of cases) {
      test(`renders core CTA at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(baseURL);

        await expect(page.locator("#borrow-action-button")).toBeVisible();
        await expect(page.locator(".mobile-dock")).toBeVisible();
        await expect(page.locator("#repay-bar")).toHaveAttribute("aria-hidden", "true");
        await expect(page.locator("#loan-list")).toBeVisible();
      });
    }
  });
});
