"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { after } from "next/server";
import { scanContent, recordModeration } from "@/lib/moderation";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/app/actions/notifications";

// ── Types ──────────────────────────────────────────────────────

export type EventRow = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
  location: string | null;
  visibility: "public" | "private";
  cover_image_url: string | null;
  created_at: string;
  end_time: string;
  price: number;
  capacity: number | null;
  event_type: "physical" | "online";
  member_count?: number;
};

export type EventMemberWithProfile = {
  id: string;
  event_id: string;
  user_id: string;
  role: "host" | "attendee";
  joined_at: string;
  profile: { full_name: string; avatar_url: string | null } | null;
};

export type InviteCode = {
  id: string;
  event_id: string;
  code: string;
  max_uses: number;
  uses_count: number;
  created_at: string;
};

export type EventMessage = {
  id: string;
  event_id: string;
  user_id: string;
  content: string | null;
  message_type: "text" | "voice";
  audio_url: string | null;
  media_url: string | null;
  created_at: string;
  sender: { full_name: string; avatar_url: string | null } | null;
};

// ── Helpers ────────────────────────────────────────────────────

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ── createEvent ────────────────────────────────────────────────

export async function createEvent(data: {
  title: string;
  description: string;
  date: string;
  time: string;
  end_time: string;
  location: string;
  visibility: "public" | "private";
  cover_image_url: string | null;
  event_type: "physical" | "online";
  price: number;
  capacity: number | null;
  meeting_link: string | null;
}): Promise<{ eventId?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // PIVOT: structure is forced — end time always, capacity for physical
  if (!data.end_time) return { error: "Events need an end time." };
  if (data.end_time <= data.time) return { error: "End time must be after the start time." };
  if (data.event_type === "physical" && (!data.capacity || data.capacity < 1)) {
    return { error: "Physical events need a group size cap." };
  }
  if (data.event_type === "online" && data.capacity !== null && data.capacity < 1) {
    return { error: "Capacity must be at least 1." };
  }
  if (data.price < 0) return { error: "Price can't be negative." };

  // Paid events require payout-ready host mode (Stripe Connect active)
  if (data.price > 0) {
    const { data: host } = await supabase
      .from("host_profiles")
      .select("stripe_account_status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (host?.stripe_account_status !== "active") {
      return {
        error:
          "Paid events need a payout account. Become a host and connect Stripe from Account → Settings first.",
      };
    }
  }

  // Hive scan on the event copy before it goes live
  const verdict = await scanContent(
    data.cover_image_url ? [data.cover_image_url] : [],
    [data.title, data.description].filter(Boolean).join("\n")
  );
  if (verdict.status === "rejected") {
    await recordModeration({ subjectUserId: user.id, contentType: "event", verdict });
    return { error: "This event can't be published — it doesn't meet the content guidelines." };
  }

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      creator_id: user.id,
      title: data.title.trim(),
      description: data.description.trim() || null,
      date: data.date,
      time: data.time,
      end_time: data.end_time,
      location: data.event_type === "online" ? "Online" : (data.location.trim() || null),
      visibility: data.visibility,
      cover_image_url: data.cover_image_url,
      event_type: data.event_type,
      price: +data.price.toFixed(2),
      capacity: data.event_type === "physical" ? data.capacity : data.capacity ?? null,
    })
    .select("id")
    .single();

  if (error || !event) return { error: error?.message ?? "Failed to create event" };

  // Meeting link lives in the member-gated table, never on events
  if (data.event_type === "online" && data.meeting_link?.trim()) {
    await supabase.from("event_meeting_links").insert({
      event_id: event.id,
      meeting_link: data.meeting_link.trim(),
    });
  }

  // Auto-join creator as host
  await supabase.from("event_members").insert({
    event_id: event.id,
    user_id: user.id,
    role: "host",
  });

  // Generate 10 invite codes for private events
  if (data.visibility === "private") {
    const codes = Array.from({ length: 10 }, () => ({
      event_id: event.id,
      code: generateCode(),
      max_uses: 1,
      uses_count: 0,
    }));
    await supabase.from("event_invite_codes").insert(codes);
  }

  return { eventId: event.id };
}

