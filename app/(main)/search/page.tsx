import type { Metadata } from "next";
import { SearchClient } from "@/components/search/search-client";

export const metadata: Metadata = {
  title: "Search — EliteSeek",
  description: "Search for hosts and clients on EliteSeek.",
};

export default function SearchPage() {
  return <SearchClient />;
}
