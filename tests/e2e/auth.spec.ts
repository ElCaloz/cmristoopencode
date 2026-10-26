import { expect, test } from "@playwright/test";
import { uniqueEmail, waitForAuthEmailLink } from "./support/auth";
import { trackPageErrors } from "./support/errors";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal { display: none !important; }";
    document.addEventListener("DOMContentLoaded", () => {
      document.head.append(style);
    });
  });
});

const account = {
  firstName: "Elena",
  lastName: "Prova",
  email: uniqueEmail("e2e-owner"),
  password: "Password!CM1",
  newPassword: "Password!CM2",
};

const restaurantName = `Trattoria E2E ${Date.now().toString(36)}`;

test("registrazione reale: conferma email e onboarding", async ({
  page,
  request,
}) => {
  const errors = trackPageErrors(page);

  await page.goto("/registrati");
  await expect(
    page.getByRole("heading", { name: "Crea il tuo account" }),
  ).toBeVisible();

  await page.getByLabel("Nome", { exact: true }).fill(account.firstName);
  await page.getByLabel("Cognome", { exact: true }).fill(account.lastName);
  await page.getByLabel("Email di lavoro", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crea account" }).click();

  await expect(
    page.getByRole("heading", { name: "Controlla la tua email" }),
  ).toBeVisible();

  const confirmationLink = await waitForAuthEmailLink(
    request,
    account.email,
    "signup",
  );
  await page.goto(confirmationLink);

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole("heading", { name: "Configura il tuo locale" }),
  ).toBeVisible();

  await page.getByLabel("Nome del locale").fill(restaurantName);
  await page.getByLabel("Città").fill("Firenze");
  await page.getByLabel("Tipo di locale").selectOption("trattoria");
  await page.getByRole("button", { name: "Avanti" }).click();

  await expect(page.getByText("Scegli il piano")).toBeVisible();
  await page.getByRole("radio", { name: /^Pro\b/ }).check();
  await page.getByRole("button", { name: "Crea il locale" }).focus();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /Ciao, Elena/ })).toBeVisible();
  await expect(page.getByText(restaurantName).first()).toBeVisible();
  await expect(page.getByText("Key: owner")).toBeVisible();
  await expect(page.getByText("Nessun addebito attivo")).toBeVisible();

  expect(errors).toEqual([]);
});

test("accesso, logout, sessione scaduta e redirect sicuri", async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Accedi" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /Ciao, Elena/ })).toBeVisible();

  const authCookies = (await page.context().cookies()).filter((cookie) =>
    /^sb-.*-auth-token(\.\d+)?$/.test(cookie.name),
  );
  expect(authCookies.length).toBeGreaterThan(0);
  for (const cookie of authCookies) {
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("Lax");
  }

  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("button", { name: "Esci" }).click();
  await expect(page).toHaveURL(/\/login\?status=logout/);
  await expect(page.getByText("Sei uscito dal tuo account.")).toBeVisible();

  await page.goto("/login?next=https%3A%2F%2Fevil.example");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Accedi" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page).not.toHaveURL(/evil\.example/);

  await page.context().clearCookies();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?reason=session/);
  await expect(
    page.getByText("La sessione è scaduta o non è valida. Accedi per continuare."),
  ).toBeVisible();

  expect(errors).toEqual([]);
});

test("recupero password reale: link email, nuova password, rientro", async ({
  page,
  request,
}) => {
  const errors = trackPageErrors(page);

  await page.goto("/recupera-password");
  await page.getByLabel("Email dell'account").fill(account.email);
  await page.getByRole("button", { name: "Invia link di recupero" }).click();
  await expect(
    page.getByRole("heading", { name: "Controlla la tua email" }),
  ).toBeVisible();

  const recoveryLink = await waitForAuthEmailLink(
    request,
    account.email,
    "recovery",
  );
  await page.goto(recoveryLink);

  await expect(page).toHaveURL(/\/reimposta-password$/);
  await expect(
    page.getByRole("heading", { name: "Imposta una nuova password" }),
  ).toBeVisible();

  await page.getByLabel("Nuova password", { exact: true }).fill(account.newPassword);
  await page
    .getByLabel("Conferma password", { exact: true })
    .fill(account.newPassword);
  await page.getByRole("button", { name: "Imposta nuova password" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("button", { name: "Esci" }).click();
  await expect(page).toHaveURL(/\/login\?status=logout/);

  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Email o password non corretti." }),
  ).toBeVisible();

  await page.getByLabel("Password", { exact: true }).fill(account.newPassword);
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  expect(errors).toEqual([]);
});

test("pagine protette senza sessione e demo sempre pubblica", async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?reason=session/);
  await expect(
    page.getByText("La sessione è scaduta o non è valida. Accedi per continuare."),
  ).toBeVisible();

  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/login\?reason=session/);

  await page.goto("/reimposta-password");
  await expect(page).toHaveURL(/\/recupera-password\?reason=session/);
  await expect(
    page.getByText(
      "Il link di recupero richiede una sessione valida oppure è scaduto.",
    ),
  ).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(uniqueEmail("e2e-missing"));
  await page
    .getByLabel("Password", { exact: true })
    .fill("Password!Sbagliata9");
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Email o password non corretti." }),
  ).toBeVisible();

  await page.goto("/app/panoramica");
  await expect(page.getByRole("heading", { name: /Buongiorno/ })).toBeVisible();

  expect(errors).toEqual([]);
});

