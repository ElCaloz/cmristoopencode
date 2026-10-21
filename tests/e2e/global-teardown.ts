const ORGANIZATION_SLUG_FILTER = "trattoria-e2e-*";
const USER_EMAIL_PATTERN = /^e2e-[a-z0-9-]+@example\.test$/i;
const MAX_USER_PAGES = 50;
const USERS_PER_PAGE = 100;

function loadEnvironment() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
      return;
    } catch {
      continue;
    }
  }
}

async function adminRequest(
  url: string,
  serviceKey: string,
  method = "GET",
): Promise<unknown> {
  const response = await fetch(url, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  });

  if (!response.ok) {
    throw new Error(`${method} ${url} -> HTTP ${response.status}`);
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as unknown) : null;
}

async function cleanup() {
  loadEnvironment();

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  )?.trim();

  if (!baseUrl || !serviceKey) {
    console.warn(
      "[e2e teardown] Pulizia dati di prova saltata: imposta SUPABASE_SERVICE_ROLE_KEY in .env.local (valore da `npx supabase status`).",
    );
    return;
  }

  try {
    const rest = `${baseUrl}/rest/v1`;
    const auth = `${baseUrl}/auth/v1`;

    const organizations = (await adminRequest(
      `${rest}/organizations?select=id&slug=like.${ORGANIZATION_SLUG_FILTER}`,
      serviceKey,
    )) as { id: string }[] | null;
    const organizationIds = (organizations ?? []).map((row) => row.id);

    if (organizationIds.length > 0) {
      const idFilter = `in.(${organizationIds.join(",")})`;

      const restaurants = (await adminRequest(
        `${rest}/restaurants?select=id&organization_id=${idFilter}`,
        serviceKey,
      )) as { id: string }[] | null;
      const restaurantIds = (restaurants ?? []).map((row) => row.id);

      if (restaurantIds.length > 0) {
        const restaurantFilter = `in.(${restaurantIds.join(",")})`;
        await adminRequest(
          `${rest}/payments?restaurant_id=${restaurantFilter}`,
          serviceKey,
          "DELETE",
        );
        await adminRequest(
          `${rest}/orders?restaurant_id=${restaurantFilter}`,
          serviceKey,
          "DELETE",
        );
      }

      await adminRequest(
        `${rest}/audit_logs?organization_id=${idFilter}`,
        serviceKey,
        "DELETE",
      );
      await adminRequest(
        `${rest}/organizations?id=${idFilter}`,
        serviceKey,
        "DELETE",
      );
    }

    const candidateUsers: { id: string; email: string }[] = [];

    for (let page = 1; page <= MAX_USER_PAGES; page += 1) {
      const payload = (await adminRequest(
        `${auth}/admin/users?page=${page}&per_page=${USERS_PER_PAGE}`,
        serviceKey,
      )) as { users?: { id: string; email?: string | null }[] } | null;
      const users = payload?.users ?? [];

      for (const user of users) {
        if (user.email && USER_EMAIL_PATTERN.test(user.email)) {
          candidateUsers.push({ id: user.id, email: user.email });
        }
      }

      if (users.length < USERS_PER_PAGE) break;
    }

    for (const user of candidateUsers) {
      await adminRequest(`${auth}/admin/users/${user.id}`, serviceKey, "DELETE");
    }

    if (organizationIds.length > 0 || candidateUsers.length > 0) {
      console.log(
        `[e2e teardown] Rimossi ${organizationIds.length} organizzazioni e ${candidateUsers.length} utenti di prova.`,
      );
    }
  } catch (error) {
    console.warn(
      "[e2e teardown] Pulizia dati di prova non riuscita:",
      error instanceof Error ? error.message : error,
    );
  }
}

export default cleanup;
