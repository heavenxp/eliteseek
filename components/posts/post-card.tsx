import { Icon } from "@/components/icons";
import type { AvailabilityPost, AvailabilityCategory, CompanionCard } from "@/lib/database.types";

const CATEGORY_LABELS: Record<AvailabilityCategory, string> = {
  lunch: "Lunch",
  dinner: "Dinner",
  private_dining: "Private Dining",
  business_coaching: "Business Coaching",
  social_coaching: "Social Coaching",
  travel_companion: "Travel Experience",
  event_plus_one: "Event Plus-One",
  yacht_luxury: "Yacht / Luxury Event",
  gallery_art: "Gallery & Art Event",
  weekend_getaway: "Weekend Getaway",
};

const CATEGORY_COLORS: Record<AvailabilityCategory, string> = {
  lunch: "text-amber-400/80",
  dinner: "text-gold/80",
  private_dining: "text-gold",
  business_coaching: "text-sky-400/80",
  social_coaching: "text-violet-400/80",
  travel_companion: "text-emerald-400/80",
  event_plus_one: "text-rose-400/80",
  yacht_luxury: "text-cyan-400/80",
  gallery_art: "text-purple-400/80",
  weekend_getaway: "text-teal-400/80",
};

type PostCardProps = {
  post: AvailabilityPost;
  companion?: Pick<CompanionCard, "display_name" | "verification_tier" | "location">;
  onBook?: () => void;
};

export function PostCard({ post, companion, onBook }: PostCardProps) {
  const dateFrom = new Date(post.date_from);
  const dateTo = post.date_to ? new Date(post.date_to) : null;

  const dateLabel = dateTo
    ? `${dateFrom.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${dateTo.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
    : dateFrom.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const timeLabel = dateFrom.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="group overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.12)] bg-[rgba(255,255,255,0.02)] transition-all duration-300 hover:border-[rgba(212,175,55,0.25)] hover:shadow-[0_8px_32px_rgba(212,175,55,0.06)]">
      {/* Category ribbon */}
      <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.08)] px-4 py-2.5">
        <span className={`text-[10px] font-medium uppercase tracking-[0.12em] ${CATEGORY_COLORS[post.category]}`} style={{ fontFamily: "var(--font-dm-sans)" }}>
          {CATEGORY_LABELS[post.category]}
        </span>
        {post.visibility === "locked" && (
          <span className="flex items-center gap-1 text-[10px] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
            <Icon name="lock" className="h-3 w-3" />
            Subscribers only
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Title */}
        <h3
          className="text-lg font-light leading-snug text-foreground"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          {post.title}
        </h3>

        {/* Meta row */}
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5 text-xs text-muted/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
            <Icon name="calendar" className="h-3.5 w-3.5 text-gold/50" />
            {dateLabel}
          </span>
          {!dateTo && (
            <span className="flex items-center gap-1.5 text-xs text-muted/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
              <Icon name="clock" className="h-3.5 w-3.5 text-gold/50" />
              {timeLabel}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs text-muted/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
            <Icon name="map-pin" className="h-3.5 w-3.5 text-gold/50" />
            {post.location_city}{post.venue_type ? ` · ${post.venue_type}` : ""}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
            <Icon name="users" className="h-3.5 w-3.5 text-gold/50" />
            Up to {post.max_guests} {post.max_guests === 1 ? "guest" : "guests"}
          </span>
        </div>

        {/* Description */}
        {post.description && (
          <p className="mt-3 line-clamp-2 text-xs text-muted/60" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {post.description}
          </p>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            <span className="text-xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
              ${post.price.toLocaleString()}
            </span>
            <span className="ml-1 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>per person</span>
          </div>

          {onBook ? (
            <button
              onClick={onBook}
              className="btn-gold rounded-xl px-4 py-2 text-sm"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Book Now
            </button>
          ) : companion ? (
            <div className="text-right">
              <p className="text-sm text-muted/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {companion.display_name}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