// ── getEvents ──────────────────────────────────────────────────

export async function getEvents(): Promise<EventRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("events")
    .select("*, event_members(count)")
    .eq("visibility", "public")
    .order("date", { ascending: true });

  return (data ?? []).map((e) => ({
    id: e.id,
    creator_id: e.creator_id,
    title: e.title,
    description: e.description,
    date: e.date,
    time: e.time,
    location: e.location,
    visibility: e.visibility as "public" | "private",
    cover_image_url: e.cover_image_url,
    created_at: e.created_at,
    end_time: e.end_time,
    price: Number(e.price ?? 0),
    capacity: e.capacity,
    event_type: (e.event_type ?? "physical") as "physical" | "online",
    member_count: (e.event_members as Array<{ count: number }>)?.[0]?.count ?? 0,
  }));
}

// ── getEvent ───────────────────────────────────────────────────

export async function getEvent(id: string): Promise<{
  event: EventRow;
  members: EventMemberWithProfile[];
  inviteCodes: InviteCode[];
  isMember: boolean;
  isCreator: boolean;
  accessDenied: boolean;
  meetingLink: string | null;
} | null> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Use admin to check existence regardless of RLS
  const { data: event } = await admin
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (!event) return null;

  const isCreator = event.creator_id === user.id;

  const { data: membershipRow } = await supabase
    .from("event_members")
    .select("id")
    .eq("event_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const isMember = !!membershipRow || isCreator;

  // Meeting link is member-gated by RLS — non-members simply get null
  const { data: linkRow } = await supabase
    .from("event_meeting_links")
    .select("meeting_link")
    .eq("event_id", id)
    .maybeSingle();
  const meetingLink = linkRow?.meeting_link ?? null;

  if (event.visibility === "private" && !isMember) {
    return {
      event: event as EventRow,
      members: [],
      inviteCodes: [],
      isMember: false,
      isCreator: false,
      accessDenied: true,
      meetingLink: null,
    };
  }

  // Fetch members
  const { data: membersRaw } = await supabase
    .from("event_members")
    .select("id, user_id, role, joined_at")
    .eq("event_id", id);

  const membersList = membersRaw ?? [];
  const userIds = membersList.map((m) => m.user_id);

  const profileMap = new Map<string, { full_name: string; avatar_url: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url as string | null });
    }
  }

  const members: EventMemberWithProfile[] = membersList.map((m) => ({
    id: m.id,
    event_id: id,
    user_id: m.user_id,
    role: m.role as "host" | "attendee",
    joined_at: m.joined_at,
    profile: profileMap.get(m.user_id) ?? null,
  }));

  // Invite codes — only for creator of private events
  let inviteCodes: InviteCode[] = [];
  if (isCreator && event.visibility === "private") {
    const { data: codes } = await supabase
      .from("event_invite_codes")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: true });
    inviteCodes = (codes ?? []) as InviteCode[];
  }

  return {
    event: event as EventRow,
    members,
    inviteCodes,
    isMember,
    isCreator,
    accessDenied: false,
    meetingLink,
  };
}

// ── joinEvent ──────────────────────────────────────────────────

export async function joinEvent(eventId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("event_members")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return {};

  // Paid events join through checkout (webhook admits after payment);
  // capacity is checked here for free events (waitlists harden this later)
  const { data: ev } = await supabase
    .from("events")
    .select("price, capacity")
    .eq("id", eventId)
    .single();
  if (!ev) return { error: "Event not found." };
  if (Number(ev.price) > 0) {
    return { error: "PAID_EVENT" };
  }
  if (ev.capacity !== null) {
    const { count } = await supabase
      .from("event_members")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId);
    if ((count ?? 0) >= ev.capacity) return { error: "This event is full." };
  }

  const { error } = await supabase.from("event_members").insert({
    event_id: eventId,
    user_id: user.id,
    role: "attendee",
  });

  if (error) return { error: error.message };

  const [eventRes, profileRes] = await Promise.all([
    supabase.from("events").select("creator_id, title").eq("id", eventId).single(),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);
  if (eventRes.data && eventRes.data.creator_id !== user.id) {
    await notify({
      userId: eventRes.data.creator_id,
      type: "event_join",
      title: `${profileRes.data?.full_name ?? "Someone"} joined your event`,
      body: eventRes.data.title,
      link: `/events/${eventId}`,
    });
  }

  return {};
}

