import { test, expect } from "@playwright/test";

/**
 * Login flow (the critical entry point to the whole app). Assumes the app is running at E2E_BASE_URL
 * with a seeded owner (E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD) — see docs/TESTING.md. The valid-login
 * case is skipped when those creds are absent so the rest of the suite still runs anywhere.
 */
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL;
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD;

test("unauthenticated access to a protected route redirects to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("the login page renders the Agent Lima brand badge", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("img", { name: "Agent Lima" })).toBeVisible();
  await expect(page.getByText("Sign in to your workspace")).toBeVisible();
});

test("invalid credentials show an error and stay on /login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password").fill("definitely-wrong");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("valid credentials sign in and land on the dashboard", async ({ page }) => {
  test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to run the valid-login case.");

  await page.goto("/login");
  await page.getByLabel("Email").fill(OWNER_EMAIL!);
  await page.getByLabel("Password").fill(OWNER_PASSWORD!);
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  // The sidebar identifies the signed-in user (email or name).
  await expect(page.getByText(OWNER_EMAIL!)).toBeVisible();
});
