"use client";

import { useState } from "react";
import { PostCard } from "@/components/posts/post-card";
import { BookingModal } from "@/components/booking/booking-modal";
import { Icon } from "@/components/icons";
import type { AvailabilityCategory, Json } from "@/lib/database.types";

export type ExperiencePost = {
  id: string;
  companion_id: string;
  category: AvailabilityCategory;
  title: string;
  description: string | null;
  date_from: string;
  date_to: string | null;
  location_city: string;
  venue_type: string | null;
  price: number;
  max_guests: number;
  photos: Json;
  visibility: "public" | "locked" | "elite_only";
  is_booked: boolean;
  created_at: string;
  updated_at: string;
  companion: {
    id: string;
    display_name: string;
    verification_tier: string;
    average_rating: number | null;
    username: string | null;
  };
};

const CATEGORY_TABS: { value: AvailabilityCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "dinner", label: "Dinner" },
  { value: "lunch", label: "Lunch" },
  { value: "private_dining", label: "Private Dining" },
  { value: "business_coaching", label: "Business Coaching" },
  { value: "social_coaching", label: "Social Coaching" },
  { value: "travel_companion", label: "Travel" },
  { value: "event_plus_one", label: "Events" },
  { value: "yacht_luxury", label: "Yacht" },
  { value: "gallery_art", label: "Gallery" },
  { value: "weekend_getaway", label: "Getaway" },
];

type Props = {
  posts: ExperiencePost[];
  isAuthenticated: boolean;
};

export function ExperiencesClient({ posts, isAuthenticated }: Props) {
  const [activeCategory, setActiveCategory] = useState<AvailabilityCategory | "all">("all");
  const [selectedPost, setSelectedPost] = useState<ExperiencePost | null>(null);

  const filtered = activeCategory === "all"
    ? posts
    : posts.filter((p) => p.category === activeCategory);

  return (
    <>
      {/* Category tabs */}
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex gap-2 pb-1">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveCategory(tab.value)}
              className={[
                "shrink-0 rounded-full border px-4 py-1.5 text-xs transition-all",
                activeCategory === tab.value
                  ? "border-white/20 bg-white/[0.07] text-gold"
                  : "border-[rgba(255,255,255,0.07)] text-muted/60 hover:border-white/10 hover:text-muted",
              ].join(" ")}
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
            <Icon name="calendar" className="h-6 w-6 text-muted/40" />
          </div>
          <p className="text-lg font-light text-foreground/60" style={{ fontFamily: "var(--font-cormorant)" }}>
            No experiences available
          </p>
          <p className="text-sm text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
            Check back soon — hosts post new availability regularly.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post) => (
            <div key={post.id}>
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.07] text-xs font-medium text-gold" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  {post.companion.display_name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm text-foreground/80" style={{ fontFamily: "var(--font-dm-sans)" }}>
                    {post.companion.display_name}
                  </p>
                  {post.companion.verification_tier === "select" && (
                    <span className="text-[10px] text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                      Select host
                    </span>
                  )}
                </div>
              </div>
              <PostCard
                post={post}
                onBook={isAuthenticated ? () => setSelectedPost(post) : undefined}
              />
            </div>
          ))}
        </div>
      )}

      {/* Booking modal */}
      {selectedPost && (
        <BookingModal
          companionId={selectedPost.companion_id}
          companionName={selectedPost.companion.display_name}
          post={selectedPost}
          hourlyRate={null}
          onClose={() => setSelectedPost(null)}
          onSuccess={() => setSelectedPost(null)}
        />
      )}

      {/* Unauthenticated CTA */}
      {!isAuthenticated && posts.length > 0 && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
          <p className="text-base font-light text-foreground/80" style={{ fontFamily: "var(--font-cormorant)" }}>
            Sign in to book experiences
          </p>
          <p className="mt-1 text-sm text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
            Create a free account to send booking requests to hosts.
          </p>
          <a
            href="/login"
            className="btn-gold mt-4 inline-block rounded-xl px-6 py-2.5 text-sm"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Sign in or join free
          </a>
        </div>
      )}
    </>
  );
}