// ── joinWithCode ───────────────────────────────────────────────

export async function joinWithCode(code: string): Promise<{ eventId?: string; error?: string }> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: invite } = await admin
    .from("event_invite_codes")
    .select("id, event_id, max_uses, uses_count")
    .eq("code", code.toUpperCase().trim())
    .single();

  if (!invite) return { error: "Invalid invite code. Please check and try again." };
  if (invite.uses_count >= invite.max_uses) return { error: "This invite code has already been used." };

  const { data: existing } = await supabase
    .from("event_members")
    .select("id")
    .eq("event_id", invite.event_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("event_members").insert({
      event_id: invite.event_id,
      user_id: user.id,
      role: "attendee",
    });
    if (error) return { error: error.message };

    await admin
      .from("event_invite_codes")
      .update({ uses_count: invite.uses_count + 1 })
      .eq("id", invite.id);

    const [eventRes, profileRes] = await Promise.all([
      admin.from("events").select("creator_id, title").eq("id", invite.event_id).single(),
      admin.from("profiles").select("full_name").eq("id", user.id).single(),
    ]);
    if (eventRes.data && eventRes.data.creator_id !== user.id) {
      await notify({
        userId: eventRes.data.creator_id,
        type: "event_join",
        title: `${profileRes.data?.full_name ?? "Someone"} joined your event`,
        body: eventRes.data.title,
        link: `/events/${invite.event_id}`,
      });
    }
  }

  return { eventId: invite.event_id };
}

// ── getMessages ────────────────────────────────────────────────

