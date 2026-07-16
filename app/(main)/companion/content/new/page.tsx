import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icons";
import { ContentStudioForm } from "@/components/content/content-studio-form";

export default async function NewContentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "companion") redirect("/browse");

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/companion/content"
            className="flex items-center gap-1.5 text-sm text-muted/60 hover:text-muted"

          >
            <Icon name="chevron-left" className="h-4 w-4" />
            Content Studio
          </Link>
        </div>

        <div className="mb-8">
          <h1
            className="text-xl font-bold tracking-tight text-foreground"
           
          >
            New Post
          </h1>
          <p
            className="mt-1 text-sm text-muted/50"

          >
            Upload photos or videos, set access options, and publish to your subscribers.
          </p>
        </div>

        <ContentStudioForm />
      </div>
    </div>
  );
}
