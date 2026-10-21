import { expect, test } from "@playwright/test";
import { trackPageErrors } from "./support/errors";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal { display: none !important; }";
    document.addEventListener("DOMContentLoaded", () => {
      document.head.append(style);
    });
  });
});

test.describe("tema scuro di sistema", () => {
  test.use({ colorScheme: "dark" });

  test("la dark mode automatica adatta superfici e testo", async ({ page }) => {
    const errors = trackPageErrors(page);

    await page.goto("/app/panoramica");
    await expect(
      page.getByRole("heading", { name: /Buongiorno/ }),
    ).toBeVisible();

    const probe = await page.evaluate(() => {
      const body = getComputedStyle(document.body).backgroundColor;
      const card = document.querySelector(".rounded-xl.border");
      const cardBackground = card
        ? getComputedStyle(card).backgroundColor
        : null;
      const colorScheme = getComputedStyle(document.documentElement)
        .colorScheme;
      return { body, cardBackground, colorScheme };
    });

    expect(probe.body).toBe("rgb(9, 9, 11)");
    expect(probe.cardBackground).not.toBe("rgb(255, 255, 255)");
    expect(probe.colorScheme).toContain("dark");
    expect(errors).toEqual([]);
  });

  test("la home pubblica è leggibile in tema scuro", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Il servizio, sotto controllo/ }),
    ).toBeVisible();
    const body = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(body).toBe("rgb(9, 9, 11)");
  });
});

test("la modalità chiara resta attiva senza preferenza di sistema", async ({
  page,
}) => {
  await page.goto("/app/panoramica");
  await expect(
    page.getByRole("heading", { name: /Buongiorno/ }),
  ).toBeVisible();
  const body = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  expect(body).toBe("rgb(250, 250, 250)");
});
