import { expect, test } from "@playwright/test";

test("login page renders correctly", async ({ page }) => {
  await page.goto("/login");

  await expect(page.locator("h1")).toHaveText("Teacher login");
  await expect(page.locator("h2")).toHaveText("Welcome back, teacher");
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toContainText("Sign in");
});

test("login page shows validation on empty submit", async ({ page }) => {
  await page.goto("/login");
  await page.locator('button[type="submit"]').click();
  await expect(page.locator("text=Missing fields")).toBeVisible();
});

test("dashboard redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL("**/login");
  expect(page.url()).toContain("/login");
});