test("gestione menu reale: categorie, prodotti, disponibilità e prezzi", async ({
  page,
}) => {
  const errors = trackPageErrors(page);

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.newPassword);
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Apri il menu" }).click();
  await expect(page).toHaveURL(/\/dashboard\/menu$/);
  await expect(
    page.getByRole("heading", { name: restaurantName }),
  ).toBeVisible();

  await page.getByLabel("Nome nuova categoria").fill("Antipasti E2E");
  await page.getByRole("button", { name: "Aggiungi categoria" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Antipasti E2E" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Nuovo prodotto" }).first().click();
  await page.getByLabel("Nome", { exact: true }).fill("Bruschetta E2E");
  await page.getByLabel("Prezzo (€)").fill("6,50");
  await page
    .getByLabel("Categoria", { exact: true })
    .selectOption({ label: "Antipasti E2E" });
  await page.getByRole("button", { name: "Aggiungi prodotto" }).click();

  await expect(
    page.getByText("Bruschetta E2E", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/6,50/)).toBeVisible();

  await page.getByRole("button", { name: "Azioni" }).click();
  await page.getByRole("menuitem", { name: "Segna esaurito" }).click();
  await expect(page.getByText("Esaurito", { exact: true })).toBeVisible();

  await page.getByText("Bruschetta E2E", { exact: true }).click();
  await page.getByLabel("Prezzo (€)").fill("7,00");
  await page.getByRole("button", { name: "Salva modifiche" }).click();
  await expect(page.getByText(/7,00/)).toBeVisible();

  await page.getByRole("button", { name: "Azioni" }).click();
  await page.getByRole("menuitem", { name: "Elimina" }).click();
  await page.getByRole("button", { name: "Elimina", exact: true }).click();
  await expect(
    page.getByText("Bruschetta E2E", { exact: true }),
  ).not.toBeVisible();

  await page.getByRole("button", { name: "Elimina Antipasti E2E" }).click();
  await page.getByRole("button", { name: "Elimina", exact: true }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Antipasti E2E" }),
  ).not.toBeVisible();

  expect(errors).toEqual([]);
});

