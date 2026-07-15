import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icons";
import { ClientBookingActions } from "./client-booking-actions";
import type { BookingStatus, BookingType, EscrowStatus } from "@/lib/database.types";

export const metadata = { title: "My Bookings — EliteSeek" };

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Request sent",
  confirmed: "Confirmed",
  cancelled: "Declined",
  completed: "Completed",
  disputed: "Disputed",
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-[rgba(251,191,36,0.12)] text-amber-400",
  confirmed: "bg-[rgba(52,211,153,0.1)] text-emerald-400",
  cancelled: "bg-[rgba(248,113,113,0.1)] text-red-400/80",
  completed: "bg-[rgba(212,175,55,0.1)] text-gold",
  disputed: "bg-[rgba(248,113,113,0.1)] text-red-400",
};

const TYPE_LABELS: Record<BookingType, string> = {
  dinner: "Dinner",
  event: "Event",
  travel: "Travel",
  social: "Social",
  virtual: "Virtual",
};

type BookingRow = {
  id: string;
  booking_type: BookingType;
  status: BookingStatus;
  escrow_status: EscrowStatus;
  release_at: string | null;
  cancellation_policy: string | null;
  scheduled_at: string;
  duration_hours: number;
  location: string | null;
  notes: string | null;
  total_amount: number;
  created_at: string;
  host: {
    display_name: string;
    username: string | null;
    id: string;
  } | null;
};

export default async function ClientBookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: raw } = await supabase
    .from("bookings")
    .select(`
      id,
      booking_type,
      status,
      escrow_status,
      release_at,
      cancellation_policy,
      scheduled_at,
      duration_hours,
      location,
      notes,
      total_amount,
      created_at,
      host:companion_profiles!companion_id (
        id,
        display_name,
        username
      )
    `)
    .eq("client_id", user.id)
    .order("scheduled_at", { ascending: false });

  const bookings = (raw ?? []).map((b) => ({
    ...b,
    host: Array.isArray(b.host) ? b.host[0] ?? null : b.host,
  })) as BookingRow[];

  const upcoming = bookings.filter(
    (b) => (b.status === "pending" || b.status === "confirmed") && new Date(b.scheduled_at) >= new Date()
  );
  const past = bookings.filter(
    (b) =>
      (b.status === "completed" || b.status === "confirmed") &&
      new Date(b.scheduled_at) < new Date()
  );
  const declined = bookings.filter((b) => b.status === "cancelled");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
            My Bookings
          </h1>
          <p className="mt-1 text-sm text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {upcoming.length} upcoming · {past.length} past
          </p>
        </div>
        <Link
          href="/events"
          className="rounded-xl border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.06)] px-4 py-2 text-sm text-[#d4af37]/80 hover:bg-[rgba(212,175,55,0.1)] hover:text-[#d4af37] transition-colors"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Events
        </Link>
      </div>

      {bookings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <Section title="Upcoming" count={upcoming.length}>
              {upcoming.map((b) => <BookingCard key={b.id} booking={b} />)}
            </Section>
          )}
          {past.length > 0 && (
            <Section title="Past" count={past.length} faded>
              {past.map((b) => <BookingCard key={b.id} booking={b} />)}
            </Section>
          )}
          {declined.length > 0 && (
            <Section title="Declined" count={declined.length} faded>
              {declined.map((b) => <BookingCard key={b.id} booking={b} />)}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
  faded = false,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  faded?: boolean;
}) {
  return (
    <section className={faded ? "opacity-60" : ""}>
      <p className="mb-3 text-xs uppercase tracking-[0.1em] text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
        {title} · {count}
      </p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function BookingCard({ booking }: { booking: BookingRow }) {
  const date = new Date(booking.scheduled_at);
  const profileHref = booking.host
    ? booking.host.username
      ? `/profile/${booking.host.username}`
      : `/companion/${booking.host.id}`
    : "#";

  return (
    <div className="rounded-2xl border border-[rgba(212,175,55,0.1)] bg-[rgba(255,255,255,0.02)] p-4 transition-all hover:border-[rgba(212,175,55,0.2)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-foreground/90" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {TYPE_LABELS[booking.booking_type]} ·{" "}
              <Link href={profileHref} className="text-gold/70 hover:text-gold">
                {booking.host?.display_name ?? "Elite Host"}
              </Link>
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] ${STATUS_COLORS[booking.status]}`}
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {STATUS_LABELS[booking.status]}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
            <span className="flex items-center gap-1">
              <Icon name="calendar" className="h-3 w-3 text-gold/40" />
              {date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              {" · "}
              {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="flex items-center gap-1">
              <Icon name="clock" className="h-3 w-3 text-gold/40" />
              {booking.duration_hours}h
            </span>
            {booking.location && (
              <span className="flex items-center gap-1">
                <Icon name="map-pin" className="h-3 w-3 text-gold/40" />
                {booking.location}
              </span>
            )}
          </div>
          {booking.status === "pending" && (
            <p className="mt-2 text-xs text-amber-400/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Awaiting Elite Host response — usually within 24 hours
            </p>
          )}
          {booking.status === "confirmed" && booking.escrow_status === "unpaid" && (
            <p className="mt-2 text-xs text-emerald-400/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Confirmed — pay now to secure it. Stripe holds your payment until 48h after completion.
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          <p className="text-lg font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
            ${booking.total_amount.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
            total
          </p>
        </div>
      </div>

      {["pending", "confirmed", "completed", "disputed"].includes(booking.status) && (
        <div className="mt-4 border-t border-[rgba(255,255,255,0.05)] pt-4">
          <ClientBookingActions
            bookingId={booking.id}
            status={booking.status}
            escrowStatus={booking.escrow_status}
            releaseAt={booking.release_at}
            scheduledAt={booking.scheduled_at}
            cancellationPolicy={booking.cancellation_policy}
          />
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.05)]">
        <Icon name="calendar" className="h-6 w-6 text-gold/40" />
      </div>
      <p className="text-xl font-light text-foreground/60" style={{ fontFamily: "var(--font-cormorant)" }}>
        No bookings yet
      </p>
      <p className="text-sm text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
        Browse experiences and send your first booking request.
      </p>
      <Link
        href="/browse/experiences"
        className="btn-gold mt-2 rounded-xl px-6 py-2.5 text-sm"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        Browse Experiences
      </Link>
    </div>
  );
}
