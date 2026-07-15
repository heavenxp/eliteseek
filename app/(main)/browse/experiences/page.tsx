import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ExperiencesClient } from "@/components/browse/experiences-client";
import type { ExperiencePost } from "@/components/browse/experiences-client";

export const metadata = { title: "Experiences — EliteSeek" };

export default async function ExperiencesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: posts } = await supabase
    .from("availability_posts")
    .select(`
      *,
      companion:host_profiles!companion_id!inner (
        id,
        display_name,
        verification_tier,
        average_rating,
        username
      )
    `)
    // Phase 2: unverified hosts are never visible to clients
    .in("companion.verification_tier", ["verified", "select"])
    .eq("visibility", "public")
    .eq("is_booked", false)
    .gt("date_from", new Date(Date.now() - 3600 * 1000).toISOString())
    .order("date_from", { ascending: true })
    .limit(60);

  const experiences = (posts ?? []) as ExperiencePost[];

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-4xl font-light text-foreground md:text-5xl"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Experiences
          </h1>
          <p className="mt-2 text-sm text-muted/60" style={{ fontFamily: "var(--font-dm-sans)" }}>
            Curated availability from EliteSeek&apos;s most exceptional hosts
          </p>
        </div>

        <div className="gold-divider mb-8" />

        <Suspense>
          <ExperiencesClient posts={experiences} isAuthenticated={!!user} />
        </Suspense>
      </div>
    </div>
  );
}
