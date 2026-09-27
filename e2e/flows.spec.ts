import { test, expect } from "@playwright/test";
test("family window → plan → care → complete → memory persists → reset", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Chào Minh, về nhà thôi." }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("undefined");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Tìm thời gian bên nhau", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "19:30 – 20:15" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lên kế hoạch cho khoảng thời gian này" }).click();
  await page.getByRole("button", { name: "Lên lịch bữa tối" }).click();
  await page
    .getByRole("button", { name: "Đang cần giúp", exact: true })
    .click();
  for (const name of [
    "Con giúp bà nhé",
    "Con đã lấy thuốc",
    "Đã mang thuốc về cho bà",
  ])
    await page.getByRole("button", { name, exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "“Cảm ơn cháu nhé.”" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Về buổi hẹn gia đình" }).click();
  await page.getByRole("button", { name: "Đã cùng nhau dùng bữa" }).click();
  await page.getByRole("button", { name: "Viết một kỷ niệm" }).click();
  await page
    .getByLabel("Lời nhắn của bạn")
    .fill("Ba kể chuyện Đà Lạt. Bà cười thật vui.");
  await page.getByRole("button", { name: "Lưu kỷ niệm", exact: true }).click();
  await expect(
    page.getByText("Ba kể chuyện Đà Lạt. Bà cười thật vui."),
  ).toBeVisible();
  await expect(page.locator(".memory-card")).toHaveCount(3);
  await page.reload();
  await expect(
    page.getByText("Ba kể chuyện Đà Lạt. Bà cười thật vui."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page
    .getByRole("button", { name: "Bắt đầu lại câu chuyện mẫu" })
    .click();
  await page.getByRole("button", { name: "Xác nhận bắt đầu lại" }).click();
  await expect(
    page.getByRole("button", { name: "Tìm thời gian bên nhau", exact: true }),
  ).toBeVisible();
});
test("privacy changes recompute recommendation and empty state", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Tìm thời gian bên nhau", exact: true })
    .click();
  await page.getByRole("button", { name: "Chỉnh giờ rảnh", exact: true }).click();
  await page.getByLabel("Chia sẻ thời gian rảnh với gia đình").uncheck();
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    page.getByRole("heading", { name: "Minh đang không chia sẻ lịch rảnh" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Lên kế hoạch cho khoảng thời gian này" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
