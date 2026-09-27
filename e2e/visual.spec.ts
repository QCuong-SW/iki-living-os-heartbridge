import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("screens, overflow, browser errors and accessibility", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  async function settleMotion() {
    await page.evaluate(async () => {
      const finite = document.getAnimations().filter(animation =>
        animation.effect?.getComputedTiming().iterations !== Infinity);
      await Promise.all(finite.map(animation => animation.finished.catch(() => {})));
    });
  }
  async function checkAccessibility() {
    await settleMotion();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Chào Minh, về nhà thôi." }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("home.png"),
    fullPage: true,
  });
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  console.log(
    JSON.stringify(
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      null,
      2,
    ),
  );
  await page
    .getByRole("button", { name: "Tìm thời gian bên nhau", exact: true })
    .click();
  await settleMotion();
  await page.screenshot({
    path: testInfo.outputPath("family.png"),
    fullPage: true,
  });
  await checkAccessibility();
  await page.getByRole("button", { name: "Chỉnh giờ rảnh", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await checkAccessibility();
  await page.screenshot({ path: testInfo.outputPath("availability-modal.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Lên kế hoạch cho khoảng thời gian này" }).click();
  await page.screenshot({
    path: testInfo.outputPath("suggestion.png"),
    fullPage: true,
  });
  await checkAccessibility();
  await page.getByRole("button", { name: "Lên lịch bữa tối" }).click();
  await page.screenshot({
    path: testInfo.outputPath("ritual-detail.png"),
    fullPage: true,
  });
  await checkAccessibility();
  await page
    .getByRole("button", { name: "Đang cần giúp", exact: true })
    .click();
  await page.screenshot({
    path: testInfo.outputPath("care.png"),
    fullPage: true,
  });
  await checkAccessibility();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Nhịp nhà", exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("ritual.png"),
    fullPage: true,
  });
  await checkAccessibility();
  await page.getByRole("button", { name: "Kỷ niệm", exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("memories.png"),
    fullPage: true,
  });
  await checkAccessibility();
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await checkAccessibility();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(results.violations).toEqual([]);
});
