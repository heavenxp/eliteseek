import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icons";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="page-bg relative min-h-screen">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.07)_0%,transparent_65%)]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(180,120,40,0.05)_0%,transparent_65%)]" />
      </div>

      <header className="relative z-10 px-6 pt-6">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/[0.04]">
            <Icon name="diamond" className="h-3.5 w-3.5 text-gold" />
          </div>
          <span
            className="text-base tracking-[0.12em] text-foreground/70"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            ELITESEEK
          </span>
        </Link>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  );
}
