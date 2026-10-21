import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type OtpType = Parameters<
  Awaited<ReturnType<typeof createClient>>["auth"]["verifyOtp"]
>[0]["type"];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeNextPath(url.searchParams.get("next"), "/dashboard");
  const failureTarget = next === "/reimposta-password" ? "/recupera-password" : "/login";

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL(`${failureTarget}?reason=config`, request.url),
    );
  }

  if (url.searchParams.get("error")) {
    return NextResponse.redirect(
      new URL(`${failureTarget}?reason=link-invalid`, request.url),
    );
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`${failureTarget}?reason=link-invalid`, request.url),
      );
    }
    return NextResponse.redirect(new URL(next, request.url));
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as OtpType,
    });
    if (error) {
      return NextResponse.redirect(
        new URL(`${failureTarget}?reason=link-invalid`, request.url),
      );
    }
    return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(
    new URL(`${failureTarget}?reason=link-invalid`, request.url),
  );
}
