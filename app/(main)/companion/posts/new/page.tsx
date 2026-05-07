import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icons";
import { CreatePostForm } from "@/components/posts/create-post-form";

export default async function NewPostPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "companion") redirect("/browse");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/companion/posts"
          className="flex items-center gap-1.5 text-sm text-muted/60 hover:text-muted"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          <Icon name="chevron-left" className="h-4 w-4" />
          My Posts
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
          New Availability Post
        </h1>
        <p className="mt-1 text-sm text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Share when you are available and let clients discover and book experiences with you.
        </p>
      </div>

      <CreatePostForm />
    </div>
  );
}
