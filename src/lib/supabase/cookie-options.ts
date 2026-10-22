import type { CookieOptions } from "@supabase/ssr";

/**
 * I cookie di sessione Supabase sono usati solo dal server (proxy e Server
 * Components/Actions): possono quindi essere HttpOnly, impedendo a uno script
 * iniettato di leggerli. `Secure` è attivo solo in produzione per non rompere
 * lo sviluppo su http://localhost.
 */
export const supabaseCookieOptions: CookieOptions = {
  path: "/",
  sameSite: "lax",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};