export async function getMessages(eventId: string): Promise<EventMessage[]> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: messages } = await supabase
    .from("event_messages")
    .select("id, event_id, user_id, content, message_type, audio_url, media_url, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  const list = messages ?? [];
  if (list.length === 0) return [];

  const userIds = [...new Set(list.map((m) => m.user_id))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return list.map((m) => {
    const p = profileMap.get(m.user_id);
    return {
      id: m.id,
      event_id: m.event_id,
      user_id: m.user_id,
      content: m.content,
      message_type: m.message_type as "text" | "voice",
      audio_url: m.audio_url,
      media_url: (m as { media_url?: string | null }).media_url ?? null,
      created_at: m.created_at,
      sender: p ? { full_name: p.full_name, avatar_url: p.avatar_url as string | null } : null,
    };
  });
}

// ── sendMessage ────────────────────────────────────────────────

export async function sendMessage(
  eventId: string,
  content: string | null,
  messageType: "text" | "voice",
  audioUrl?: string,
  mediaUrl?: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sent, error } = await supabase.from("event_messages").insert({
    event_id: eventId,
    user_id: user.id,
    content: content || null,
    message_type: messageType,
    audio_url: audioUrl ?? null,
    media_url: mediaUrl ?? null,
  }).select("id").single();

  if (error) return { error: error.message };

  // Phase 3: event group chat runs through the same Hive pipeline as booking
  // chat — flags go to the manual review queue, sends are never delayed.
  after(async () => {
    const verdict = await scanContent(mediaUrl ? [mediaUrl] : [], content);
    if (verdict.status === "flagged" || verdict.status === "rejected") {
      await recordModeration({
        subjectUserId: user.id,
        contentId: sent?.id,
        contentType: "message",
        verdict,
      });
    }
  });

  // Notify all other event members (admin bypasses RLS for private events)
  const adminClient = createAdminClient();
  const [membersRes, profileRes] = await Promise.all([
    adminClient.from("event_members").select("user_id").eq("event_id", eventId).neq("user_id", user.id),
    adminClient.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);
  if (membersRes.data && membersRes.data.length > 0) {
    const senderName = profileRes.data?.full_name ?? "Someone";
    const preview = messageType === "voice"
      ? "Voice message"
      : mediaUrl
      ? "📎 Media"
      : (content && content.length > 80 ? content.slice(0, 80) + "…" : content ?? "");
    await Promise.all(
      membersRes.data.map((m) =>
        notify({
          userId: m.user_id,
          type: "event_message",
          title: `${senderName} sent a message in the group`,
          body: preview,
          link: `/events/${eventId}`,
        })
      )
    );
  }

  return {};
}

// ── deleteEvent ────────────────────────────────────────────────

export async function deleteEvent(eventId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Notify all members before deletion (cascade will remove the rows)
  const [eventRes, membersRes] = await Promise.all([
    admin.from("events").select("title").eq("id", eventId).eq("creator_id", user.id).single(),
    admin.from("event_members").select("user_id").eq("event_id", eventId).neq("user_id", user.id),
  ]);
  if (eventRes.data && membersRes.data && membersRes.data.length > 0) {
    await Promise.all(
      membersRes.data.map((m) =>
        notify({
          userId: m.user_id,
          type: "event_cancelled",
          title: `Event cancelled: ${eventRes.data!.title}`,
          body: "An event you were attending has been cancelled by the organiser.",
          link: "/events",
        })
      )
    );
  }

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("creator_id", user.id);

  if (error) return { error: error.message };
  return {};
}

// ── leaveEvent ─────────────────────────────────────────────────

export async function leaveEvent(eventId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [eventRes, profileRes] = await Promise.all([
    supabase.from("events").select("creator_id, title").eq("id", eventId).single(),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);

  const { error } = await supabase
    .from("event_members")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  if (eventRes.data && eventRes.data.creator_id !== user.id) {
    await notify({
      userId: eventRes.data.creator_id,
      type: "event_leave",
      title: `${profileRes.data?.full_name ?? "Someone"} left your event`,
      body: eventRes.data.title,
      link: `/events/${eventId}`,
    });
  }

  return {};
}

// ── getUserEvents ──────────────────────────────────────────────

export async function getUserEvents(): Promise<Array<{ id: string; title: string; cover_image_url: string | null; date: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("event_members")
    .select("event_id, events(id, title, cover_image_url, date)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  return (data ?? []).flatMap((m) => {
    const e = Array.isArray(m.events) ? m.events[0] : m.events;
    if (!e) return [];
    return [{ id: (e as { id: string }).id, title: (e as { title: string }).title, cover_image_url: (e as { cover_image_url: string | null }).cover_image_url, date: (e as { date: string }).date }];
  });
}

// ── getProfile (for realtime sender lookup) ────────────────────

export async function getProfile(
  userId: string,
): Promise<{ full_name: string; avatar_url: string | null } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .single();
  if (!data) return null;
  return { full_name: data.full_name, avatar_url: data.avatar_url as string | null };
}

// ── Paid join: escrow checkout (Phase 4 pattern, 15% platform cut) ──

