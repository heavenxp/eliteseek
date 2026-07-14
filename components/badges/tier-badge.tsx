import { getHostTier, getClientTier } from "@/lib/tiers";

type Props =
  | { type: "host"; tier: string }
  | { type: "client"; tier: string };

export function TierBadge({ type, tier }: Props) {
  const def = type === "host" ? getHostTier(tier) : getClientTier(tier);

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
      style={{
        color: def.color,
        borderColor: `${def.color}40`,
        background: `${def.color}12`,
        fontFamily: "var(--font-dm-sans)",
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: def.color }}
      />
      {def.label}
    </span>
  );
}
