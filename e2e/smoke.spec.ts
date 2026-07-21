import { test, expect } from "@playwright/test";

/**
 * Smoke: the app is up and the login page (the only unauthenticated page) renders its brand. Kept
 * separate from the login flow so a bare "is it alive?" check exists that needs no seeded data.
 */
test("app is reachable and the login page renders the brand", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response?.ok()).toBeTruthy();
  await expect(page.getByRole("img", { name: "Agent Lima" })).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});
