import { expect, test } from "@playwright/test";

const routes = [
  { path: "/landing", title: /Preter/i },
  { path: "/login", title: /Sign in/i },
  { path: "/register", title: /Preter|sign up|register/i },
];

for (const route of routes) {
  test(`${route.path} renders without horizontal overflow`, async ({ page }) => {
    await page.goto(route.path);

    await expect(page).toHaveTitle(route.title);

    await expect
      .poll(async () =>
        page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      )
      .toBeLessThanOrEqual(1);

    await expect(page.locator("body")).toBeVisible();
  });
}

test("Google login control is visible", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
});