export async function createEventTicketCheckout(
  eventId: string
): Promise<{ error?: string }> {
  const { getStripe, getOrigin } = await import("@/lib/stripe");
  const stripe = getStripe();
  if (!stripe) return { error: "Payment not configured." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ev } = await supabase
    .from("events")
    .select("id, title, price, capacity, date, time")
    .eq("id", eventId)
    .single();
  if (!ev || Number(ev.price) <= 0) return { error: "Event not found." };

  const [{ data: existing }, { count: memberCount }] = await Promise.all([
    supabase
      .from("event_members")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("event_members")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId),
  ]);
  if (existing) return { error: "You've already joined this event." };
  if (ev.capacity !== null && (memberCount ?? 0) >= ev.capacity) {
    return { error: "This event is full." };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Ticket — ${ev.title}`,
            description:
              "Held securely by Stripe until 48 hours after the event ends.",
          },
          unit_amount: Math.round(Number(ev.price) * 100),
        },
        quantity: 1,
      },
    ],
    payment_intent_data: { transfer_group: `event_${eventId}` },
    success_url: `${getOrigin()}/events/${eventId}?joined=1`,
    cancel_url: `${getOrigin()}/events/${eventId}`,
    metadata: {
      type: "event_ticket",
      user_id: user.id,
      event_id: eventId,
    },
  });

  redirect(session.url!);
}

// ── Pulse feed (PIVOT §2 discovery): live-feeling upcoming events ──

export type PulseEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  end_time: string;
  location: string | null;
  price: number;
  capacity: number | null;
  event_type: "physical" | "online";
  cover_image_url: string | null;
  memberCount: number;
  memberAvatars: Array<{ id: string; name: string; avatar_url: string | null }>;
  host: { name: string; avatar_url: string | null; verification_tier: string | null };
  creatorFollowed: boolean;
};

export async function getPulseFeed(): Promise<PulseEvent[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: rawEvents } = await admin
    .from("events")
    .select("id, creator_id, title, date, time, end_time, location, price, capacity, event_type, cover_image_url")
    .eq("visibility", "public")
    .gte("date", today)
    .order("date", { ascending: true })
    .order("time", { ascending: true })
    .limit(40);

  const now = new Date();
  const upcoming = (rawEvents ?? []).filter(
    (e) => new Date(`${e.date}T${e.end_time}`) > now
  );
  if (upcoming.length === 0) return [];

  const eventIds = upcoming.map((e) => e.id);
  const creatorIds = [...new Set(upcoming.map((e) => e.creator_id))];

  const [membersRes, followsRes, hostsRes] = await Promise.all([
    admin.from("event_members").select("event_id, user_id").in("event_id", eventIds),
    supabase.from("follows").select("following_id").eq("follower_id", user.id),
    admin
      .from("host_profiles")
      .select("user_id, display_name, verification_tier")
      .in("user_id", creatorIds),
  ]);

  const memberRows = membersRes.data ?? [];
  const memberIdsByEvent = new Map<string, string[]>();
  for (const m of memberRows) {
    const list = memberIdsByEvent.get(m.event_id) ?? [];
    list.push(m.user_id);
    memberIdsByEvent.set(m.event_id, list);
  }

  const profileIds = [
    ...new Set([...creatorIds, ...memberRows.map((m) => m.user_id)]),
  ];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", profileIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const hostMap = new Map((hostsRes.data ?? []).map((h) => [h.user_id, h]));
  const followed = new Set((followsRes.data ?? []).map((f) => f.following_id));

  const feed: PulseEvent[] = upcoming.map((e) => {
    const memberIds = memberIdsByEvent.get(e.id) ?? [];
    const host = hostMap.get(e.creator_id);
    const creatorProfile = profileMap.get(e.creator_id);
    return {
      id: e.id,
      title: e.title,
      date: e.date,
      time: e.time,
      end_time: e.end_time,
      location: e.location,
      price: Number(e.price ?? 0),
      capacity: e.capacity,
      event_type: (e.event_type ?? "physical") as "physical" | "online",
      cover_image_url: e.cover_image_url,
      memberCount: memberIds.length,
      memberAvatars: memberIds.slice(0, 4).map((id) => {
        const p = profileMap.get(id);
        return { id, name: p?.full_name ?? "Member", avatar_url: p?.avatar_url ?? null };
      }),
      host: {
        name: host?.display_name ?? creatorProfile?.full_name ?? "Host",
        avatar_url: creatorProfile?.avatar_url ?? null,
        verification_tier: host?.verification_tier ?? null,
      },
      creatorFollowed: followed.has(e.creator_id),
    };
  });

  // Followed hosts float up; within each band, soonest first.
  // ("Nearest" awaits real geo data — location is free text today.)
  feed.sort((a, b) => {
    if (a.creatorFollowed !== b.creatorFollowed) return a.creatorFollowed ? -1 : 1;
    return (
      new Date(`${a.date}T${a.time}`).getTime() -
      new Date(`${b.date}T${b.time}`).getTime()
    );
  });
  return feed;
}