test("magazzino reale: fornitori, giacenze, movimenti, sprechi e scadenze", async ({
  page,
}) => {
  const errors = trackPageErrors(page);
  const expiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.newPassword);
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Apri il magazzino" }).click();
  await expect(page).toHaveURL(/\/dashboard\/magazzino$/);
  await expect(
    page.getByRole("heading", { name: restaurantName }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Fornitori" }).click();
  const suppliersDialog = page.getByRole("dialog");
  await suppliersDialog.getByRole("button", { name: "Nuovo fornitore" }).click();
  await suppliersDialog.getByLabel("Nome", { exact: true }).fill("Ortofrutta E2E");
  await suppliersDialog
    .getByLabel("Categoria", { exact: true })
    .fill("Ortofrutta");
  await suppliersDialog
    .getByLabel("Email", { exact: true })
    .fill("ordini@orto-e2e.it");
  await suppliersDialog
    .getByLabel("Telefono", { exact: true })
    .fill("+39 055 1234567");
  await suppliersDialog
    .getByRole("button", { name: "Crea fornitore" })
    .click();
  await expect(
    suppliersDialog.getByText("Ortofrutta E2E", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Fornitori" }),
  ).not.toBeVisible();

  await page.getByRole("button", { name: "Nuovo articolo" }).first().click();
  const itemDialog = page.getByRole("dialog");
  await itemDialog.getByLabel("Nome", { exact: true }).fill("Pomodori E2E");
  await itemDialog.getByLabel("Codice interno").fill("POM-E2E");
  await itemDialog.getByLabel("Categoria", { exact: true }).fill("Verdura");
  await itemDialog.getByLabel("Unit\u00e0 di misura").fill("kg");
  await itemDialog.getByLabel(/Costo per unit/).fill("2,50");
  await itemDialog.getByLabel("Scorta minima").fill("5");
  await itemDialog.getByLabel("Giacenza iniziale").fill("10");
  await itemDialog
    .getByLabel("Fornitore")
    .selectOption({ label: "Ortofrutta E2E" });
  await itemDialog.getByLabel("Lotto").fill("LOT-E2E");
  await itemDialog.getByLabel("Scadenza").fill(expiry);
  await itemDialog.getByLabel("Posizione").fill("Frigo E2E");
  await itemDialog.getByRole("button", { name: "Crea articolo" }).click();

  await expect(page.getByText("Pomodori E2E", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "Pomodori E2E" }),
  ).toContainText("10 kg");
  await expect(
    page.getByRole("row").filter({ hasText: "Pomodori E2E" }),
  ).toContainText("25,00");

  await page.getByRole("button", { name: "Azioni" }).click();
  await page.getByRole("menuitem", { name: "Carico", exact: true }).click();
  let movementDialog = page.getByRole("dialog");
  await movementDialog.getByLabel(/Quantit\u00e0 da caricare/).fill("5");
  await movementDialog.getByRole("button", { name: "Registra carico" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Pomodori E2E" }),
  ).toContainText("15 kg");

  await page.getByRole("button", { name: "Azioni" }).click();
  await page.getByRole("menuitem", { name: "Scarico", exact: true }).click();
  movementDialog = page.getByRole("dialog");
  await movementDialog.getByLabel(/Quantit\u00e0 da scaricare/).fill("3");
  await movementDialog.getByRole("button", { name: "Registra scarico" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Pomodori E2E" }),
  ).toContainText("12 kg");

  await page.getByRole("button", { name: "Azioni" }).click();
  await page.getByRole("menuitem", { name: "Spreco", exact: true }).click();
  movementDialog = page.getByRole("dialog");
  await movementDialog.getByLabel(/Quantit\u00e0 sprecata/).fill("1");
  await movementDialog
    .getByLabel("Motivazione dello spreco")
    .selectOption("expiry");
  await movementDialog.getByRole("button", { name: "Registra spreco" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Pomodori E2E" }),
  ).toContainText("11 kg");

  await page.getByRole("button", { name: "Movimenti" }).click();
  const historyDialog = page.getByRole("dialog");
  await expect(
    historyDialog.getByRole("heading", { name: "Registro movimenti" }),
  ).toBeVisible();
  await expect(historyDialog.getByText("+5 kg")).toBeVisible();
  await expect(historyDialog.getByText("-3 kg")).toBeVisible();
  await expect(historyDialog.getByText("-1 kg")).toBeVisible();
  await expect(historyDialog.getByText(/Scadenza/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Registro movimenti" }),
  ).not.toBeVisible();

  await page.getByText("Pomodori E2E", { exact: true }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Scorta minima").fill("12");
  await editDialog.getByRole("button", { name: "Salva modifiche" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Pomodori E2E" }),
  ).toContainText("Sotto minimo");

  await page.getByRole("button", { name: "Azioni" }).click();
  await page.getByRole("menuitem", { name: "Rettifica", exact: true }).click();
  movementDialog = page.getByRole("dialog");
  await movementDialog.getByLabel(/Variazione di giacenza/).fill("-1,5");
  await movementDialog
    .getByRole("button", { name: "Registra rettifica" })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Pomodori E2E" }),
  ).toContainText("9,5 kg");

  await expect(
    page.getByRole("row").filter({ hasText: "Pomodori E2E" }),
  ).toContainText("In scadenza");

  expect(errors).toEqual([]);
});

test("ricette e food cost reali: ingredienti, sfrido, margine e rimozione", async ({
  page,
}) => {
  const errors = trackPageErrors(page);

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.newPassword);
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Apri il menu" }).click();
  await page.getByRole("button", { name: "Nuovo prodotto" }).first().click();
  await page.getByLabel("Nome", { exact: true }).fill("Piatto Ricetta E2E");
  await page.getByLabel(/Prezzo/).fill("12,00");
  await page.getByRole("button", { name: "Aggiungi prodotto" }).click();
  await expect(
    page.getByText("Piatto Ricetta E2E", { exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await page.getByRole("link", { name: "Apri le ricette" }).click();
  await expect(page).toHaveURL(/\/dashboard\/ricette$/);
  await expect(
    page.getByRole("heading", { name: restaurantName }),
  ).toBeVisible();

  let recipeRow = page
    .getByRole("row")
    .filter({ hasText: "Piatto Ricetta E2E" });
  await recipeRow.click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", {
      name: "Nuova ricetta: Piatto Ricetta E2E",
    }),
  ).toBeVisible();

  const ingredientSelect = dialog.getByLabel("Ingrediente 1", {
    exact: true,
  });
  const tomatoValue = await ingredientSelect
    .locator("option", { hasText: "Pomodori E2E" })
    .getAttribute("value");
  expect(tomatoValue).toBeTruthy();
  await ingredientSelect.selectOption(tomatoValue ?? "");
  await dialog.getByLabel(/Quantita 1/).fill("2");
  await dialog.getByLabel(/Sfrido 1/).fill("10");
  await dialog.getByRole("button", { name: "Salva ricetta" }).click();

  await expect(
    page.getByText("Ricetta e food cost aggiornati."),
  ).toBeVisible();

  await expect(recipeRow).toContainText("5,50");
  await expect(recipeRow).toContainText("46%");
  await expect(recipeRow).toContainText("Food cost alto");

  await recipeRow.click();
  const editDialog = page.getByRole("dialog");
  await expect(
    editDialog.getByRole("heading", {
      name: "Ricetta: Piatto Ricetta E2E",
    }),
  ).toBeVisible();
  await editDialog.getByLabel(/Quantita 1/).fill("1");
  await editDialog.getByLabel(/Sfrido 1/).fill("0");
  await editDialog.getByRole("button", { name: "Salva ricetta" }).click();
  await expect(
    page.getByText("Ricetta e food cost aggiornati."),
  ).toBeVisible();

  recipeRow = page
    .getByRole("row")
    .filter({ hasText: "Piatto Ricetta E2E" });
  await expect(recipeRow).toContainText("2,50");
  await expect(recipeRow).toContainText("21%");
  await expect(recipeRow).toContainText("Sotto controllo");

  await recipeRow.getByRole("button", { name: "Azioni" }).click();
  await page.getByRole("menuitem", { name: "Elimina ricetta" }).click();
  const deleteDialog = page.getByRole("dialog");
  await expect(
    deleteDialog.getByRole("heading", { name: "Eliminare la ricetta?" }),
  ).toBeVisible();
  await deleteDialog
    .getByRole("button", { name: "Elimina ricetta" })
    .click();
  await expect(page.getByText("Ricetta eliminata.")).toBeVisible();
  await expect(recipeRow).toContainText("Senza ricetta");

  expect(errors).toEqual([]);
});

test("acquisti reali: ordine, ricezione parziale, giacenze e annullamento", async ({
  page,
}) => {
  const errors = trackPageErrors(page);

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.newPassword);
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Apri gli acquisti" }).click();
  await expect(page).toHaveURL(/\/dashboard\/acquisti$/);
  await expect(
    page.getByRole("heading", { name: restaurantName }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Nuovo ordine" }).click();
  let dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Nuovo ordine di acquisto" }),
  ).toBeVisible();
  await dialog
    .getByLabel("Fornitore", { exact: true })
    .selectOption({ label: "Ortofrutta E2E" });

  const itemSelect = dialog.getByLabel("Articolo 1", { exact: true });
  const tomatoValue = await itemSelect
    .locator("option", { hasText: "Pomodori E2E" })
    .getAttribute("value");
  expect(tomatoValue).toBeTruthy();
  await itemSelect.selectOption(tomatoValue ?? "");
  await dialog.getByLabel("Quantita 1", { exact: true }).fill("5");
  await dialog.getByLabel("Costo unitario 1", { exact: true }).fill("2,40");
  await dialog.getByRole("button", { name: "Crea ordine" }).click();

  await expect(
    page.getByText("Ordine di acquisto creato."),
  ).toBeVisible();
  let orderRow = page
    .getByRole("row")
    .filter({ hasText: "Ortofrutta E2E" })
    .first();
  await expect(orderRow).toContainText("Bozza");
  await expect(orderRow).toContainText("12,00");
  const orderNumber = (await orderRow.innerText()).match(/PO-\d{8}-\d{4}/)?.[0];
  expect(orderNumber).toBeTruthy();

  await orderRow
    .getByRole("button", { name: `Azioni ordine ${orderNumber}` })
    .click();
  await page.getByRole("menuitem", { name: "Segna ordinato" }).click();
  await expect(
    page.getByText("Ordine segnato come ordinato."),
  ).toBeVisible();
  await expect(orderRow).toContainText("Ordinato");

  await orderRow
    .getByRole("button", { name: `Azioni ordine ${orderNumber}` })
    .click();
  await page.getByRole("menuitem", { name: "Ricevi merce" }).click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: new RegExp(orderNumber ?? "") }),
  ).toBeVisible();
  await expect(dialog.getByLabel("Quantita ricevuta 1")).toHaveValue("5");
  await dialog.getByLabel("Quantita ricevuta 1").fill("4");
  await dialog
    .getByLabel("Note ricezione", { exact: true })
    .fill("Consegna parziale E2E");
  await expect(dialog.getByText(/Differenza di 1/)).toBeVisible();
  await dialog
    .getByRole("button", { name: "Registra ricezione" })
    .click();

  await expect(
    page.getByText("Ricezione registrata e giacenze aggiornate."),
  ).toBeVisible();
  orderRow = page
    .getByRole("row")
    .filter({ hasText: "Ortofrutta E2E" })
    .first();
  await expect(orderRow).toContainText("Ricevuto");
  await expect(orderRow).toContainText("9,60");
  await expect(orderRow).toContainText("1 in meno");

  await page.getByRole("link", { name: "Magazzino", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/magazzino$/);
  const itemRow = page
    .getByRole("row")
    .filter({ hasText: "Pomodori E2E" });
  await expect(itemRow).toContainText("13,5 kg");
  await expect(itemRow).toContainText("32,40");
  await expect(itemRow).toContainText(/2,40\s*€\s*\/\s*kg/);

  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await page.getByRole("link", { name: "Apri gli acquisti" }).click();
  await page.getByRole("button", { name: "Nuovo ordine" }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Fornitore", { exact: true })
    .selectOption({ label: "Ortofrutta E2E" });
  const secondItemSelect = dialog.getByLabel("Articolo 1", {
    exact: true,
  });
  await secondItemSelect.selectOption(tomatoValue ?? "");
  await dialog.getByLabel("Quantita 1", { exact: true }).fill("1");
  await dialog.getByLabel("Costo unitario 1", { exact: true }).fill("2,40");
  await dialog.getByRole("button", { name: "Crea ordine" }).click();
  await expect(
    page.getByText("Ordine di acquisto creato."),
  ).toBeVisible();

  const draftRow = page
    .getByRole("row")
    .filter({ hasText: "Ortofrutta E2E" })
    .filter({ hasText: "Bozza" });
  const draftNumber = (await draftRow.innerText()).match(
    /PO-\d{8}-\d{4}/,
  )?.[0];
  expect(draftNumber).toBeTruthy();
  await draftRow
    .getByRole("button", { name: `Azioni ordine ${draftNumber}` })
    .click();
  await page.getByRole("menuitem", { name: "Annulla ordine" }).click();
  const cancelDialog = page.getByRole("dialog");
  await expect(
    cancelDialog.getByRole("heading", {
      name: `Annullare ${draftNumber}?`,
    }),
  ).toBeVisible();
  await cancelDialog
    .getByRole("button", { name: "Annulla ordine" })
    .click();
  await expect(page.getByText("Ordine annullato.")).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: draftNumber ?? "" }),
  ).toContainText("Annullato");

  expect(errors).toEqual([]);
});

test("gestione sala reale: aree, tavoli, capienze e sospensione", async ({
  page,
}) => {
  const errors = trackPageErrors(page);

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.newPassword);
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Apri la sala" }).click();
  await expect(page).toHaveURL(/\/dashboard\/sala$/);
  await expect(
    page.getByRole("heading", { name: restaurantName }),
  ).toBeVisible();

  await page.getByLabel("Nome nuova area").fill("Terrazza E2E");
  await page.getByRole("button", { name: "Aggiungi area" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Terrazza E2E" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Nuovo tavolo" }).first().click();
  await page.getByLabel("Nome", { exact: true }).fill("Z9 E2E");
  await page.getByLabel("Posti", { exact: true }).fill("4");
  await page
    .getByLabel("Area", { exact: true })
    .selectOption({ label: "Terrazza E2E" });
  await page.getByRole("button", { name: "Aggiungi tavolo" }).click();

  const salaRow = page.getByRole("row").filter({ hasText: "Z9 E2E" });
  await expect(salaRow).toBeVisible();
  await expect(salaRow).toContainText("4 posti");
  await expect(salaRow).toContainText("Terrazza E2E");

  await salaRow.getByRole("button", { name: "Azioni" }).click();
  await page.getByRole("menuitem", { name: "Sospendi" }).click();
  await expect(salaRow).toContainText("Sospeso");

  await salaRow.click();
  await page.getByLabel("Posti", { exact: true }).fill("6");
  await page.getByRole("button", { name: "Salva modifiche" }).click();
  await expect(salaRow).toContainText("6 posti");

  await salaRow.getByRole("button", { name: "Azioni" }).click();
  await page.getByRole("menuitem", { name: "Riattiva" }).click();
  await expect(salaRow).toContainText("Attivo");

  await salaRow.getByRole("button", { name: "Azioni" }).click();
  await page.getByRole("menuitem", { name: "Elimina" }).click();
  await page.getByRole("button", { name: "Elimina", exact: true }).click();
  await expect(salaRow).not.toBeVisible();

  await page.getByRole("button", { name: "Elimina Terrazza E2E" }).click();
  await page.getByRole("button", { name: "Elimina", exact: true }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Terrazza E2E" }),
  ).not.toBeVisible();

  expect(errors).toEqual([]);
});

