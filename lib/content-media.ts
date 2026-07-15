import { createAdminClient } from "@/lib/supabase/admin";
import type { MediaItem } from "@/app/actions/content";

// content-media is a private bucket (migration 026): paywalled media is
// served exclusively through short-lived signed URLs generated here, after
// the caller has decided the viewer is entitled to see the post.

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 2; // 2h — outlives a session page view

// One batched storage call for any number of paths → path→signedUrl map.
export async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data } = await createAdminClient()
    .storage.from("content-media")
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);

  return new Map(
    (data ?? [])
      .filter((d): d is typeof d & { path: string; signedUrl: string } => !!d.signedUrl && !!d.path)
      .map((d) => [d.path, d.signedUrl])
  );
}

export function applySignedUrls(
  items: MediaItem[],
  urlByPath: Map<string, string>
): MediaItem[] {
  return items.map((i) => {
    const signed = i.storage_path ? urlByPath.get(i.storage_path) : null;
    // Legacy items without a storage_path keep their stored URL
    return signed ? { ...i, url: signed } : i;
  });
}

export async function signMediaItems(items: MediaItem[]): Promise<MediaItem[]> {
  const urlByPath = await signPaths(items.map((i) => i.storage_path));
  return applySignedUrls(items, urlByPath);
}

// For posts the viewer has NOT unlocked: keep count/type so the UI can render
// placeholders, but never ship a usable URL or path to the client.
export function stripMediaItems(items: MediaItem[]): MediaItem[] {
  return items.map((i) => ({ url: "", type: i.type, storage_path: "" }));
}

// Sign or strip per post based on an entitlement decision.
export async function gateMediaItems(
  items: MediaItem[],
  unlocked: boolean
): Promise<MediaItem[]> {
  return unlocked ? signMediaItems(items) : stripMediaItems(items);
}
