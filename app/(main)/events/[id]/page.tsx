import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEvent, joinEvent, createEventTicketCheckout } from "@/app/actions/events";
import { ShareLinkButton } from "@/components/events/share-link-button";
import { RefundTimeline } from "@/components/events/refund-timeline";
import { eventStart } from "@/lib/event-time";
import { decayRefundFraction } from "@/lib/cancellation";
import { CancelTicketButton } from "@/components/events/cancel-ticket-button";
import { EventChat } from "./event-chat";
import { EventActions } from "./event-actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getEvent(id);
  return { title: result ? `${result.event.title} — EliteSeek` : "Event — EliteSeek" };
}

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ join?: string }>;
}) {
  const { join } = await searchParams;
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await getEvent(id);
  if (!result) notFound();

  const { event, members, inviteCodes, isMember, isCreator, accessDenied, meetingLink } = result;

  // Arrived from the public share page with intent to join a free event
  if (join === "1" && !isMember && Number(event.price) === 0) {
    const joined = await joinEvent(id);
    if (!joined?.error) redirect(`/events/${id}?joined=1`);
  }
  const spotsLeft = event.capacity !== null ? Math.max(0, event.capacity - members.length) : null;
  const isFull = spotsLeft === 0;

  // Fetch current user's profile for chat
  const admin = createAdminClient();
  const { data: myProfile } = await admin
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  const eventDate = new Date(`${event.date}T${event.time}`);
  const displayedMembers = members.slice(0, 8);
  const extra = members.length - displayedMembers.length;

  // Private + no access
  if (accessDenied) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
            <svg className="h-7 w-7 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
        </div>
        <h1 className="text-lg font-bold tracking-tight text-foreground">
          {event.title}
        </h1>
        <p className="mt-2 text-sm text-muted/50">
          This is a private event. You need an invite code to join.
        </p>
        <Link
          href="/events/join"
          className="mt-6 inline-block rounded-xl bg-gold px-6 py-2.5 text-sm font-semibold text-black hover:bg-gold-light transition-colors"

        >
          Enter Invite Code
        </Link>
        <Link
          href="/events"
          className="mt-3 block text-sm text-white/30 hover:text-white/60 transition-colors"

        >
          ← Back to events
        </Link>
      </div>
    );
  }

  // Join action (for public events, non-members): paid → escrow checkout
  async function handleJoin() {
    "use server";
    const result = await joinEvent(id);
    if (result?.error === "PAID_EVENT") {
      await createEventTicketCheckout(id); // redirects to Stripe
    }
    redirect(`/events/${id}`);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-4 md:px-6 md:py-6">
      {/* Back */}
      <Link
        href="/events"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors"

      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Events
      </Link>

      {/* Cover */}
      <div className="relative h-56 w-full overflow-hidden rounded-2xl mb-6 bg-white/[0.04]">
        {event.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.cover_image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-7xl font-light text-gold/15">
              {event.title.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-5 right-5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white">
              {event.title}
            </h1>
            {event.visibility === "private" && (
              <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-white/50">
                Private
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="mb-6 grid gap-2">
        <div className="flex items-center gap-2.5 text-sm text-muted/60">
          <svg className="h-4 w-4 text-muted/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          {eventDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          {" · "}
          {eventDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </div>
        {event.location && (
          <div className="flex items-center gap-2.5 text-sm text-muted/60">
            <svg className="h-4 w-4 text-muted/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            {event.location}
          </div>
        )}
        {event.description && (
          <p className="mt-1 text-sm text-muted/50 leading-relaxed">
            {event.description}
          </p>
        )}
      </div>

      {/* Attendees */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-4">
        <p className="mb-3 text-[11px] uppercase tracking-[0.1em] text-white/30">
          Attendees · {members.length}
        </p>
        <div className="flex flex-wrap gap-2">
          {displayedMembers.map((m) => (
            <div key={m.id} className="flex items-center gap-1.5">
              <div className="h-8 w-8 rounded-full overflow-hidden bg-white/[0.04] border border-white/10 flex items-center justify-center">
                {m.profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] font-medium text-gold/60">
                    {(m.profile?.full_name ?? "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {m.role === "host" && (
                <span className="text-[10px] text-gold/50">Host</span>
              )}
            </div>
          ))}
          {extra > 0 && (
            <div className="flex h-8 items-center px-2 rounded-full bg-white/[0.04] text-[11px] text-white/30">
              +{extra}
            </div>
          )}
        </div>
      </div>

      {/* Refund timer (paid events) + ticket-holder cancel */}
      {Number(event.price) > 0 && (
        <div className="mb-4">
          <RefundTimeline start={eventStart(event.date, event.time)} />
          {isMember && !isCreator && (
            <CancelTicketButton
              eventId={event.id}
              refundPctNow={Math.round(
                decayRefundFraction(
                  (eventStart(event.date, event.time).getTime() - Date.now()) / 3600_000
                ) * 100
              )}
            />
          )}
        </div>
      )}

      {/* Share (public events) */}
      {event.visibility === "public" && (
        <div className="mb-4 flex justify-end">
          <ShareLinkButton eventId={event.id} />
        </div>
      )}

      {/* Join button (non-members, public events) */}
      {!isMember && event.visibility === "public" && (
        <form action={handleJoin} className="mb-6">
          <button
            type="submit"
            disabled={isFull}
            className="w-full rounded-xl bg-gold py-3 text-sm font-semibold text-black hover:bg-gold-light transition-colors disabled:cursor-not-allowed disabled:opacity-40"

          >
            {isFull
              ? "Sold out"
              : event.price > 0
                ? `Get ticket · $${Number(event.price)}`
                : "Join Event"}
          </button>
          {!isFull && spotsLeft !== null && spotsLeft <= 5 && (
            <p className="mt-2 text-center text-[11px] text-muted/50">
              {spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left
            </p>
          )}
        </form>
      )}

      {/* Meeting link — members only (RLS enforces; this just renders) */}
      {isMember && meetingLink && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="mb-1 text-[11px] uppercase tracking-[0.1em] text-white/30">
            Meeting link
          </p>
          <a href={meetingLink} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-gold hover:text-gold-light">
            {meetingLink}
          </a>
        </div>
      )}

      {/* Invite codes (creator of private event) */}
      {isCreator && event.visibility === "private" && inviteCodes.length > 0 && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="mb-3 text-[11px] uppercase tracking-[0.1em] text-white/30">
            Invite Codes
          </p>
          <div className="flex flex-wrap gap-2">
            {inviteCodes.map((ic) => (
              <div
                key={ic.id}
                className={[
                  "rounded-lg border px-3 py-1.5 font-mono text-xs tracking-widest",
                  ic.uses_count >= ic.max_uses
                    ? "border-white/[0.05] text-white/20 line-through"
                    : "border-white/10 text-gold/70",
                ].join(" ")}
              >
                {ic.code}
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-white/20">
            Share these codes with your guests. Each code is single-use.
          </p>
        </div>
      )}

      {/* Delete / Leave (members only) */}
      {isMember && (
        <EventActions eventId={id} isCreator={isCreator} />
      )}

      {/* Chat (members only) */}
      {isMember && (
        <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.02)] overflow-hidden">
          <EventChat
            eventId={id}
            currentUserId={user.id}
            currentUserName={myProfile?.full_name ?? "You"}
            currentUserAvatar={(myProfile?.avatar_url as string | null) ?? null}
          />
        </div>
      )}
    </div>
  );
}
