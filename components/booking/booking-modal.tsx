"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { createBookingRequest } from "@/app/actions/bookings";
import { createBookingDepositCheckout } from "@/app/actions/stripe";
import type { AvailabilityPost, AvailabilityCategory } from "@/lib/database.types";

const BOOKING_TYPE_MAP: Record<AvailabilityCategory, string> = {
  lunch: "social",
  dinner: "dinner",
  private_dining: "dinner",
  business_coaching: "social",
  social_coaching: "social",
  travel_companion: "travel",
  event_plus_one: "event",
  yacht_luxury: "event",
  gallery_art: "event",
  weekend_getaway: "travel",
};

type Props = {
  companionId: string;
  companionName: string;
  post?: AvailabilityPost;
  hourlyRate?: number | null;
  onClose: () => void;
  onSuccess: () => void;
  stripeConfigured?: boolean;
};

const DURATIONS = [1, 2, 3, 4, 6, 8];

export function BookingModal({ companionId, companionName, post, hourlyRate, onClose, onSuccess, stripeConfigured = false }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [date, setDate] = useState(post?.date_from ? post.date_from.slice(0, 16) : "");
  const [duration, setDuration] = useState(2);
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState(post?.location_city ?? "");
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [stripePending, startStripeTransition] = useTransition();

  const rate = post?.price ?? hourlyRate ?? 0;
  const totalAmount = post ? post.price : rate * duration;

  const bookingType = post
    ? BOOKING_TYPE_MAP[post.category]
    : "dinner";

  const [state, formAction, isPending] = useActionState(createBookingRequest, null);

  useEffect(() => {
    if (state?.success && state.bookingId) {
      if (stripeConfigured) {
        // Redirect to Stripe deposit checkout
        setStripeError(null);
        startStripeTransition(async () => {
          const result = await createBookingDepositCheckout(state.bookingId!);
          if (result?.error) setStripeError(result.error);
        });
      } else {
        setStep(3);
        setTimeout(onSuccess, 2000);
      }
    } else if (state?.success) {
      setStep(3);
      setTimeout(onSuccess, 2000);
    }
  }, [state?.success, state?.bookingId, onSuccess, stripeConfigured]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg overflow-hidden rounded-t-2xl border border-white/10 bg-[rgba(8,8,16,0.98)] shadow-[0_-8px_64px_rgba(0,0,0,0.7)] sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {step === 3 ? "Request Sent" : "Book an Experience"}
            </h2>
            <p className="text-xs text-muted/60">
              with {companionName}
            </p>
          </div>
          <button onClick={onClose} className="text-muted/40 hover:text-muted">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicators */}
        {step !== 3 && (
          <div className="flex border-b border-white/10 px-6 py-3">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] transition-colors ${step >= s ? "bg-gold text-black" : "border border-[rgba(255,255,255,0.1)] text-muted/40"}`}>
                  {step > s ? <Icon name="check" className="h-3 w-3" /> : s}
                </div>
                <span className={`ml-2 text-xs ${step >= s ? "text-foreground/70" : "text-muted/40"}`}>
                  {s === 1 ? "Date & Time" : "Review & Pay"}
                </span>
                {s < 2 && <div className={`mx-4 h-px w-8 ${step > s ? "bg-gold/30" : "bg-[rgba(255,255,255,0.07)]"}`} />}
              </div>
            ))}
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-5 p-6">
            {post ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-light text-foreground">
                  {post.title}
                </p>
                <p className="mt-1 text-xs text-muted/60">
                  {new Date(post.date_from).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  {" · "}
                  {post.location_city}
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="auth-input w-full"

                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50">
                    Duration
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DURATIONS.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setDuration(h)}
                        className={[
                          "rounded-xl border px-4 py-2 text-sm transition-colors",
                          duration === h
                            ? "border-white/20 bg-white/[0.07] text-gold"
                            : "border-[rgba(255,255,255,0.07)] text-muted hover:border-white/10",
                        ].join(" ")}

                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50">
                Preferred venue / location
              </label>
              <input
                type="text"
                placeholder="e.g. Nobu, London or Central Paris"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="auth-input w-full"

              />
            </div>

            <button
              onClick={() => { if (!post && !date) return; setStep(2); }}
              disabled={!post && !date}
              className="btn-gold w-full rounded-xl py-3 text-sm disabled:opacity-40"

            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <form action={formAction} className="space-y-5 p-6">
            <input type="hidden" name="companion_id" value={companionId} />
            <input type="hidden" name="scheduled_at" value={post?.date_from ?? date} />
            <input type="hidden" name="duration_hours" value={post ? "3" : String(duration)} />
            <input type="hidden" name="booking_type" value={bookingType} />
            <input type="hidden" name="location" value={location} />
            <input type="hidden" name="total_amount" value={String(totalAmount)} />
            <input type="hidden" name="availability_post_id" value={post?.id ?? ""} />

            {/* Summary */}
            <div className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted/60">Experience</span>
                <span className="text-foreground/80">{post ? post.title : `${duration}h booking`}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted/60">Date</span>
                <span className="text-foreground/80">
                  {new Date(post?.date_from ?? date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
              {location && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted/60">Venue</span>
                  <span className="text-foreground/80">{location}</span>
                </div>
              )}
              <div className="gold-divider" />
              <div className="flex justify-between">
                <span className="text-sm text-muted/60">Total</span>
                <span className="text-base font-semibold text-gold">
                  ${totalAmount.toLocaleString()}
                </span>
              </div>
              <p className="text-[10px] text-muted/40">15% deposit captured now · balance due on confirmation</p>
            </div>

            {/* Message */}
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50">
                Message to host <span className="normal-case">(optional)</span>
              </label>
              <textarea
                name="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tell them about the occasion or any special requests…"
                className="auth-input w-full resize-none"

              />
            </div>

            {(state?.error || stripeError) && (
              <p className="text-xs text-red-400">
                {state?.error ?? stripeError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-ghost flex items-center gap-2 rounded-xl px-4 py-3 text-sm"

              >
                <Icon name="chevron-left" className="h-4 w-4" />
                Back
              </button>
              <button
                type="submit"
                disabled={isPending || stripePending}
                className="btn-gold flex-1 rounded-xl py-3 text-sm disabled:opacity-60"

              >
                {stripePending
                  ? "Redirecting to payment…"
                  : isPending
                    ? "Creating booking…"
                    : stripeConfigured
                      ? "Continue to Deposit"
                      : "Send Booking Request"}
              </button>
            </div>
          </form>
        )}

        {/* Step 3 — success */}
        {step === 3 && (
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/[0.04]">
              <Icon name="send" className="h-6 w-6 text-gold" />
            </div>
            <p className="text-base font-semibold text-foreground">
              Request sent to {companionName}
            </p>
            <p className="text-sm text-muted/60">
              You will be notified once they respond, usually within 24 hours.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
