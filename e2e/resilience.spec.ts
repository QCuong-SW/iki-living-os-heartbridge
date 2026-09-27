import { test, expect } from "@playwright/test";
test("small phone and tablet layouts keep every tab within the viewport", async ({
  page,
}) => {
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Chào Minh, về nhà thôi." }),
    ).toBeVisible();
    for (const name of [
      "Gia đình",
      "Quan tâm",
      "Nhịp nhà",
      "Kỷ niệm",
      "Hôm nay",
    ]) {
      await page.getByRole("button", { name, exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});
test("unreadable local data recovers and browser Back returns to the previous screen", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("heartbridge-demo-v1", '{"version":1,"members":[]}'),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Tìm thời gian bên nhau", exact: true })
    .click();
  await page.getByRole("button", { name: "Lên kế hoạch cho khoảng thời gian này" }).click();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Tìm một nhịp chung." }),
  ).toBeVisible();
});
test("failed initial request can be retried without losing the screen", async ({
  page,
}) => {
  await page.route("**/api/demo", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Chưa kết nối được dữ liệu. Bạn có thể thử lại.",
      }),
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("alert").filter({ hasText: "Chưa kết nối được dữ liệu." }),
  ).toBeVisible();
  await page.unroute("**/api/demo");
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Chào Minh, về nhà thôi." }),
  ).toBeVisible();
});
