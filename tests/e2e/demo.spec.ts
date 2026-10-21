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

test("la demo si idrata e mostra la panoramica", async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto("/app/panoramica");

  await expect(
    page.getByRole("heading", { name: /Buongiorno/ }),
  ).toBeVisible();
  await expect(page.getByText("Osteria del Borgo").first()).toBeVisible();
  await expect(page.getByText("Caricamento ambiente demo…")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("POS: apre un conto, invia la comanda e incassa", async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto("/app/pos");
  await expect(page.getByRole("heading", { name: "Cassa POS" })).toBeVisible();

  await page.getByRole("button", { name: "Nuovo conto" }).first().click();
  await page.getByLabel("Tipo di servizio").selectOption("asporto");
  await page.getByRole("button", { name: "Apri conto" }).click();

  await page.getByLabel("Cerca prodotto").fill("Acqua frizzante");
  await page
    .getByRole("button", { name: /Acqua frizzante 1L/ })
    .click();
  await expect(page.getByText("Righe del conto")).toBeVisible();

  await page.getByRole("button", { name: "Invia comanda" }).click();
  await expect(page.getByText(/Comanda #\d+ inviata/)).toBeVisible();

  await page.getByRole("button", { name: "Incassa ora" }).click();
  await expect(
    page.getByRole("heading", { name: "Incassa conto" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Carta" }).click();
  await expect(page.getByText("Pagamento registrato")).toBeVisible();

  await page.goto("/app/vendite");
  await expect(page.getByRole("heading", { name: "Vendite" })).toBeVisible();
  await page.getByLabel("Cerca scontrino, tavolo o cameriere…").fill("132");
  await expect(page.getByText("#132")).toBeVisible();
  expect(errors).toEqual([]);
});

test("cambio ruolo: Super Admin e cucina", async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto("/app/panoramica");
  await expect(
    page.getByRole("heading", { name: /Buongiorno/ }),
  ).toBeVisible();

  await page
    .getByRole("banner")
    .getByRole("button", { name: /Marco Bellini/ })
    .click();
  await page
    .getByRole("menuitem", { name: /Super Admin CM Risto/ })
    .click();

  await expect(page).toHaveURL(/\/app\/piattaforma$/);
  await expect(
    page.getByRole("heading", { name: "Console piattaforma" }),
  ).toBeVisible();
  await expect(page.getByText("Distribuzione piani")).toBeVisible();

  await page
    .getByRole("banner")
    .getByRole("button", { name: /Super Admin/ })
    .click();
  await page
    .getByRole("menuitem", { name: /Cucina/ })
    .click();

  await expect(page).toHaveURL(/\/app\/cucina$/);
  await expect(page.getByText(/Kitchen Display System/)).toBeVisible();

  await page.getByRole("link", { name: "Panoramica demo" }).click();
  await expect(page).toHaveURL(/\/app\/panoramica$/);
  await expect(
    page.getByRole("heading", { name: /Buongiorno/ }),
  ).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/app\/panoramica$/);
  await expect(
    page.getByRole("heading", { name: /Buongiorno/ }),
  ).toBeVisible();

  await page.goto("/app/prenotazioni");
  await expect(page).toHaveURL(/\/app\/prenotazioni$/);
  await expect(
    page.getByRole("heading", { name: "Area non disponibile per questo ruolo" }),
  ).toBeVisible();

  await page.goto("/app/cucina");
  await expect(page).toHaveURL(/\/app\/cucina$/);
  await expect(page.getByText(/Kitchen Display System/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("super admin demo può provare tutte le aree", async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto("/app/panoramica");
  await page
    .getByRole("banner")
    .getByRole("button", { name: /Marco Bellini/ })
    .click();
  await page
    .getByRole("menuitem", { name: /Super Admin CM Risto/ })
    .click();

  await expect(page).toHaveURL(/\/app\/piattaforma$/);

  await page.goto("/app/pos");
  await expect(page.getByRole("heading", { name: "Cassa POS" })).toBeVisible();

  await page.goto("/app/report");
  await expect(page.getByRole("heading", { name: "Report" })).toBeVisible();

  await page.goto("/app/impostazioni");
  await expect(page.getByRole("heading", { name: "Impostazioni" })).toBeVisible();

  await page.goto("/app/personale");
  await expect(page.getByRole("heading", { name: "Personale" })).toBeVisible();

  expect(errors).toEqual([]);
});

test("ruoli: cassiere e cameriere rispettano le aree consentite", async ({
  page,
}) => {
  const errors = trackPageErrors(page);

  await page.goto("/app/panoramica");
  await page
    .getByRole("banner")
    .getByRole("button", { name: /Marco Bellini/ })
    .click();
  await page.getByRole("menuitem", { name: /Cassiere/ }).click();

  await expect(page).toHaveURL(/\/app\/pos$/);
  await expect(page.getByRole("heading", { name: "Cassa POS" })).toBeVisible();

  await page.goto("/app/report");
  await expect(
    page.getByRole("heading", { name: "Area non disponibile per questo ruolo" }),
  ).toBeVisible();

  await page
    .getByRole("banner")
    .getByRole("button", { name: /Cassiere/ })
    .click();
  await page.getByRole("menuitem", { name: /Cameriere/ }).click();

  await expect(page).toHaveURL(/\/app\/sala$/);
  await expect(page.getByText("Cameriere · demo")).toBeVisible();

  await page.goto("/app/pos");
  await expect(
    page.getByRole("heading", { name: "Area non disponibile per questo ruolo" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("sala demo: piantina grafica modificabile con arredo", async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto("/app/sala");
  await expect(
    page.getByRole("heading", { name: "Sala e tavoli" }),
  ).toBeVisible();

  const plan = page.getByRole("group", { name: "Piantina di Sala principale" });
  await expect(plan).toBeVisible();
  await expect(
    plan.getByRole("button", { name: "Apri tavolo T1" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Modifica sala" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Modifica sala")).toBeVisible();

  await dialog.getByRole("button", { name: "Tavolo T1" }).click();
  await dialog.getByLabel("Posizione X").fill("20");
  await dialog.getByLabel("Posizione Y").fill("6");
  await dialog.getByRole("button", { name: "Aggiungi oggetto" }).click();
  await dialog.getByRole("textbox", { name: "Testo" }).fill("Banco E2E");
  await dialog.getByLabel("Larghezza").fill("10");
  await dialog.getByRole("button", { name: "Salva layout" }).click();
  await expect(
    page.getByText("Piantina di Sala principale salvata."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Modifica sala" }).click();
  const saved = page.getByRole("dialog");
  await saved.getByRole("button", { name: "Tavolo T1" }).click();
  await expect(saved.getByLabel("Posizione X")).toHaveValue("20");
  await expect(saved.getByLabel("Posizione Y")).toHaveValue("6");
  await expect(
    saved.getByRole("button", { name: /Oggetto Banco Banco E2E/ }),
  ).toBeVisible();

  expect(errors).toEqual([]);
});

test("reset dei dati demo dalla barra superiore", async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto("/app/panoramica");
  await page
    .getByRole("banner")
    .getByRole("button", { name: /Marco Bellini/ })
    .click();
  await page
    .getByRole("menuitem", { name: "Ripristina dati demo" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ripristinare i dati demo?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ripristina demo" }).click();

  await expect(page.getByText("Demo ripristinata")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Buongiorno/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
