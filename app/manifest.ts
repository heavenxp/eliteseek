import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EliteSeek",
    short_name: "EliteSeek",
    description:
      "A premium Elite Host and social experience marketplace. Book exclusive experiences, subscribe to exclusive content, and send luxury gifts.",
    start_url: "/browse",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#f2f8ff",
    background_color: "#f2f8ff",
    categories: ["lifestyle", "social", "entertainment"],
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [],
    shortcuts: [
      {
        name: "Browse Hosts",
        short_name: "Browse",
        description: "Discover Elite Hosts",
        url: "/browse",
        icons: [{ src: "/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "My Bookings",
        short_name: "Bookings",
        description: "View your bookings",
        url: "/bookings",
        icons: [{ src: "/icon-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
