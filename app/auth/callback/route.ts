import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/browse";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  // For Google OAuth sign-ins we don't have a `next` param — detect new users
  // by checking if their profile was created in the last 2 minutes
  if (next === "/browse") {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, created_at")
        .eq("id", user.id)
        .single();

      if (profile) {
        const isNewUser =
          new Date(profile.created_at) > new Date(Date.now() - 2 * 60 * 1000);
        if (isNewUser) {
          return NextResponse.redirect(
            `${origin}/onboarding/${profile.role}`
          );
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