test("sala grafica: piantina modificabile con trascinamento, arredo e salvataggio", async ({
  page,
}) => {
  const errors = trackPageErrors(page);

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.newPassword);
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Apri la sala" }).click();
  await expect(page).toHaveURL(/\/dashboard\/sala$/);

  await page.getByLabel("Nome nuova area").fill("Piantina E2E");
  await page.getByRole("button", { name: "Aggiungi area" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Piantina E2E" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Nuovo tavolo" }).first().click();
  await page.getByLabel("Nome", { exact: true }).fill("G1 E2E");
  await page.getByLabel("Posti", { exact: true }).fill("4");
  await page
    .getByLabel("Area", { exact: true })
    .selectOption({ label: "Piantina E2E" });
  await page.getByRole("button", { name: "Aggiungi tavolo" }).click();

  await page
    .getByRole("button", { name: "Piantina E2E", exact: true })
    .click();
  await expect(
    page
      .getByRole("group", { name: "Piantina di Piantina E2E" })
      .getByRole("button", { name: "Apri tavolo G1 E2E" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Modifica sala" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Modifica sala")).toBeVisible();

  const tableButton = dialog.getByRole("button", { name: "Tavolo G1 E2E" });
  await tableButton.click();
  await dialog.getByLabel("Posizione X").fill("12");
  await dialog.getByLabel("Posizione Y").fill("6");

  const canvas = dialog.getByRole("group", { name: "Piantina interattiva" });
  const canvasBox = await canvas.boundingBox();
  const tableBox = await tableButton.boundingBox();
  if (!canvasBox || !tableBox) throw new Error("piantina non trovata");

  const deltaX = (canvasBox.width * 4) / 48;
  const deltaY = (canvasBox.height * 2) / 32;
  await page.mouse.move(
    tableBox.x + tableBox.width / 2,
    tableBox.y + tableBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    tableBox.x + tableBox.width / 2 + deltaX,
    tableBox.y + tableBox.height / 2 + deltaY,
    { steps: 12 },
  );
  await page.mouse.up();

  await expect(dialog.getByLabel("Posizione X")).toHaveValue("16");
  await expect(dialog.getByLabel("Posizione Y")).toHaveValue("8");

  await dialog.getByLabel("Tipo oggetto").selectOption("counter");
  await dialog.getByRole("button", { name: "Aggiungi oggetto" }).click();
  await expect(
    dialog.getByRole("button", { name: /Oggetto Banco/ }),
  ).toBeVisible();
  await dialog.getByLabel("Testo").fill("Banco E2E");
  await dialog.getByLabel("Larghezza").fill("16");

  await dialog.getByRole("button", { name: "Salva layout" }).click();
  await expect(page.getByText("Layout salvato.")).toBeVisible();
  await expect(dialog).not.toBeVisible();

  await page.getByRole("button", { name: "Modifica sala" }).click();
  const savedDialog = page.getByRole("dialog");
  await savedDialog.getByRole("button", { name: "Tavolo G1 E2E" }).click();
  await expect(savedDialog.getByLabel("Posizione X")).toHaveValue("16");
  await expect(savedDialog.getByLabel("Posizione Y")).toHaveValue("8");
  await expect(
    savedDialog.getByRole("button", { name: /Oggetto Banco Banco E2E/ }),
  ).toBeVisible();
  await savedDialog.getByRole("button", { name: "Annulla" }).click();
  await expect(savedDialog).not.toBeVisible();

  const row = page.getByRole("row").filter({ hasText: "G1 E2E" });
  await row.getByRole("button", { name: "Azioni" }).click();
  await page.getByRole("menuitem", { name: "Elimina" }).click();
  await page.getByRole("button", { name: "Elimina", exact: true }).click();
  await expect(row).not.toBeVisible();

  await page.getByRole("button", { name: "Elimina Piantina E2E" }).click();
  await page.getByRole("button", { name: "Elimina", exact: true }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Piantina E2E" }),
  ).not.toBeVisible();

  expect(errors).toEqual([]);
});

