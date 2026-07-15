"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { sendGift } from "@/app/actions/gifts";
import type { WishlistItemWithCompanion } from "./page";

type SentGift = {
  id: string;
  amount: number;
  message: string | null;
  status: string;
  created_at: string;
  virtual_gift_name: string | null;
  recipient: { display_name: string | null; username: string | null } | null;
};

type Props = {
  currentUserId: string;
  wishlistItems: WishlistItemWithCompanion[];
  sentGifts: SentGift[];
  companionFilter: string | null;
};

export function GiftsClient({ currentUserId, wishlistItems, sentGifts, companionFilter }: Props) {
  const [tab, setTab] = useState<"wishlist" | "custom" | "history">("wishlist");
  const [selectedItem, setSelectedItem] = useState<WishlistItemWithCompanion | null>(null);
  const [customCompanionId, setCustomCompanionId] = useState(companionFilter ?? "");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleSendWishlistGift(item: WishlistItemWithCompanion) {
    setSelectedItem(item);
    setAmount(String(item.price));
    setTab("custom");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    const companionId = selectedItem?.companion_id ?? customCompanionId;
    if (!companionId || !amount) return;

    startTransition(async () => {
      const result = await sendGift({
        recipientId: companionId,
        amount: parseFloat(amount),
        message: message || null,
        wishlistItemId: selectedItem?.id ?? null,
        virtualGiftName: selectedItem?.name ?? null,
      });
      if (result.error) {
        setErrorMsg(result.error);
      } else {
        setSuccessMsg(
          `Gift of $${amount} sent${selectedItem ? ` — "${selectedItem.name}"` : ""}!`
        );
        setAmount("");
        setMessage("");
        setSelectedItem(null);
        setTab("history");
      }
    });
  }

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <h1
            className="text-4xl font-light text-foreground"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Send a Gift
          </h1>
          <p
            className="mt-1 text-sm text-muted/50"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Delight an Elite Host with something from their wishlist or a custom gift.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-1">
          {(["wishlist", "custom", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm transition-colors ${
                tab === t
                  ? "bg-white/[0.07] text-gold"
                  : "text-muted/50 hover:text-muted/80"
              }`}
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {t === "wishlist" ? "Wishlists" : t === "custom" ? "Custom Gift" : "Sent"}
            </button>
          ))}
        </div>

        {/* Wishlist tab */}
        {tab === "wishlist" && (
          <div>
            {wishlistItems.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center">
                <Icon name="star" className="mx-auto mb-3 h-8 w-8 text-muted/40" />
                <p
                  className="text-sm text-muted/40"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  No wishlist items available.
                </p>
                <Link
                  href="/browse"
                  className="btn-gold mt-4 inline-block rounded-xl px-5 py-2.5 text-sm"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Browse Elite Hosts
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {wishlistItems.map((item) => (
                  <WishlistCard
                    key={item.id}
                    item={item}
                    onSend={handleSendWishlistGift}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Custom gift tab */}
        {tab === "custom" && (
          <div className="glass-card rounded-2xl p-6">
            {selectedItem && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <Icon name="star" className="mt-0.5 h-4 w-4 shrink-0 text-muted/40" />
                <div>
                  <p
                    className="text-sm text-foreground"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {selectedItem.name}
                  </p>
                  <p
                    className="text-xs text-muted/40"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    From {selectedItem.companion?.display_name ?? "wishlist"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="ml-auto text-muted/30 hover:text-muted/60"
                >
                  ×
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!selectedItem && (
                <div>
                  <label
                    className="mb-1.5 block text-xs text-muted/50"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Recipient (Companion ID)
                  </label>
                  <input
                    type="text"
                    value={customCompanionId}
                    onChange={(e) => setCustomCompanionId(e.target.value)}
                    placeholder="companion_id"
                    className="auth-input w-full"
                    required
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  />
                </div>
              )}

              <div>
                <label
                  className="mb-1.5 block text-xs text-muted/50"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted/40">
                    $
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="50"
                    className="auth-input w-full pl-7"
                    required
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  />
                </div>
              </div>

              <div>
                <label
                  className="mb-1.5 block text-xs text-muted/50"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a personal note…"
                  rows={3}
                  className="auth-input w-full resize-none"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                />
              </div>

              {errorMsg && (
                <p
                  className="text-sm text-red-400"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="btn-gold w-full rounded-xl px-5 py-2.5 text-sm disabled:opacity-50"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {isPending ? "Sending…" : "Send Gift"}
              </button>
            </form>
          </div>
        )}

        {/* History tab */}
        {tab === "history" && (
          <div>
            {successMsg && (
              <div className="mb-4 rounded-xl border border-white/20 bg-white/[0.04] px-4 py-3">
                <p
                  className="text-sm text-gold"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  {successMsg}
                </p>
              </div>
            )}
            {sentGifts.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center">
                <Icon name="star" className="mx-auto mb-3 h-8 w-8 text-muted/40" />
                <p
                  className="text-sm text-muted/40"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  You haven&apos;t sent any gifts yet.
                </p>
              </div>
            ) : (
              <div className="glass-card overflow-hidden rounded-2xl">
                <ul className="divide-y divide-[rgba(212,175,55,0.08)]">
                  {sentGifts.map((gift) => (
                    <li key={gift.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                        <Icon name="star" className="h-4 w-4 text-muted/40" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm text-foreground"
                          style={{ fontFamily: "var(--font-dm-sans)" }}
                        >
                          {gift.virtual_gift_name ?? "Custom gift"} · $
                          {gift.amount.toLocaleString()}
                        </p>
                        <p
                          className="truncate text-xs text-muted/40"
                          style={{ fontFamily: "var(--font-dm-sans)" }}
                        >
                          To {gift.recipient?.display_name ?? "Unknown"} ·{" "}
                          {new Date(gift.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${
                          gift.status === "received"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : gift.status === "sent"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-white/[0.07] text-muted/40"
                        }`}
                        style={{ fontFamily: "var(--font-dm-sans)" }}
                      >
                        {gift.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function WishlistCard({
  item,
  onSend,
}: {
  item: WishlistItemWithCompanion;
  onSend: (item: WishlistItemWithCompanion) => void;
}) {
  const companionHref = item.companion?.username
    ? `/profile/${item.companion.username}`
    : null;

  return (
    <div className="glass-card flex flex-col rounded-2xl p-5">
      {item.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image_url}
          alt={item.name}
          className="mb-4 h-40 w-full rounded-xl object-cover"
        />
      )}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="text-base font-light text-foreground"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {item.name}
          </h3>
          <span
            className="shrink-0 text-base text-gold"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            ${item.price.toLocaleString()}
          </span>
        </div>
        {item.description && (
          <p
            className="mt-1 line-clamp-2 text-xs text-muted/50"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {item.description}
          </p>
        )}
        {item.companion?.display_name && (
          <p
            className="mt-2 text-xs text-muted/40"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Wished by{" "}
            {companionHref ? (
              <Link href={companionHref} className="text-muted/40 hover:text-gold">
                {item.companion.display_name}
              </Link>
            ) : (
              item.companion.display_name
            )}
          </p>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onSend(item)}
          className="btn-gold flex-1 rounded-xl px-4 py-2 text-sm"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Send Gift
        </button>
        {item.external_url && (
          <a
            href={item.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost rounded-xl px-3 py-2"
            aria-label="View item"
          >
            <Icon name="eye" className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
