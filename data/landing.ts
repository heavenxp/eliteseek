export const navLinks = [
  { label: "Feed", href: "/feed" },
  { label: "Browse", href: "/browse" },
  { label: "Experiences", href: "/browse?type=experience" },
  { label: "Profile", href: "/account" },
  { label: "How It Works", href: "#how-it-works" },
];

export const heroStats = [
  { value: "500+", label: "Verified Elite Hosts" },
  { value: "4.9★", label: "Average Rating" },
  { value: "100%", label: "Discreet & Private" },
];

export const platforms = [
  {
    icon: "calendar",
    title: "Book Experiences",
    description:
      "Reserve Elite Hosts for private dinners, galas, travel, and social events. Every experience is bespoke and professionally arranged.",
    cta: "Browse Experiences",
    accent: true,
  },
  {
    icon: "lock",
    title: "Exclusive Content",
    description:
      "Subscribe to Elite Hosts you admire and unlock premium content at your own pace. PPV access, behind-the-scenes, and more.",
    cta: "Explore Content",
    accent: false,
  },
  {
    icon: "gift",
    title: "Send Luxury Gifts",
    description:
      "Browse curated wishlists and send meaningful gifts — physical or virtual — to Elite Hosts who capture your attention.",
    cta: "View Wishlists",
    accent: false,
  },
];

export const featuredCompanions = [
  {
    name: "Isabelle M.",
    location: "Monaco",
    age: 26,
    tags: ["Dinners", "Travel", "Art"],
    rating: 5.0,
    reviews: 48,
    tier: "select",
    blurb: "Art curator by day. The most captivating dinner Elite Host you'll ever meet.",
  },
  {
    name: "Camille R.",
    location: "Paris",
    age: 24,
    tags: ["Events", "Fashion", "Travel"],
    rating: 4.9,
    reviews: 63,
    tier: "verified",
    blurb: "Former runway model. Fluent in five languages and effortlessly elegant.",
  },
  {
    name: "Valentina S.",
    location: "Milan",
    age: 28,
    tags: ["Galas", "Opera", "Travel"],
    rating: 5.0,
    reviews: 31,
    tier: "select",
    blurb: "Classical pianist and socialite. She turns every room into a stage.",
  },
  {
    name: "Aria K.",
    location: "Dubai",
    age: 25,
    tags: ["Yachts", "Dinners", "Events"],
    rating: 4.8,
    reviews: 57,
    tier: "verified",
    blurb: "Luxury lifestyle curator with an eye for the extraordinary.",
  },
];

export const membershipTiers = [
  {
    name: "Bronze",
    price: "Free",
    period: "",
    description: "Begin your journey",
    features: [
      "Browse public Elite Host profiles",
      "View public content feeds",
      "Send gift requests",
      "Basic search & filters",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Silver",
    price: "$49",
    period: "/month",
    description: "Priority access",
    features: [
      "Everything in Bronze",
      "Priority booking requests",
      "Request locked profile access",
      "Early content notifications",
      "Dedicated support",
    ],
    cta: "Go Silver",
    highlighted: false,
  },
  {
    name: "Elite",
    price: "$199",
    period: "/month",
    description: "The inner circle",
    features: [
      "Everything in Silver",
      "Access Elite Only profiles",
      "Personal concierge service",
      "First access to new Elite Hosts",
      "Private events & introductions",
      "Exclusive Elite Lounge",
    ],
    cta: "Join Elite",
    highlighted: true,
  },
];

export const trustFeatures = [
  {
    icon: "shield",
    title: "ID-Verified Elite Hosts",
    description:
      "Every Elite Host passes KYC verification via Stripe Identity before going live on the platform.",
  },
  {
    icon: "eye",
    title: "AI Content Moderation",
    description:
      "All content is scanned by Hive Moderation AI before publishing. Strict clean-content policy enforced.",
  },
  {
    icon: "lock-closed",
    title: "Complete Discretion",
    description:
      "Your activity, bookings, and messages are fully private. Bank-grade encryption across all data.",
  },
  {
    icon: "star",
    title: "Curated Quality",
    description:
      "EliteSeek Select Elite Hosts are handpicked by our team for exceptional quality and professionalism.",
  },
];
