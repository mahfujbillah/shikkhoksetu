import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js 16 Proxy (formerly Middleware).
 * 1. Refreshes the Supabase auth session cookie on every navigation.
 * 2. Optimistic redirect of signed-out visitors away from private areas.
 * Real authorisation is enforced again inside every Server Action / page (never trust the proxy alone).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Local development with an impersonated seeded user — no Supabase round-trip.
  if (process.env.NODE_ENV === "development" && process.env.DEV_AUTH_USER_ID) return response;

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPrivate = path.startsWith("/dashboard") || path.startsWith("/admin") || path === "/post-tuition";

  if (!data.user && isPrivate) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Skip static assets, images and the payment/LMS webhooks (they authenticate themselves).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/payments|api/lms|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)"],
};
