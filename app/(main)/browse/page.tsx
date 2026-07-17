import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CompanionCard } from "@/components/browse/companion-card";
import { BrowseShell } from "@/components/browse/browse-shell";
import { Pagination } from "@/components/browse/pagination";
import type { CompanionCard as CompanionCardType, MembershipTier } from "@/lib/database.types";

export const metadata: Metadata = {
  title: "Browse Hosts — EliteSeek",
  description: "Discover verified hosts — book dinners, activities, travel, and online sessions where everyone is real.",
  openGraph: {
    title: "Browse Hosts — EliteSeek",
    description: "Verified hosts for every occasion.",
    type: "website",
    url: "https://eliteseek.com/browse",
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Hosts — EliteSeek",
    description: "Verified hosts for every occasion.",
  },
};

const PAGE_SIZE = 12;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const tags = typeof sp.tags === "string" && sp.tags ? sp.tags.split(",").filter(Boolean) : [];
  const tier = typeof sp.tier === "string" ? sp.tier : "";
  const city = typeof sp.city === "string" ? sp.city.trim() : "";
  const available = sp.available === "1";
  const sort = typeof sp.sort === "string" ? sp.sort : "featured";
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Build companion cards query
  let query = supabase
    .from("companion_cards")
    .select("*", { count: "exact" })
    // Phase 2: unverified hosts are never visible to clients
    .in("verification_tier", ["verified", "select"]);

  if (q) query = query.or(`display_name.ilike.%${q}%,location.ilike.%${q}%`);
  if (tags.length > 0) query = query.overlaps("tags", tags);
  if (tier === "verified" || tier === "select") query = query.eq("verification_tier", tier);
  if (city) query = query.ilike("location", `%${city}%`);
  if (available) query = query.eq("is_available", true);

  switch (sort) {
    case "rating":
      query = query.order("average_rating", { ascending: false, nullsFirst: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "price_asc":
      query = query.order("booking_rate_hourly", { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      query = query.order("booking_rate_hourly", { ascending: false, nullsFirst: false });
      break;
    default:
      query = query
        .order("is_featured", { ascending: false })
        .order("average_rating", { ascending: false, nullsFirst: false });
  }

  query = query.range(offset, offset + PAGE_SIZE - 1);

  const [{ data, count, error }, membershipResult] = await Promise.all([
    query,
    user
      ? supabase.from("profiles").select("membership_tier").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const companions = (data as CompanionCardType[] | null) ?? [];
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const activeFilters = (tags.length > 0 ? 1 : 0) + (tier ? 1 : 0) + (available ? 1 : 0);

  const clientTier = (membershipResult.data?.membership_tier ?? "bronze") as MembershipTier;

  return (
    <Suspense>
      <BrowseShell activeFilters={activeFilters}>
        {error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-muted/60">
              Something went wrong. Please try again.
            </p>
          </div>
        ) : companions.length === 0 ? (
          <EmptyState hasFilters={activeFilters > 0 || !!q} />
        ) : (
          <>
            <ResultsMeta total={totalCount} page={page} pageSize={PAGE_SIZE} />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {companions.map((companion) => (
                <CompanionCard
                  key={companion.id}
                  companion={companion}
                  clientTier={clientTier}
                />
              ))}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} />
          </>
        )}
      </BrowseShell>
    </Suspense>
  );
}

function ResultsMeta({ total, page, pageSize }: { total: number; page: number; pageSize: number }) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <p className="mb-5 text-xs text-muted/40">
      Showing {from}–{to} of {total} host{total !== 1 ? "s" : ""}
    </p>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
        <svg className="h-6 w-6 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
      <p className="text-base font-semibold text-foreground/70">
        {hasFilters ? "No hosts match your filters" : "No hosts found"}
      </p>
      {hasFilters && (
        <p className="mt-1 text-xs text-muted/50">
          Try adjusting your search or clearing filters
        </p>
      )}
    </div>
  );
}
