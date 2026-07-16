import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createGuestTicketCheckout } from "@/app/actions/guest-tickets";
import { VerifiedBadge } from "@/components/badges/verified-badge";
import { eventStart, eventEnd, EVENT_TZ } from "@/lib/event-time";
import { Icon } from "@/components/icons";

// ── Public event share page (PIVOT §2: the growth loop) ───────
// Viewable with NO account; the page itself is the social link preview.
// Reads via service role (events RLS is authenticated-only) and exposes
// only public-safe fields — never meeting links or invite codes.

type ShareEvent = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
  end_time: string;
  location: string | null;
  price: number;
  capacity: number | null;
  event_type: "physical" | "online";
  cover_image_url: string | null;
  creator_id: string;
  visibility: string;
};

async function getShareEvent(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const admin = createAdminClient();
  const { data: ev } = await admin
    .from("events")
    .select(
      "id, title, description, date, time, end_time, location, price, capacity, event_type, cover_image_url, creator_id, visibility"
    )
    .eq("id", id)
    .maybeSingle();
  if (!ev || ev.visibility !== "public") return null;
  return ev as ShareEvent;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ev = await getShareEvent(id);
  if (!ev) return { title: "Event — EliteSeek" };

  const when = eventStart(ev.date, ev.time).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: EVENT_TZ,
  });
  const description = [
    when,
    ev.event_type === "online" ? "Online" : ev.location,
    Number(ev.price) > 0 ? `$${Number(ev.price)}` : "Free",
    "Hosted on EliteSeek — everyone in the room is ID-verified.",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: `${ev.title} — EliteSeek`,
    description,
    openGraph: {
      title: ev.title,
      description,
      type: "website",
      ...(ev.cover_image_url
        ? { images: [{ url: ev.cover_image_url, width: 1200, height: 630, alt: ev.title }] }
        : {}),
    },
    twitter: {
      card: ev.cover_image_url ? "summary_large_image" : "summary",
      title: ev.title,
      description,
      ...(ev.cover_image_url ? { images: [ev.cover_image_url] } : {}),
    },
  };
}

