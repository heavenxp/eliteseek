import Link from "next/link";
import { Icon } from "@/components/icons";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-bg relative flex min-h-screen flex-col">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.07)_0%,transparent_65%)]" />
        <div className="absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(180,120,40,0.05)_0%,transparent_65%)]" />
      </div>

      {/* Top nav */}
      <header className="relative z-10 px-6 pt-6">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(212,175,55,0.35)] bg-[rgba(212,175,55,0.08)]">
            <Icon name="diamond" className="h-3.5 w-3.5 text-gold" />
          </div>
          <span
            className="text-base tracking-[0.12em] text-foreground/80"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            ELITESEEK
          </span>
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  );
}
