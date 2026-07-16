import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icons";
import { BookingActions } from "./booking-actions";
import { SafetyActions, RateClientForm } from "./safety-actions";
import type { BookingStatus, BookingType, EscrowStatus } from "@/lib/database.types";

export const metadata = { title: "Bookings — EliteSeek" };

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Declined",
  completed: "Completed",
  disputed: "Disputed",
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-[rgba(251,191,36,0.12)] text-amber-400",
  confirmed: "bg-[rgba(52,211,153,0.1)] text-emerald-400",
  cancelled: "bg-[rgba(248,113,113,0.1)] text-red-400/80",
  completed: "bg-white/[0.07] text-gold",
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
  client_id: string;
  booking_type: BookingType;
  status: BookingStatus;
  escrow_status: EscrowStatus;
  checkin_at: string | null;
  checkout_at: string | null;
  scheduled_at: string;
  duration_hours: number;
  location: string | null;
  notes: string | null;
  total_amount: number;
  companion_earnings: number;
  created_at: string;
  client: { full_name: string } | null;
  clientRating?: { average: number | null; count: number };
  alreadyRated?: boolean;
};

export default async function CompanionBookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: companion } = await supabase
    .from("host_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!companion) redirect("/browse");

  const { data: raw } = await supabase
    .from("bookings")
    .select(`
      id,
      client_id,
      booking_type,
      status,
      escrow_status,
      checkin_at,
      checkout_at,
      scheduled_at,
      duration_hours,
      location,
      notes,
      total_amount,
      companion_earnings,
      created_at,
      client:profiles!client_id (full_name)
    `)
    .eq("companion_id", companion.id)
    .order("scheduled_at", { ascending: true });

  const bookings = (raw ?? []).map((b) => ({
    ...b,
    client: Array.isArray(b.client) ? b.client[0] ?? null : b.client,
  })) as BookingRow[];

  // Client ratings (from other hosts) — shown BEFORE accepting a request —
  // plus which completed bookings this host has already rated.
  const clientIds = [...new Set(bookings.map((b) => b.client_id))];
  const bookingIds = bookings.map((b) => b.id);
  const [{ data: reviews }, { data: ownReviews }] = await Promise.all([
    clientIds.length
      ? supabase.from("client_reviews").select("client_id, rating").in("client_id", clientIds)
      : Promise.resolve({ data: [] as { client_id: string; rating: number }[] }),
    bookingIds.length
      ? supabase.from("client_reviews").select("booking_id").in("booking_id", bookingIds)
      : Promise.resolve({ data: [] as { booking_id: string }[] }),
  ]);
  const ratingMap = new Map<string, { sum: number; count: number }>();
  for (const r of reviews ?? []) {
    const e = ratingMap.get(r.client_id) ?? { sum: 0, count: 0 };
    e.sum += r.rating; e.count += 1;
    ratingMap.set(r.client_id, e);
  }
  const ratedBookings = new Set((ownReviews ?? []).map((r) => r.booking_id));
  for (const b of bookings) {
    const e = ratingMap.get(b.client_id);
    b.clientRating = e ? { average: +(e.sum / e.count).toFixed(1), count: e.count } : { average: null, count: 0 };
    b.alreadyRated = ratedBookings.has(b.id);
  }

  const pending = bookings.filter((b) => b.status === "pending");
  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" && new Date(b.scheduled_at) >= new Date()
  );
  const past = bookings.filter(
    (b) => b.status === "completed" || (b.status === "confirmed" && new Date(b.scheduled_at) < new Date())
  );
  const declined = bookings.filter((b) => b.status === "cancelled");

  const totalEarnings = bookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + b.companion_earnings, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Booking Requests
          </h1>
          <p className="mt-1 text-sm text-muted/50">
            {pending.length} pending · {upcoming.length} confirmed upcoming
          </p>
        </div>
        <Link
          href="/events"
          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-gold/80 hover:bg-white/[0.07] hover:text-gold transition-colors"

        >
          Events
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Pending", value: pending.length, color: "text-amber-400" },
          { label: "Confirmed", value: upcoming.length, color: "text-emerald-400" },
          { label: "Completed", value: bookings.filter((b) => b.status === "completed").length, color: "text-gold" },
          { label: "Earnings", value: `$${totalEarnings.toLocaleString()}`, color: "text-foreground/80" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-4">
            <p className={`text-lg font-bold tracking-tight ${stat.color}`}>
              {stat.value}
            </p>
            <p className="mt-0.5 text-xs text-muted/50">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {bookings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <Section title="Awaiting Your Response" count={pending.length}>
              {pending.map((b) => (
                <BookingCard key={b.id} booking={b} showActions />
              ))}
            </Section>
          )}
          {upcoming.length > 0 && (
            <Section title="Confirmed & Upcoming" count={upcoming.length}>
              {upcoming.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </Section>
          )}
          {past.length > 0 && (
            <Section title="Past Bookings" count={past.length} faded>
              {past.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </Section>
          )}
          {declined.length > 0 && (
            <Section title="Declined" count={declined.length} faded>
              {declined.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
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
      <p className="mb-3 text-xs uppercase tracking-[0.1em] text-muted/40">
        {title} · {count}
      </p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function BookingCard({
  booking,
  showActions = false,
}: {
  booking: BookingRow;
  showActions?: boolean;
}) {
  const date = new Date(booking.scheduled_at);
  const clientName = booking.client?.full_name ?? "Anonymous";

  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-foreground/90">
              {TYPE_LABELS[booking.booking_type]} with {clientName.split(" ")[0]}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] ${STATUS_COLORS[booking.status]}`}

            >
              {STATUS_LABELS[booking.status]}
            </span>
            {booking.clientRating && (
              booking.clientRating.count > 0 ? (
                <span className="flex items-center gap-1 rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-gold/80">
                  <Icon name="star" className="h-2.5 w-2.5" />
                  {booking.clientRating.average} · {booking.clientRating.count} host review{booking.clientRating.count !== 1 ? "s" : ""}
                </span>
              ) : (
                <span className="rounded-full bg-[rgba(255,255,255,0.05)] px-2 py-0.5 text-[10px] text-muted/40">
                  New client
                </span>
              )
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted/50">
            <span className="flex items-center gap-1">
              <Icon name="calendar" className="h-3 w-3 text-muted/40" />
              {date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              {" · "}
              {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="flex items-center gap-1">
              <Icon name="clock" className="h-3 w-3 text-muted/40" />
              {booking.duration_hours}h
            </span>
            {booking.location && (
              <span className="flex items-center gap-1">
                <Icon name="map-pin" className="h-3 w-3 text-muted/40" />
                {booking.location}
              </span>
            )}
          </div>
          {booking.notes && (
            <p className="mt-2 text-xs italic text-muted/40">
              &ldquo;{booking.notes}&rdquo;
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <p className="text-base font-semibold text-foreground">
            ${booking.companion_earnings.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted/40">
            your earnings
          </p>
        </div>
      </div>

      {showActions && (
        <div className="mt-4 border-t border-[rgba(255,255,255,0.05)] pt-4">
          <BookingActions bookingId={booking.id} />
        </div>
      )}

      {booking.status === "confirmed" && (
        <div className="mt-4 border-t border-[rgba(255,255,255,0.05)] pt-4">
          <SafetyActions
            bookingId={booking.id}
            escrowStatus={booking.escrow_status}
            checkinAt={booking.checkin_at}
            checkoutAt={booking.checkout_at}
          />
        </div>
      )}

      {booking.status === "completed" && !booking.alreadyRated && (
        <div className="mt-4 border-t border-[rgba(255,255,255,0.05)] pt-4">
          <RateClientForm bookingId={booking.id} />
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
        <Icon name="calendar" className="h-6 w-6 text-muted/40" />
      </div>
      <p className="text-base font-semibold text-foreground/60">
        No bookings yet
      </p>
      <p className="text-sm text-muted/40">
        Booking requests will appear here once clients discover your profile.
      </p>
    </div>
  );
}
