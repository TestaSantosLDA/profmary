import { createServerClient, type CookieOptions } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Path prefixes (locale stripped) that require an authenticated session.
const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/book", "/admin"];

function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1);
    }
  }
  return pathname;
}

export default async function proxy(request: NextRequest) {
  // Refresh the Supabase session BEFORE building the intl response, mutating
  // request.cookies so the render sees the fresh token. Otherwise every
  // Server Component retries the refresh with the already-consumed token,
  // which can trip Supabase's reuse detection and revoke the whole session —
  // phones always arrive with an expired token, so they get hit hardest.
  const refreshedCookies: {
    name: string;
    value: string;
    options: CookieOptions;
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          refreshedCookies.push(...cookiesToSet);
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = stripLocale(request.nextUrl.pathname);
  const needsAuth = PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );

  if (needsAuth && !user) {
    const locale =
      routing.locales.find(
        (l) =>
          request.nextUrl.pathname === `/${l}` ||
          request.nextUrl.pathname.startsWith(`/${l}/`)
      ) ?? routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    refreshedCookies.forEach(({ name, value, options }) =>
      redirectResponse.cookies.set(name, value, options)
    );
    return redirectResponse;
  }

  // Built from the already-updated request, so the forwarded headers carry
  // the refreshed token into the render.
  const response = intlMiddleware(request);
  refreshedCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  );
  return response;
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
