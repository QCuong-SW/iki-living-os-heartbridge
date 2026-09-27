import { test, expect, type Page } from "@playwright/test";
const cta = "Lên kế hoạch cho khoảng thời gian này";
const empty = "Hôm nay chưa có khoảng thời gian cả nhà cùng rảnh";
async function edit(page: Page, start: string, end: string, share = true) {
  await page.getByRole("button", { name: "Chỉnh giờ rảnh", exact: true }).click();
  await page.getByLabel("Bắt đầu", { exact: true }).fill(start);
  await page.getByLabel("Kết thúc", { exact: true }).fill(end);
  await page.getByLabel("Chia sẻ thời gian rảnh với gia đình").setChecked(share);
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
test("live intersection, boundaries, privacy, persistence and stale suggestion guard", async ({ page }) => {
  await page.goto("/#family");
  await expect(page.getByRole("heading", { name: "19:30 – 20:15" })).toBeVisible();
  await expect(page.getByText("45 phút bên nhau")).toBeVisible();
  const documentId = await page.evaluate(() => { (window as unknown as { documentId: number }).documentId = Math.random(); return (window as unknown as { documentId: number }).documentId; });
  await edit(page, "20:00", "21:00");
  await expect(page.getByRole("heading", { name: "20:00 – 20:30" })).toBeVisible();
  await expect(page.getByText("30 phút bên nhau")).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { documentId: number }).documentId)).toBe(documentId);
  await page.reload();
  await expect(page.getByRole("heading", { name: "20:00 – 20:30" })).toBeVisible();
  await edit(page, "20:01", "21:00");
  await expect(page.getByRole("heading", { name: empty })).toBeVisible();
  await expect(page.getByRole("button", { name: cta })).toBeDisabled();
  await edit(page, "21:00", "22:00");
  await expect(page.getByRole("heading", { name: empty })).toBeVisible();
  await page.goto("/#suggestion");
  await expect(page.getByRole("button", { name: "Lên lịch bữa tối" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Vì sao phù hợp?" })).toHaveCount(0);
  await page.getByRole("button", { name: "Xem lại giờ rảnh" }).click();
  await edit(page, "19:30", "20:15", false);
  await expect(page.getByRole("heading", { name: "Minh đang không chia sẻ lịch rảnh" })).toBeVisible();
  await expect(page.getByRole("button", { name: cta })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Minh đang không chia sẻ lịch rảnh" })).toBeVisible();
  await edit(page, "19:30", "20:15");
  await expect(page.getByRole("heading", { name: "19:30 – 20:15" })).toBeVisible();
});
test("validation and cancel preserve state; existing dinner never moves", async ({ page }) => {
  await page.goto("/#family");
  await page.getByRole("button", { name: "Chỉnh giờ rảnh", exact: true }).click();
  for (const end of ["19:00", "19:30"]) {
    await page.getByLabel("Kết thúc", { exact: true }).fill(end);
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Giờ kết thúc phải sau giờ bắt đầu");
  }
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(page.getByRole("heading", { name: "19:30 – 20:15" })).toBeVisible();
  await page.getByRole("button", { name: cta }).click();
  await page.getByRole("button", { name: "Lên lịch bữa tối", exact: true }).click();
  await expect(page).toHaveURL(/#ritual-detail$/);
  await page.goto("/#family");
  await edit(page, "21:00", "22:00");
  await expect(page.getByRole("heading", { name: empty })).toBeVisible();
  await page.goto("/#ritual-detail");
  await expect(page.locator("main")).toContainText("19:30 – 20:15");
  await page.reload();
  await expect(page.locator("main")).toContainText("19:30 – 20:15");
  await expect(page.locator("main")).toContainText("Lịch rảnh đã thay đổi sau khi buổi hẹn được tạo.");
});
