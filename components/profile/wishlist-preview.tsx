import type { WishlistItem } from "@/lib/database.types";

export function WishlistPreview({
  items,
  companionId,
}: {
  items: WishlistItem[];
  companionId: string;
}) {
  if (items.length === 0) {
    return (
      <p
        className="py-4 text-sm text-muted/40"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        No wishlist items yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.slice(0, 4).map((item) => (
        <div
          key={item.id}
          className="flex flex-col gap-2 rounded-xl border border-[rgba(212,175,55,0.12)] bg-[rgba(255,255,255,0.02)] p-4"
        >
          <p
            className="line-clamp-2 text-sm font-light text-foreground"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {item.name}
          </p>
          <p
            className="text-lg font-light text-gold"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            ${item.price.toLocaleString()}
          </p>
          {item.category && (
            <span
              className="w-fit rounded-full bg-[rgba(212,175,55,0.07)] px-2 py-0.5 text-[10px] text-muted/60"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {item.category}
            </span>
          )}
          <form
            action={`/api/gifts/send`}
            method="post"
            className="mt-auto"
          >
            <input type="hidden" name="companion_id" value={companionId} />
            <input type="hidden" name="wishlist_item_id" value={item.id} />
            <input type="hidden" name="amount" value={String(item.price)} />
            <button
              type="submit"
              className="btn-gold w-full rounded-lg py-1.5 text-xs"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Gift this
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