test("cassa POS reale: conto, aggiunta prodotti, pagamento e chiusura", async ({
  page,
}) => {
  const errors = trackPageErrors(page);

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.newPassword);
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Apri il menu" }).click();
  await page.getByRole("button", { name: "Nuovo prodotto" }).first().click();
  await page.getByLabel("Nome", { exact: true }).fill("Bruschetta POS E2E");
  await page.getByLabel("Prezzo (€)").fill("8,00");
  await page.getByRole("button", { name: "Aggiungi prodotto" }).click();
  await expect(
    page.getByText("Bruschetta POS E2E", { exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await page.getByRole("link", { name: "Apri la sala" }).click();
  await page.getByLabel("Nome nuova area").fill("Sala POS E2E");
  await page.getByRole("button", { name: "Aggiungi area" }).click();
  await page.getByRole("button", { name: "Nuovo tavolo" }).first().click();
  await page.getByLabel("Nome", { exact: true }).fill("P1 E2E");
  await page.getByLabel("Posti", { exact: true }).fill("4");
  await page
    .getByLabel("Area", { exact: true })
    .selectOption({ label: "Sala POS E2E" });
  await page.getByRole("button", { name: "Aggiungi tavolo" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "P1 E2E" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await page.getByRole("link", { name: "Apri il POS" }).click();
  await expect(page).toHaveURL(/\/dashboard\/pos$/);

  await page.getByRole("button", { name: /P1 E2E/ }).click();
  await page.getByRole("button", { name: "Apri conto" }).click();
  await page.getByLabel("Coperti").fill("2");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Apri conto" })
    .click();

  await expect(page.getByText("Aggiungi prodotti")).toBeVisible();
  await page.getByRole("button", { name: /^Bruschetta POS E2E/ }).click();
  await expect(page.getByText("1× Bruschetta POS E2E")).toBeVisible();
  await expect(page.getByText("Da incassare")).not.toBeVisible();

  await page.getByRole("button", { name: "Incassa" }).click();
  await expect(page.getByLabel("Importo (€)")).toHaveValue("8,00");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Registra pagamento" })
    .click();

  await expect(page.getByText("Conto incassato e chiuso.")).toBeVisible();
  await expect(page.getByText("tavolo libero")).toBeVisible();
  await expect(page.getByRole("button", { name: /P1 E2E/ })).toContainText(
    "Libero",
  );

  expect(errors).toEqual([]);
});

test("vendite reali: incasso del POS derivato nella giornata", async ({
  page,
}) => {
  const errors = trackPageErrors(page);

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.newPassword);
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Apri le vendite" }).click();
  await expect(page).toHaveURL(/\/dashboard\/vendite$/);

  await expect(page.getByText("Incasso registrato")).toBeVisible();
  await expect(page.getByText("1 conto incassato")).toBeVisible();

  const saleRow = page.getByRole("button", { name: /P1 E2E/ });
  await expect(saleRow).toContainText("8,00");
  await expect(saleRow).toContainText("Carta");
  await expect(saleRow).toContainText("2 coperti");

  await saleRow.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Conto P1 E2E")).toBeVisible();
  await expect(dialog.getByText("1× Bruschetta POS E2E")).toBeVisible();
  await expect(dialog.getByText("Totale conto")).toBeVisible();

  expect(errors).toEqual([]);
});

test("cucina KDS reale: righe dalla cassa con transizioni di stato", async ({
  page,
}) => {
  const errors = trackPageErrors(page);

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.newPassword);
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Apri il POS" }).click();
  await expect(page).toHaveURL(/\/dashboard\/pos$/);

  await page.getByRole("button", { name: /P1 E2E/ }).click();
  await page.getByRole("button", { name: "Apri conto" }).click();
  await page.getByLabel("Coperti").fill("2");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Apri conto" })
    .click();
  await page.getByRole("button", { name: /^Bruschetta POS E2E/ }).click();
  await expect(page.getByText("1× Bruschetta POS E2E")).toBeVisible();

  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await page.getByRole("link", { name: "Apri la cucina" }).click();
  await expect(page).toHaveURL(/\/dashboard\/cucina$/);

  const pendingColumn = page.getByRole("region", { name: "In attesa" });
  const preparingColumn = page.getByRole("region", { name: "In preparazione" });
  const readyColumn = page.getByRole("region", { name: "Pronti al pass" });

  await expect(pendingColumn.getByText("Bruschetta POS E2E")).toBeVisible();
  await expect(pendingColumn.getByText("P1 E2E")).toBeVisible();
  await expect(pendingColumn.getByText("2 coperti", { exact: false })).toBeVisible();

  await pendingColumn
    .getByRole("button", { name: "Inizia preparazione" })
    .click();
  await expect(page.getByText("Preparazione avviata.")).toBeVisible();
  await expect(preparingColumn.getByText("Bruschetta POS E2E")).toBeVisible();
  await expect(pendingColumn.getByText("Nessuna riga")).toBeVisible();

  await preparingColumn.getByRole("button", { name: "Segna pronto" }).click();
  await expect(page.getByText("Riga pronta al pass.")).toBeVisible();
  await expect(readyColumn.getByText("Bruschetta POS E2E")).toBeVisible();
  await expect(preparingColumn.getByText("Nessuna riga")).toBeVisible();

  await readyColumn.getByRole("button", { name: "Segna servito" }).click();
  await expect(page.getByText("Riga servita.")).toBeVisible();
  await expect(page.getByText("Nessuna comanda in coda")).toBeVisible();

  expect(errors).toEqual([]);
});

test("dispositivi reali: quattro palmari, quinto rifiutato, revoca, sostituto e accesso col PIN", async ({
  page,
}) => {
  const errors = trackPageErrors(page);

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.newPassword);
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Gestisci i dispositivi" }).click();
  await expect(page).toHaveURL(/\/dashboard\/dispositivi$/);
  await expect(page.getByText("Palmari in uso: 0 di 4")).toBeVisible();

  let activationCode = "";

  for (const name of [
    "Palmare E2E 1",
    "Palmare E2E 2",
    "Palmare E2E 3",
    "Palmare E2E 4",
  ]) {
    await page.getByLabel("Nome dispositivo").fill(name);
    await page.getByRole("button", { name: "Crea e genera codice" }).click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Codice di attivazione" }),
    ).toBeVisible();
    if (name === "Palmare E2E 1") {
      activationCode = (await dialog.locator("p.font-mono").innerText()).trim();
      expect(activationCode).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    }
    await dialog.getByRole("button", { name: "Ho consegnato il codice" }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }

  await expect(page.getByText("Palmari in uso: 4 di 4")).toBeVisible();
  await expect(
    page.getByText("Codice di attivazione attivo fino alle").first(),
  ).toBeVisible();

  await page.getByLabel("Nome dispositivo").fill("Palmare E2E 5");
  await page.getByRole("button", { name: "Crea e genera codice" }).click();
  await expect(page.getByText(/revoca un dispositivo per sostituirlo/)).toBeVisible();
  await expect(page.getByText("Palmare E2E 5", { exact: true })).not.toBeVisible();

  const secondRow = page.getByRole("listitem").filter({ hasText: "Palmare E2E 2" });
  await expect(secondRow.getByText("In attesa di attivazione")).toBeVisible();
  await secondRow.getByRole("button", { name: "Revoca" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Revoca" })
    .click();
  await expect(
    page.getByText("Dispositivo revocato: lo slot è di nuovo disponibile."),
  ).toBeVisible();
  await expect(secondRow.getByText("Revocato")).toBeVisible();
  await expect(page.getByText("Palmari in uso: 3 di 4")).toBeVisible();

  await page.getByLabel("Nome dispositivo").fill("Palmare E2E 5");
  await page.getByRole("button", { name: "Crea e genera codice" }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Codice di attivazione" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Ho consegnato il codice" })
    .click();
  await expect(page.getByText("Palmare E2E 5", { exact: true })).toBeVisible();
  await expect(page.getByText("Palmari in uso: 4 di 4")).toBeVisible();

  await page.goto("/palmare");
  await page.getByLabel("Codice di attivazione").fill("ZZZZZZZZ");
  await page.getByRole("button", { name: "Attiva dispositivo" }).click();
  await expect(
    page.getByText("Codice non valido, scaduto o già utilizzato."),
  ).toBeVisible();

  await page.getByLabel("Codice di attivazione").fill(activationCode.toLowerCase());
  await page.getByRole("button", { name: "Attiva dispositivo" }).click();
  await expect(
    page.getByText("Nessun operatore con PIN attivo"),
  ).toBeVisible();

  await page.goto("/dashboard/dispositivi");
  const firstRow = page.getByRole("listitem").filter({ hasText: "Palmare E2E 1" });
  await expect(firstRow.getByText("Attivo")).toBeVisible();
  await expect(
    firstRow.getByText("In attesa di attivazione"),
  ).not.toBeVisible();

  const ownerPinRow = page
    .getByRole("listitem")
    .filter({ hasText: "Elena Prova" });
  await ownerPinRow.getByRole("button", { name: "Imposta PIN" }).click();
  const pinDialog = page.getByRole("dialog");
  await pinDialog.getByLabel("Nuovo PIN").fill("1357");
  await pinDialog.getByLabel("Conferma PIN").fill("1357");
  await pinDialog.getByRole("button", { name: "Salva PIN" }).click();
  await expect(pinDialog.getByText(/PIN salvato/)).toBeVisible();
  await pinDialog.getByRole("button", { name: "Chiudi" }).click();
  await expect(ownerPinRow.getByText("PIN attivo")).toBeVisible();

  await page.goto("/dashboard/sala");
  await page.getByRole("button", { name: "Nuovo tavolo" }).first().click();
  await page.getByLabel("Nome", { exact: true }).fill("P2 E2E");
  await page.getByLabel("Posti", { exact: true }).fill("4");
  await page
    .getByLabel("Area", { exact: true })
    .selectOption({ label: "Sala POS E2E" });
  await page.getByRole("button", { name: "Aggiungi tavolo" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "P2 E2E" }),
  ).toBeVisible();

  await page.goto("/palmare");
  await expect(
    page.getByRole("heading", { name: "Accesso operatore" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Elena Prova/ }).click();
  await page.getByLabel("PIN personale").fill("9999");
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page.getByText("PIN non valido.")).toBeVisible();

  await page.getByLabel("PIN personale").fill("1357");
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/palmare$/);
  await expect(page.getByText("Operatore: Elena Prova")).toBeVisible();
  await expect(page.getByText("Sala POS E2E")).toBeVisible();
  await expect(page.getByText("P1 E2E", { exact: true })).toBeVisible();
  await expect(page.getByText("P2 E2E", { exact: true })).toBeVisible();
  await expect(page.getByText(/^1 di \d+ tavoli occupati$/)).toBeVisible();

  await page.getByRole("button", { name: /P2 E2E/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: /Apri il conto/ }),
  ).toBeVisible();
  await dialog.getByLabel("Coperti").fill("2");
  await dialog.getByRole("button", { name: "Apri conto" }).click();
  await expect(page.getByText("Conto aperto: P2 E2E.")).toBeVisible();
  await expect(
    dialog.getByText("Nessun prodotto ancora ordinato."),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText(/^2 di \d+ tavoli occupati$/)).toBeVisible();

  await page.getByRole("button", { name: /P1 E2E/ }).click();
  await expect(
    dialog.getByRole("heading", { name: "Tavolo P1 E2E" }),
  ).toBeVisible();
  await expect(dialog.getByText("Servito")).toBeVisible();
  await dialog
    .getByRole("button", { name: "Aggiungi Bruschetta POS E2E" })
    .click();
  await dialog.getByRole("button", { name: /Invia in cucina/ }).click();
  await expect(page.getByText("Comanda inviata alla cucina.")).toBeVisible();
  await expect(dialog.getByText("In attesa")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /P1 E2E/ })).toContainText(
    "1 in cucina",
  );

  await page.getByRole("button", { name: "Esci" }).click();
  await expect(
    page.getByRole("heading", { name: "Accesso operatore" }),
  ).toBeVisible();

  expect(errors).toEqual([]);
});

