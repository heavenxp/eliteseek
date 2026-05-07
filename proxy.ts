import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Rewrite /@username → /host/{username} before any auth checks
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/@") && pathname.length > 2) {
    const username = pathname.slice(2).split("/")[0];
    const url = request.nextUrl.clone();
    url.pathname = `/host/${username}`;
    return NextResponse.rewrite(url);
  }

  // Refresh the session — keeps it alive without a manual refresh
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect authenticated users away from auth pages
  if (user && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/browse", request.url));
  }

  // Protected routes — redirect unauthenticated users to login
  const protectedPrefixes = ["/browse", "/booking", "/bookings", "/content", "/gifts", "/messages", "/membership", "/account", "/onboarding", "/companion", "/admin", "/payment"];
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!user && isProtected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
