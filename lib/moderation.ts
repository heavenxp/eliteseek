// ── Hive moderation pipeline (Phase 2) ─────────────────────────
// Server-side only: HIVE_API_KEY must never reach the client bundle.
// Thresholds per BRIEF.md: score > 0.9 → rejected, 0.7–0.9 → flagged for
// manual review, below → approved. When HIVE_API_KEY is not configured
// (deferred ops item), scans no-op as "unscanned" and content keeps the
// pre-pipeline auto-approve behavior — every decision is still written to
// moderation_log so the audit trail starts now.

const HIVE_SYNC_URL = "https://api.thehive.ai/api/v2/task/sync";

export type ModerationVerdict = {
  status: "approved" | "flagged" | "rejected" | "unscanned";
  score: number | null;
  raw: unknown;
};

export function hiveConfigured(): boolean {
  return !!process.env.HIVE_API_KEY;
}

// Write one row to the admin-only moderation_log (service role bypasses RLS).
export async function recordModeration(opts: {
  subjectUserId: string;
  contentId?: string | null;
  contentType: "content_post" | "feed_post" | "story" | "message" | "profile_photo";
  verdict: ModerationVerdict;
}): Promise<void> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  await createAdminClient().from("moderation_log").insert({
    subject_id: opts.subjectUserId,
    content_id: opts.contentId ?? null,
    content_type: opts.contentType,
    action: opts.verdict.status,
    reason: opts.verdict.status === "unscanned" ? "hive not configured" : null,
    moderation_score: opts.verdict.score,
    hive_response: opts.verdict.raw ?? null,
  });
}

// Class names Hive uses for sexual content across its visual + text models.
// We take the max score over any of these.
const EXPLICIT_CLASS_PATTERN =
  /sexual|nsfw|nudity|explicit|suggestive|solicitation|adult/i;
const SAFE_CLASS_PATTERN = /^(no_|not_|general_not|safe)/i;

function extractMaxScore(raw: unknown): number | null {
  // Hive sync response: { status: [ { response: { output: [ { classes: [ {class, score} ] } ] } } ] }
  try {
    const statuses = (raw as { status?: unknown[] })?.status ?? [];
    let max: number | null = null;
    for (const s of statuses as Array<{ response?: { output?: Array<{ classes?: Array<{ class: string; score: number }> }> } }>) {
      for (const out of s.response?.output ?? []) {
        for (const c of out.classes ?? []) {
          if (EXPLICIT_CLASS_PATTERN.test(c.class) && !SAFE_CLASS_PATTERN.test(c.class)) {
            if (max === null || c.score > max) max = c.score;
          }
        }
      }
    }
    return max;
  } catch {
    return null;
  }
}

function verdictFromScore(score: number | null, raw: unknown): ModerationVerdict {
  if (score === null) return { status: "approved", score: null, raw };
  if (score > 0.9) return { status: "rejected", score, raw };
  if (score >= 0.7) return { status: "flagged", score, raw };
  return { status: "approved", score, raw };
}

async function hiveSync(body: Record<string, string>): Promise<ModerationVerdict> {
  const key = process.env.HIVE_API_KEY;
  if (!key) return { status: "unscanned", score: null, raw: null };

  try {
    const res = await fetch(HIVE_SYNC_URL, {
      method: "POST",
      headers: {
        authorization: `token ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      // Moderation must not hang publishes indefinitely
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      // Fail safe for a trust-first platform: an errored scan goes to
      // manual review rather than silently publishing.
      return { status: "flagged", score: null, raw: { error: `hive ${res.status}` } };
    }
    const json = await res.json();
    return verdictFromScore(extractMaxScore(json), json);
  } catch (e) {
    return {
      status: "flagged",
      score: null,
      raw: { error: e instanceof Error ? e.message : "hive request failed" },
    };
  }
}

export async function scanMediaUrl(url: string): Promise<ModerationVerdict> {
  return hiveSync({ url });
}

export async function scanText(text: string): Promise<ModerationVerdict> {
  if (!text.trim()) return { status: "approved", score: null, raw: null };
  return hiveSync({ text_data: text });
}

// Scan several media URLs plus optional text; the worst verdict wins.
export async function scanContent(
  mediaUrls: string[],
  text?: string | null
): Promise<ModerationVerdict> {
  if (!hiveConfigured()) return { status: "unscanned", score: null, raw: null };

  const verdicts = await Promise.all([
    ...mediaUrls.map((u) => scanMediaUrl(u)),
    ...(text ? [scanText(text)] : []),
  ]);
  if (verdicts.length === 0) return { status: "approved", score: null, raw: null };

  const rank = { rejected: 3, flagged: 2, unscanned: 1, approved: 0 } as const;
  return verdicts.reduce((worst, v) => (rank[v.status] > rank[worst.status] ? v : worst));
}
