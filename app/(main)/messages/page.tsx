import Link from "next/link";
import { Icon } from "@/components/icons";

export default function MessagesPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
        <Icon name="message" className="h-7 w-7 text-muted/40" />
      </div>
      <p className="text-xl font-light text-foreground/60" style={{ fontFamily: "var(--font-cormorant)" }}>
        Your messages
      </p>
      <p className="text-sm text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
        Select a conversation or start one from a host&apos;s profile.
      </p>
      <Link
        href="/browse"
        className="btn-gold mt-2 rounded-xl px-6 py-2.5 text-sm"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        Browse hosts
      </Link>
    </div>
  );
}
