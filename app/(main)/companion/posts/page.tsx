import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icons";
import { DeletePostButton } from "./delete-post-button";
import type { AvailabilityPost, AvailabilityCategory } from "@/lib/database.types";

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

export default async function CompanionPostsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: companion } = await supabase
    .from("companion_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!companion) redirect("/browse");

  const { data: posts } = await supabase
    .from("availability_posts")
    .select("*")
    .eq("companion_id", companion.id)
    .order("date_from", { ascending: true });

  const upcoming = (posts ?? []).filter((p) => new Date(p.date_from) > new Date());
  const past = (posts ?? []).filter((p) => new Date(p.date_from) <= new Date());

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
            My Posts
          </h1>
          <p className="mt-1 text-sm text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {upcoming.length} upcoming · {past.length} past
          </p>
        </div>
        <Link
          href="/companion/posts/new"
          className="btn-gold flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          <Icon name="plus" className="h-4 w-4" />
          New Post
        </Link>
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <p className="mb-3 text-xs uppercase tracking-[0.1em] text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Upcoming
              </p>
              <div className="space-y-3">
                {upcoming.map((post) => (
                  <PostRow key={post.id} post={post as AvailabilityPost} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <p className="mb-3 text-xs uppercase tracking-[0.1em] text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Past
              </p>
              <div className="space-y-3 opacity-60">
                {past.map((post) => (
                  <PostRow key={post.id} post={post as AvailabilityPost} isPast />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function PostRow({ post, isPast = false }: { post: AvailabilityPost; isPast?: boolean }) {
  const date = new Date(post.date_from);
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm text-foreground/90" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {post.title}
          </p>
          {post.is_booked && (
            <span className="shrink-0 rounded-full bg-[rgba(52,211,153,0.1)] px-2 py-0.5 text-[10px] text-emerald-400">Booked</span>
          )}
          {post.visibility === "locked" && (
            <span className="shrink-0 rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-gold/70">Subs only</span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          <span>{CATEGORY_LABELS[post.category]}</span>
          <span>·</span>
          <span>{date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
          <span>·</span>
          <span>{post.location_city}</span>
          <span>·</span>
          <span>${post.price.toLocaleString()}</span>
        </div>
      </div>
      {!isPast && (
        <DeletePostButton postId={post.id} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
        <Icon name="calendar" className="h-6 w-6 text-muted/40" />
      </div>
      <p className="text-xl font-light text-foreground/60" style={{ fontFamily: "var(--font-cormorant)" }}>
        No availability posts yet
      </p>
      <p className="text-sm text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
        Share when you are available and let clients book experiences with you.
      </p>
      <Link
        href="/companion/posts/new"
        className="btn-gold mt-2 rounded-xl px-6 py-2.5 text-sm"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        Create your first post
      </Link>
    </div>
  );
}