export default async function EventSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ev = await getShareEvent(id);
  if (!ev) notFound();

  const admin = createAdminClient();
  const supabase = await createClient();

  const [{ data: { user } }, { data: hostProfile }, { data: creator }, membersRes] =
    await Promise.all([
      supabase.auth.getUser(),
      admin
        .from("host_profiles")
        .select("username, display_name, verification_tier")
        .eq("user_id", ev.creator_id)
        .maybeSingle(),
      admin.from("profiles").select("full_name, avatar_url").eq("id", ev.creator_id).single(),
      admin
        .from("event_members")
        .select("user_id", { count: "exact" })
        .eq("event_id", ev.id)
        .limit(6),
    ]);

  const memberCount = membersRes.count ?? 0;
  const memberIds = (membersRes.data ?? []).map((m) => m.user_id);
  const { data: memberProfiles } = memberIds.length
    ? await admin.from("profiles").select("id, full_name, avatar_url").in("id", memberIds)
    : { data: [] };

  const hostName = hostProfile?.display_name ?? creator?.full_name ?? "Host";
  const start = eventStart(ev.date, ev.time);
  const ended = eventEnd(ev.date, ev.end_time) < new Date();
  const spotsLeft = ev.capacity !== null ? Math.max(0, ev.capacity - memberCount) : null;
  const soldOut = spotsLeft === 0;
  const price = Number(ev.price);

  async function guestCheckout() {
    "use server";
    await createGuestTicketCheckout(id);
  }

  return (
    <div className="page-bg flex min-h-screen flex-col">
      {/* Minimal header */}
      <header className="px-6 pt-6">
        <Link href="/login" className="inline-flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/[0.04]">
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

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        {/* Cover */}
        <div className="mb-6 overflow-hidden rounded-3xl border border-white/[0.08]">
          {ev.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ev.cover_image_url} alt="" className="aspect-[1.91/1] w-full object-cover" />
          ) : (
            <div className="companion-placeholder aspect-[1.91/1] w-full" />
          )}
        </div>

        {/* Title + host */}
        <h1
          className="text-balance text-4xl font-light leading-tight text-foreground"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          {ev.title}
        </h1>

        <div className="mt-3 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/[0.06]">
            {creator?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creator.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm text-muted/60" style={{ fontFamily: "var(--font-cormorant)" }}>
                {hostName.charAt(0)}
              </span>
            )}
          </div>
          <span className="text-sm text-foreground/85" style={{ fontFamily: "var(--font-dm-sans)" }}>
            Hosted by {hostName}
          </span>
          {hostProfile && <VerifiedBadge tier={hostProfile.verification_tier} size="sm" />}
        </div>

        {/* Facts */}
        <div className="mt-6 space-y-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <Fact icon="calendar">
            {start.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: EVENT_TZ })}
            {" · "}
            {ev.time.slice(0, 5)}–{ev.end_time.slice(0, 5)}
          </Fact>
          <Fact icon="map-pin">{ev.event_type === "online" ? "Online event" : ev.location ?? "Location shared after joining"}</Fact>
          <Fact icon="users">
            {memberCount} going
            {spotsLeft !== null && !ended && !soldOut && spotsLeft <= 5 && (
              <span className="text-gold"> · {spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left</span>
            )}
          </Fact>
          {price > 0 && <Fact icon="currency-dollar">${price} — held by Stripe until 48h after the event</Fact>}
        </div>

        {/* Attendee avatars — the verified room */}
        {memberCount > 0 && (
          <div className="mt-4 flex items-center gap-2">
            <div className="flex -space-x-2">
              {(memberProfiles ?? []).slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-[#080810] bg-white/[0.08]"
                  title={p.full_name}
                >
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-muted/60">{p.full_name?.charAt(0)}</span>
                  )}
                </div>
              ))}
            </div>
            <span className="text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Every attendee is ID-verified
            </span>
          </div>
        )}

        {/* Description */}
        {ev.description && (
          <p
            className="mt-6 whitespace-pre-line text-sm leading-relaxed text-foreground/75"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {ev.description}
          </p>
        )}

        {/* CTA */}
        <div className="mt-8">
          {ended ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-3.5 text-center text-sm text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
              This event has ended
            </div>
          ) : soldOut ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-3.5 text-center text-sm text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Sold out
            </div>
          ) : user ? (
            <Link
              href={`/events/${ev.id}${price > 0 ? "" : "?join=1"}`}
              className="btn-gold block w-full rounded-2xl py-3.5 text-center text-sm font-semibold"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {price > 0 ? `Get ticket · $${price}` : "Join event"}
            </Link>
          ) : price > 0 ? (
            <form action={guestCheckout}>
              <button
                type="submit"
                className="btn-gold w-full rounded-2xl py-3.5 text-sm font-semibold"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Get ticket · ${price}
              </button>
              <p className="mt-2 text-center text-[11px] text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Pay first — you&apos;ll create your account after checkout.
              </p>
            </form>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(`/events/${ev.id}?join=1`)}`}
              className="btn-gold block w-full rounded-2xl py-3.5 text-center text-sm font-semibold"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Join event
            </Link>
          )}
        </div>
      </main>

      {/* Legal footer (required on public surfaces) */}
      <footer className="px-6 pb-8 text-center">
        <p className="text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
          © 2026 EliteSeek Pty Ltd · All hosts are age-verified (18+) under the Australian Online Safety Act.
        </p>
      </footer>
    </div>
  );
}

function Fact({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0 text-muted/40" />
      <span className="text-sm text-foreground/85" style={{ fontFamily: "var(--font-dm-sans)" }}>
        {children}
      </span>
    </div>
  );
}