test("prenotazioni e receptionist reali: disponibilità, conferma, annullamento e configurazione", async ({
  page,
}) => {
  const errors = trackPageErrors(page);
  const reservationDate = new Date(Date.now() + 86_400_000)
    .toISOString()
    .slice(0, 10);

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.newPassword);
  await page.getByRole("button", { name: "Accedi" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Apri le prenotazioni" }).click();
  await expect(page).toHaveURL(/\/dashboard\/prenotazioni$/);
  await expect(
    page.getByRole("heading", { name: restaurantName }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Nuova prenotazione" }).click();
  const createDialog = page.getByRole("dialog");
  await expect(
    createDialog.getByRole("heading", { name: "Nuova prenotazione" }),
  ).toBeVisible();

  await createDialog.getByLabel("Nome cliente").fill("Prenotazione E2E");
  await createDialog.getByLabel("Telefono").fill("+393331112222");
  await createDialog.getByLabel("Persone").fill("2");
  await createDialog.getByLabel("Data").fill(reservationDate);
  await createDialog.getByLabel("Ora").fill("20:00");
  await createDialog
    .getByRole("button", { name: "Registra prenotazione" })
    .click();

  await expect(page.getByText("Prenotazione registrata.")).toBeVisible();
  const reservationRow = page
    .getByRole("listitem")
    .filter({ hasText: "Prenotazione E2E" });
  await expect(reservationRow).toContainText("Confermata");
  await expect(reservationRow).toContainText("2 persone");

  await reservationRow.getByRole("button", { name: "Annulla" }).click();
  const cancelDialog = page.getByRole("dialog");
  await expect(
    cancelDialog.getByRole("heading", { name: "Annullare la prenotazione?" }),
  ).toBeVisible();
  await cancelDialog.getByRole("button", { name: "Annulla prenotazione" }).click();
  await expect(page.getByText("Prenotazione annullata.")).toBeVisible();
  await expect(reservationRow).toContainText("Annullata");

  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await page.getByRole("link", { name: "Configura il receptionist" }).click();
  await expect(page).toHaveURL(/\/dashboard\/receptionist$/);
  await expect(
    page.getByRole("heading", { name: restaurantName }),
  ).toBeVisible();

  await page.getByLabel("Abilita receptionist AI").check();
  await page
    .getByLabel("Numero chiamato", { exact: true })
    .fill(`+39${String(Date.now()).slice(-9)}`);
  await page.getByRole("button", { name: "Salva configurazione" }).click();
  await expect(
    page.getByText("Configurazione receptionist aggiornata."),
  ).toBeVisible();
  await expect(page.getByText("Receptionist attivo")).toBeVisible();

  await page.getByRole("tab", { name: "Orari" }).click();
  await page.getByRole("button", { name: "Aggiungi orari standard" }).click();
  await expect(page.getByText("Orari standard aggiunti.")).toBeVisible();
  await expect(page.getByLabel("Apertura")).toHaveCount(15);

  await page.getByRole("tab", { name: "Chiamate" }).click();
  await expect(page.getByText("Nessuna chiamata registrata.")).toBeVisible();
  await expect(page.getByText("Telefonia non collegata")).toBeVisible();

  expect(errors).toEqual([]);
});
