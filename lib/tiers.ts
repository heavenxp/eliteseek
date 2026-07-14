export type HostTier = "pearl" | "rose" | "ruby" | "sapphire" | "diamond";
export type ClientTier = "bronze" | "silver" | "gold" | "platinum";

export const HOST_TIERS: {
  key: HostTier;
  label: string;
  subtitle: string;
  color: string;
  minRating: number;
}[] = [
  { key: "pearl",    label: "Pearl",    subtitle: "New",         color: "#d0c8bc", minRating: 0   },
  { key: "rose",     label: "Rose",     subtitle: "Charming",    color: "#e090a0", minRating: 3.0 },
  { key: "ruby",     label: "Ruby",     subtitle: "Desired",     color: "#e01848", minRating: 3.7 },
  { key: "sapphire", label: "Sapphire", subtitle: "Sought After",color: "#1a8fff", minRating: 4.3 },
  { key: "diamond",  label: "Diamond",  subtitle: "Elite",       color: "#a8e8ff", minRating: 4.8 },
];

export const CLIENT_TIERS: {
  key: ClientTier;
  label: string;
  color: string;
  minSpend: number;
  perks: string[];
}[] = [
  {
    key: "bronze",
    label: "Bronze",
    color: "#cd7f32",
    minSpend: 0,
    perks: [
      "Follow Elite Hosts",
      "Post on the feed",
      "Basic browse & discovery",
    ],
  },
  {
    key: "silver",
    label: "Silver",
    color: "#c0c0c0",
    minSpend: 100,
    perks: [
      "Everything in Bronze",
      "Leave reviews & comments",
      "Request profile access",
    ],
  },
  {
    key: "gold",
    label: "Gold",
    color: "#d4af37",
    minSpend: 500,
    perks: [
      "Everything in Silver",
      "Access Gold-tier feed content",
      "Priority in booking queue",
    ],
  },
  {
    key: "platinum",
    label: "Platinum",
    color: "#e8e0f0",
    minSpend: 2000,
    perks: [
      "Everything in Gold",
      "Direct message Elite Hosts",
      "Early access to availability posts",
      "Unlock all content tiers",
    ],
  },
];

export function getHostTier(key: string): (typeof HOST_TIERS)[0] {
  return HOST_TIERS.find((t) => t.key === key) ?? HOST_TIERS[0];
}

export function getClientTier(key: string): (typeof CLIENT_TIERS)[0] {
  return CLIENT_TIERS.find((t) => t.key === key) ?? CLIENT_TIERS[0];
}

export function nextHostTier(key: HostTier): (typeof HOST_TIERS)[0] | null {
  const idx = HOST_TIERS.findIndex((t) => t.key === key);
  return idx < HOST_TIERS.length - 1 ? HOST_TIERS[idx + 1] : null;
}

export function nextClientTier(key: ClientTier): (typeof CLIENT_TIERS)[0] | null {
  const idx = CLIENT_TIERS.findIndex((t) => t.key === key);
  return idx < CLIENT_TIERS.length - 1 ? CLIENT_TIERS[idx + 1] : null;
}

const CLIENT_TIER_ORDER: ClientTier[] = ["bronze", "silver", "gold", "platinum"];

export function clientTierAtLeast(viewer: string, required: string): boolean {
  const vi = CLIENT_TIER_ORDER.indexOf(viewer as ClientTier);
  const ri = CLIENT_TIER_ORDER.indexOf(required as ClientTier);
  return vi >= ri;
}
